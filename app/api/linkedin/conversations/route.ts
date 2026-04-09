import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const createServiceClient = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are not configured.")
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

interface LeadWithLinkedInMessages {
  id: string
  contact_first_name: string | null
  contact_last_name: string | null
  contact_email: string | null
  business_name: string | null
  current_status: string | null
  linkedin_account_id: string | null
  lastMessage: {
    message: string
    created_at: string
    is_inbound: boolean
  } | null
  messageCount: number
  unreadCount: number
}

export async function GET(request: Request) {
  try {
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
      .select("id, role, user_id")
      .eq("user_id", user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const isManager = userProfile.role === "manager"
    const internalUserId = userProfile.id

    let leadIds: string[] = []

    if (!isManager) {
      const { data: assignedLeads, error: assignedError } = await supabase
        .from("users_leads")
        .select("lead_id")
        .eq("user_id", internalUserId)

      if (assignedError) {
        console.error("[linkedin-conversations] Error fetching assigned leads:", assignedError)
        return NextResponse.json({ error: "Failed to fetch assigned leads" }, { status: 500 })
      }

      leadIds = (assignedLeads || [])
        .map((ul) => ul.lead_id)
        .filter((id): id is string => id !== null)

      if (leadIds.length === 0) {
        return NextResponse.json({
          conversations: [],
          total: 0,
          message: "No leads assigned to this advisor",
        })
      }
    }

    const { data: leadsWithMessages, error: leadsError } = await supabase
      .from("linkedin_messages")
      .select("lead_id")
      .not("message", "is", null)

    if (leadsError) {
      console.error("[linkedin-conversations] Error fetching leads with messages:", leadsError)
      return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 })
    }

    const uniqueLeadIds = [...new Set((leadsWithMessages || []).map((m) => m.lead_id))]
      .filter((id): id is string => id !== null)

    let filteredLeadIds = uniqueLeadIds
    if (!isManager && leadIds.length > 0) {
      const assignedSet = new Set(leadIds)
      filteredLeadIds = uniqueLeadIds.filter((id) => assignedSet.has(id))
    }

    if (filteredLeadIds.length === 0) {
      return NextResponse.json({
        conversations: [],
        total: 0,
        message: isManager 
          ? "No LinkedIn conversations found" 
          : "No LinkedIn conversations found for your assigned leads",
      })
    }

    const { data: leads, error: fetchLeadsError } = await supabase
      .from("leads")
      .select("id, contact_first_name, contact_last_name, contact_email, business_name, current_status, linkedin_account_id")
      .in("id", filteredLeadIds)

    if (fetchLeadsError) {
      console.error("[linkedin-conversations] Error fetching leads:", fetchLeadsError)
      return NextResponse.json({ error: "Failed to fetch lead details" }, { status: 500 })
    }

    const conversations: LeadWithLinkedInMessages[] = await Promise.all(
      (leads || []).map(async (lead) => {
        const { data: messages, error: messagesError } = await supabase
          .from("linkedin_messages")
          .select("id, message, created_at, is_inbound")
          .eq("lead_id", lead.id)
          .not("message", "is", null)
          .order("created_at", { ascending: false })

        if (messagesError) {
          console.error(`[linkedin-conversations] Error fetching messages for lead ${lead.id}:`, messagesError)
          return {
            ...lead,
            lastMessage: null,
            messageCount: 0,
            unreadCount: 0,
          }
        }

        const lastMessage = messages && messages.length > 0 ? {
          message: messages[0].message,
          created_at: messages[0].created_at,
          is_inbound: messages[0].is_inbound || false,
        } : null

        const unreadCount = (messages || []).filter((m) => m.is_inbound).length

        return {
          id: lead.id,
          contact_first_name: lead.contact_first_name,
          contact_last_name: lead.contact_last_name,
          contact_email: lead.contact_email,
          business_name: lead.business_name,
          current_status: lead.current_status,
          linkedin_account_id: lead.linkedin_account_id,
          lastMessage,
          messageCount: (messages || []).length,
          unreadCount,
        }
      })
    )

    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0
      const bTime = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0
      return bTime - aTime
    })

    return NextResponse.json({
      conversations,
      total: conversations.length,
      userRole: userProfile.role,
    })
  } catch (error: any) {
    console.error("[linkedin-conversations] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch LinkedIn conversations", details: error.message },
      { status: 500 }
    )
  }
}
