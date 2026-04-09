import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { unipile } from "@/lib/unipile"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const createServiceClient = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are not configured.")
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const leadId = params.id
    if (!leadId) {
      return NextResponse.json({ error: "Lead ID is required" }, { status: 400 })
    }

    const supabase = createServiceClient()

    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 })
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("id, fullname, unipile_account_id")
      .eq("user_id", user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, contact_first_name, contact_last_name, contact_email, business_name, linkedin_account_id")
      .eq("id", leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    const { data: conversation, error: convError } = await supabase
      .from("email_conversation")
      .select("id, chat_id, linkedin_chat_id, linkedin_attendee_id, linkedin_conversation_uri")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const userHasLinkedIn = Boolean(userProfile.unipile_account_id)
    const chatId = conversation?.chat_id || conversation?.linkedin_chat_id || conversation?.linkedin_conversation_uri || null
    const attendeeId = conversation?.linkedin_attendee_id || lead.linkedin_account_id || null
    const hasExistingChat = Boolean(chatId)
    const hasConversationTarget = Boolean(chatId) || Boolean(attendeeId)

    // Connected = accepted 1st degree only. Invitation sent but not accepted = not connected.
    let leadConnectedWithUser: boolean | null = null
    let networkDistance: string | null = null
    let leadProfilePictureUrl: string | null = null
    if (userHasLinkedIn && attendeeId && userProfile.unipile_account_id) {
      try {
        const leadProfile = await unipile.getUser(attendeeId, userProfile.unipile_account_id)
        networkDistance = (leadProfile as any)?.network_distance ?? null
        leadConnectedWithUser =
          networkDistance === "FIRST_DEGREE" || networkDistance === "DISTANCE_1"
        leadProfilePictureUrl =
          (leadProfile as any)?.profile_picture_url ??
          (leadProfile as any)?.profile_picture_url_large ??
          null
      } catch {
        leadConnectedWithUser = null
      }
    }

    // Can send only when lead has accepted the connection (1st degree). Pending invitation = cannot send.
    const canSendMessage =
      userHasLinkedIn &&
      hasConversationTarget &&
      leadConnectedWithUser === true

    let connectionStatus: "not_connected" | "user_not_linked" | "no_chat" | "connected" = "not_connected"
    if (!userHasLinkedIn) {
      connectionStatus = "user_not_linked"
    } else if (!hasConversationTarget) {
      connectionStatus = "no_chat"
    } else if (leadConnectedWithUser === true) {
      connectionStatus = "connected"
    } else {
      connectionStatus = "not_connected"
    }

    let accountStatus = null
    if (userHasLinkedIn) {
      try {
        const account = await unipile.getAccount(userProfile.unipile_account_id!)
        accountStatus = account.status || "unknown"
      } catch (e) {
        accountStatus = "error"
      }
    }

    return NextResponse.json({
      canSendMessage,
      connectionStatus,
      userLinkedInConnected: userHasLinkedIn,
      userUnipileAccountId: userProfile.unipile_account_id,
      userAccountStatus: accountStatus,
      leadHasChat: hasExistingChat,
      chatId,
      attendeeId,
      leadConnectedWithUser,
      networkDistance,
      lead: {
        id: lead.id,
        name: `${lead.contact_first_name || ""} ${lead.contact_last_name || ""}`.trim() || lead.contact_email || lead.business_name,
        linkedinAccountId: lead.linkedin_account_id,
        profilePictureUrl: leadProfilePictureUrl,
      },
      user: {
        id: user.id,
        name: userProfile.fullname,
      },
    })
  } catch (error: any) {
    console.error("[linkedin-connection] Error:", error)
    return NextResponse.json(
      { error: "Failed to check LinkedIn connection", details: error.message },
      { status: 500 }
    )
  }
}
