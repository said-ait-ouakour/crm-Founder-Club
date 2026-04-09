import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { unipile } from "@/lib/unipile"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("[linkedin-messages] Supabase credentials missing. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.")
}

const createServiceClient = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are not configured.")
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

const formatBytes = (bytes?: number | null) => {
  if (!bytes) return undefined
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

const normalizeBoolean = (value: boolean | number | null | undefined) => {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value === 1
  return false
}

const authenticateUser = async (request: Request) => {
  const supabase = createServiceClient()
  const authHeader = request.headers.get("authorization")
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { user: null, userProfile: null, error: "Unauthorized" }
  }

  const token = authHeader.replace("Bearer ", "")
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return { user: null, userProfile: null, error: "Invalid authentication" }
  }

  const { data: userProfile, error: profileError } = await supabase
    .from("users")
    .select("id, fullname, email, unipile_account_id, role")
    .eq("user_id", user.id)
    .single()

  if (profileError || !userProfile) {
    return { user, userProfile: null, error: "User profile not found" }
  }

  return { user, userProfile, error: null }
}

const ensureLeadContext = async (leadId: string) => {
  const supabase = createServiceClient()

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, contact_first_name, contact_last_name, contact_email, business_name, linkedin_account_id")
    .eq("id", leadId)
    .maybeSingle()

  if (leadError) {
    throw new Error(`Failed to load lead: ${leadError.message}`)
  }

  if (!lead) {
    return { lead: null, conversation: null }
  }

  const { data: conversation, error: convoError } = await supabase
    .from("email_conversation")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (convoError) {
    throw new Error(`Failed to load conversation: ${convoError.message}`)
  }

  console.log("[linkedin-messages] conversation lookup", {
    leadId,
    conversationId: (conversation as any)?.id ?? null,
    availableKeys: conversation ? Object.keys(conversation) : [],
  })

  return { lead, conversation }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const leadId = params.id
    if (!leadId) {
      return NextResponse.json({ error: "Lead id is required" }, { status: 400 })
    }

    const { user, userProfile, error: authError } = await authenticateUser(request)
    if (authError || !user) {
      return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 })
    }

    const { lead, conversation } = await ensureLeadContext(leadId)

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    const chatId =
      (conversation as any)?.chat_id ??
      (conversation as any)?.linkedin_conversation_uri ??
      (conversation as any)?.linkedin_chat_id ??
      null

    const attendeeId = 
      (conversation as any)?.linkedin_attendee_id ?? 
      lead.linkedin_account_id ?? 
      null

    console.log("[linkedin-messages] resolved chat id", {
      leadId,
      chatId,
      attendeeId,
      leadLinkedInAccountId: lead.linkedin_account_id,
      conversationKeys: conversation ? Object.keys(conversation) : [],
    })

    const supabase = createServiceClient()
    const { data: rawMessages, error: messagesError } = await supabase
      .from("linkedin_messages")
      .select("id, message, message_id, lead_id, is_inbound, created_at, sent_by_user_id, sent_via_account_id, received_by_user_id, received_via_account_id, chat_id")
      .eq("lead_id", leadId)
      .not("message", "is", null)
      .order("created_at", { ascending: true })

    if (messagesError) {
      throw new Error(`Failed to load LinkedIn messages: ${messagesError.message}`)
    }

    const senderUserIds = [...new Set((rawMessages || []).filter(m => m.sent_by_user_id).map(m => m.sent_by_user_id))]
    const receiverUserIds = [...new Set((rawMessages || []).filter(m => m.received_by_user_id).map(m => m.received_by_user_id))]
    const allUserIds = [...new Set([...senderUserIds, ...receiverUserIds])]
    let userProfiles: Record<string, { fullname: string; email: string }> = {}
    
    if (allUserIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("user_id, fullname, email")
        .in("user_id", allUserIds)
      
      if (users) {
        users.forEach(u => {
          userProfiles[u.user_id] = { fullname: u.fullname, email: u.email }
        })
      }
    }

    const normalizedLeadName = `${lead.contact_first_name || ""} ${lead.contact_last_name || ""}`.trim()
    const normalizedMessages = (rawMessages || [])
      .filter((item) => {
        if (!item) return false
        const text = typeof item.message === "string" ? item.message.trim() : ""
        const messageId = item.message_id?.trim()
        return Boolean(text) && Boolean(messageId)
      })
      .map((item: any) => {
        const text = item.message?.trim() ?? ""
        const timestamp = item.created_at ?? null
        const isInbound = Boolean(item.is_inbound)
        const senderUser = item.sent_by_user_id ? userProfiles[item.sent_by_user_id] : null
        const receiverUser = item.received_by_user_id ? userProfiles[item.received_by_user_id] : null
        
        return {
          id: item.message_id || String(item.id),
          text,
          timestamp,
          direction: isInbound ? "inbound" : "outbound",
          senderId: item.sent_by_user_id || null,
          senderAttendeeId: null,
          senderName: isInbound
            ? normalizedLeadName || lead.contact_email || lead.business_name || "LinkedIn contact"
            : senderUser?.fullname || "CRM User",
          senderEmail: isInbound ? null : senderUser?.email || null,
          sentViaAccountId: item.sent_via_account_id || null,
          receiverId: item.received_by_user_id || null,
          receiverName: isInbound
            ? receiverUser?.fullname || "CRM User"
            : normalizedLeadName || lead.contact_email || lead.business_name || "LinkedIn contact",
          receiverEmail: isInbound ? receiverUser?.email || null : null,
          receivedViaAccountId: item.received_via_account_id || null,
          attachments: [],
        }
      })

    const userHasLinkedIn = Boolean(userProfile?.unipile_account_id)
    const hasConversationTarget = Boolean(chatId) || Boolean(attendeeId)

    // Lead must have accepted the connection (1st degree) to send messages. Pending invitation = cannot send.
    let leadConnectedWithUser: boolean | null = null

    // Try to get LinkedIn profile URL from Unipile
    let linkedinProfileUrl: string | null = null

    // Method 1: Try to get from chat attendees (only if we have a chatId)
    if (chatId) {
      try {
        const chatData = await unipile.getChat(chatId)
        if (chatData?.attendees && Array.isArray(chatData.attendees)) {
          const leadAttendee = chatData.attendees.find(
            (a: any) => a.profile_url && a.id !== userProfile?.unipile_account_id
          ) || chatData.attendees.find((a: any) => a.profile_url)

          if (leadAttendee?.profile_url) {
            linkedinProfileUrl = leadAttendee.profile_url
          }
        }
      } catch {
        // Chat not found or error - fallback to Method 2
      }
    }

    // Method 2: If no profile URL yet and we have attendeeId, use getUser API (also used for connection check and profile picture)
    let leadProfilePictureUrl: string | null = null
    if (attendeeId && userProfile?.unipile_account_id) {
      try {
        const userProfileData = await unipile.getUser(attendeeId, userProfile.unipile_account_id)
        const networkDistance = (userProfileData as any)?.network_distance ?? null
        leadConnectedWithUser =
          networkDistance === "FIRST_DEGREE" || networkDistance === "DISTANCE_1"
        leadProfilePictureUrl =
          (userProfileData as any)?.profile_picture_url ??
          (userProfileData as any)?.profile_picture_url_large ??
          null
        if (!linkedinProfileUrl) {
          if ((userProfileData as any)?.profile_url) {
            linkedinProfileUrl = (userProfileData as any).profile_url
          } else if ((userProfileData as any)?.public_identifier) {
            linkedinProfileUrl = `https://www.linkedin.com/in/${(userProfileData as any).public_identifier}`
          }
        }
      } catch {
        // Could not fetch user profile
      }
    }

    const canSendMessage =
      userHasLinkedIn &&
      hasConversationTarget &&
      leadConnectedWithUser === true

    return NextResponse.json({
      chatId,
      attendeeId,
      canSendMessage,
      userLinkedInConnected: userHasLinkedIn,
      userUnipileAccountId: userProfile?.unipile_account_id || null,
      linkedinProfileUrl,
      leadProfilePictureUrl,
      lead: {
        id: lead.id,
        name: normalizedLeadName || lead.contact_email || lead.business_name || "LinkedIn contact",
        contactFirstName: lead.contact_first_name,
        contactLastName: lead.contact_last_name,
        businessName: lead.business_name,
        linkedinAccountId: lead.linkedin_account_id,
      },
      messages: normalizedMessages,
      meta: {
        count: normalizedMessages.length,
      },
    })
  } catch (error: any) {
    console.error("[linkedin-messages] GET error", error)
    return NextResponse.json(
      {
        error: "Failed to load LinkedIn messages",
        details: error.message ?? "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const leadId = params.id
    if (!leadId) {
      return NextResponse.json({ error: "Lead id is required" }, { status: 400 })
    }

    const { user, userProfile, error: authError } = await authenticateUser(request)
    if (authError || !user || !userProfile) {
      return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 })
    }

    if (!userProfile.unipile_account_id) {
      return NextResponse.json(
        {
          error: "LinkedIn not connected",
          details: "You need to connect your LinkedIn account in your profile before sending messages.",
        },
        { status: 403 },
      )
    }

    const payload = await request.json().catch(() => null)

    if (!payload || typeof payload.text !== "string" || payload.text.trim().length === 0) {
      return NextResponse.json({ error: "Message text is required" }, { status: 400 })
    }

    const messageText = payload.text.trim()
    const { lead, conversation } = await ensureLeadContext(leadId)

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    const chatId =
      (conversation as any)?.chat_id ??
      (conversation as any)?.linkedin_conversation_uri ??
      (conversation as any)?.linkedin_chat_id ??
      null

    const attendeeId = 
      (conversation as any)?.linkedin_attendee_id ?? 
      lead.linkedin_account_id ?? 
      null

    console.log("[linkedin-messages] resolved chat id (post)", {
      leadId,
      chatId,
      attendeeId,
      leadLinkedInAccountId: lead.linkedin_account_id,
      userUnipileAccountId: userProfile.unipile_account_id,
      conversationKeys: conversation ? Object.keys(conversation) : [],
    })

    if (!chatId && !attendeeId) {
      return NextResponse.json(
        {
          error: "LinkedIn chat is not configured for this lead.",
          details: "Cannot send message - no existing LinkedIn conversation or attendee ID found for this lead.",
        },
        { status: 422 },
      )
    }

    // Require lead to have accepted the connection (1st degree) before sending. Pending invitation = reject.
    if (attendeeId && userProfile.unipile_account_id) {
      try {
        const leadProfile = await unipile.getUser(attendeeId, userProfile.unipile_account_id)
        const networkDistance = (leadProfile as any)?.network_distance ?? null
        const isFirstDegree =
          networkDistance === "FIRST_DEGREE" || networkDistance === "DISTANCE_1"
        if (!isFirstDegree) {
          return NextResponse.json(
            {
              error: "Cannot send message",
              details: "The lead has not accepted your LinkedIn connection yet. You can only send messages once they have accepted your invitation.",
            },
            { status: 403 },
          )
        }
      } catch {
        return NextResponse.json(
          {
            error: "Cannot send message",
            details: "Unable to verify LinkedIn connection status. The lead must have accepted your connection to send messages.",
          },
          { status: 403 },
        )
      }
    }

    let apiResponse: any
    let usedChatId = chatId
    let startedNewChat = false

    if (chatId) {
      try {
        apiResponse = await unipile.sendMessageToChat(chatId, messageText)
      } catch (sendError: any) {
        const is404 = sendError.message?.includes("404") || sendError.message?.includes("not found")
        
        if (is404 && attendeeId && userProfile.unipile_account_id) {
          console.log("[linkedin-messages] Chat not found, starting new chat with attendee", {
            attendeeId,
            accountId: userProfile.unipile_account_id,
          })
          apiResponse = await unipile.startChat(userProfile.unipile_account_id, attendeeId, messageText)
          startedNewChat = true
          usedChatId = (apiResponse as any)?.item?.chat_id || (apiResponse as any)?.chat_id || chatId
        } else {
          throw sendError
        }
      }
    } else if (attendeeId && userProfile.unipile_account_id) {
      console.log("[linkedin-messages] No chat ID, starting new chat with attendee", {
        attendeeId,
        accountId: userProfile.unipile_account_id,
      })
      apiResponse = await unipile.startChat(userProfile.unipile_account_id, attendeeId, messageText)
      startedNewChat = true
      usedChatId = (apiResponse as any)?.item?.chat_id || (apiResponse as any)?.chat_id || null
    }

    const message = (apiResponse as any)?.item ?? apiResponse

    if (!message) {
      throw new Error("Unipile response missing message payload")
    }

    const normalizedMessage = {
      id: message.id || message.provider_id || message.uuid || crypto.randomUUID(),
      text: message.text || message.html || message.body || messageText,
      direction: "outbound" as const,
      timestamp: message.timestamp || message.created_at || new Date().toISOString(),
      senderId: user.id,
      senderAttendeeId: message.sender_attendee_id,
      senderName: userProfile.fullname || user.email || "You",
      senderEmail: userProfile.email || user.email,
      sentViaAccountId: userProfile.unipile_account_id,
      attachments: (message.attachments || []).map((attachment: any) => ({
        id: attachment.id || attachment.file_name || attachment.provider_id,
        fileName: attachment.file_name || attachment.name,
        mimeType: attachment.mime_type || attachment.content_type,
        size: attachment.size,
        sizeLabel: formatBytes(attachment.size),
        url: attachment.url,
      })),
    }

    const supabase = createServiceClient()
    
    if (startedNewChat && usedChatId) {
      try {
        await supabase
          .from("email_conversation")
          .update({ 
            chat_id: usedChatId,
            linkedin_chat_id: usedChatId,
          })
          .eq("lead_id", lead.id)
        console.log("[linkedin-messages] Updated conversation with new chat ID", { usedChatId })
      } catch (updateError) {
        console.error("[linkedin-messages] Failed to update conversation chat ID", updateError)
      }
    }

    try {
      await supabase.from("linkedin_messages").insert({
        lead_id: lead.id,
        message: normalizedMessage.text,
        message_id: normalizedMessage.id,
        chat_id: usedChatId,
        is_inbound: false,
        created_at: normalizedMessage.timestamp ?? new Date().toISOString(),
        sent_by_user_id: user.id,
        sent_via_account_id: userProfile.unipile_account_id,
        linkedin_attendee_id: attendeeId,
      })
    } catch (insertError) {
      console.error("[linkedin-messages] failed to persist outbound message", insertError)
    }

    return NextResponse.json({
      message: normalizedMessage,
      startedNewChat,
      chatId: usedChatId,
      sentBy: {
        userId: user.id,
        name: userProfile.fullname,
        email: userProfile.email,
        accountId: userProfile.unipile_account_id,
      },
    })
  } catch (error: any) {
    console.error("[linkedin-messages] POST error", error)
    return NextResponse.json(
      {
        error: "Failed to send LinkedIn message",
        details: error.message ?? "Unknown error",
      },
      { status: 500 },
    )
  }
}

