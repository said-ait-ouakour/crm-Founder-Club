"use server"

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const BULK_WEBHOOK_URL = process.env.N8N_LINKEDIN_BULK_START_WEBHOOK_URL
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const createServiceClient = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are not configured.")
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
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

export interface PotentialLead {
  profile_url: string
  name: string
  company?: string
  headline?: string
  provider_id: string
  first_name?: string
  last_name?: string
}

export interface BulkStartPayload {
  leads: PotentialLead[]
  source_lead_id: string
}

export async function POST(request: Request) {
  try {
    if (!BULK_WEBHOOK_URL) {
      return NextResponse.json(
        {
          error: "Bulk webhook URL not configured",
          details: "Set N8N_LINKEDIN_BULK_START_WEBHOOK_URL in your environment.",
        },
        { status: 500 },
      )
    }

    const { user, userProfile, error: authError } = await authenticateUser(request)
    if (authError || !user) {
      return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 })
    }

    if (!userProfile?.unipile_account_id) {
      return NextResponse.json(
        {
          error: "LinkedIn not connected",
          details: "You need to connect your LinkedIn account in your profile before starting agent conversations.",
        },
        { status: 403 },
      )
    }

    const payload: BulkStartPayload = await request.json().catch(() => null)

    if (!payload || !Array.isArray(payload.leads) || payload.leads.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload", details: "Expected { leads: [...], source_lead_id }" },
        { status: 400 },
      )
    }

    if (!payload.source_lead_id) {
      return NextResponse.json(
        { error: "source_lead_id is required" },
        { status: 400 },
      )
    }

    const validLeads = payload.leads.filter(
      (lead) => lead.provider_id && (lead.profile_url || lead.name)
    )

    if (validLeads.length === 0) {
      return NextResponse.json(
        { error: "No valid leads provided", details: "Each lead must have at least provider_id and (profile_url or name)" },
        { status: 400 },
      )
    }

    // Payload for n8n: search IAM, loop over leads, add to DB, assign to IAM, connection check/messaging
    const webhookPayload = {
      leads: validLeads.map((lead) => ({
        provider_id: lead.provider_id,
        name: lead.name,
        profile_url: lead.profile_url ?? "",
        headline: lead.headline ?? "",
        company: lead.company ?? "",
        first_name: lead.first_name || lead.name?.split(" ")[0] || "",
        last_name: lead.last_name || lead.name?.split(" ").slice(1).join(" ") || "",
      })),
      iam_account_id: userProfile.unipile_account_id,
      source_lead_id: payload.source_lead_id,
      initiated_by: {
        user_id: user.id,
        name: userProfile.fullname,
        email: userProfile.email,
      },
    }

    console.log("[linkedin-bulk-start] triggering webhook", {
      leadCount: validLeads.length,
      sourceLeadId: payload.source_lead_id,
      iamAccountId: userProfile.unipile_account_id,
    })

    const res = await fetch(BULK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookPayload),
    })

    const rawBody = await res.text().catch(() => "")
    let parsedBody: any = null
    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody)
      } catch {
        parsedBody = null
      }
    }

    if (!res.ok) {
      console.error("[linkedin-bulk-start] webhook error", {
        status: res.status,
        response: parsedBody ?? rawBody,
      })

      return NextResponse.json(
        {
          error: "Failed to trigger bulk LinkedIn workflow",
          details: parsedBody?.message ?? (rawBody || `Webhook responded with status ${res.status}`),
          response: parsedBody ?? null,
        },
        { status: res.status },
      )
    }

    console.log("[linkedin-bulk-start] webhook response", {
      status: res.status,
      payload: parsedBody,
    })

    return NextResponse.json({
      success: true,
      status: "bulk_agent_started",
      message: `Started LinkedIn agent for ${validLeads.length} lead(s)`,
      leads_processed: validLeads.length,
      workflow_response: parsedBody,
    })
  } catch (error: any) {
    console.error("[linkedin-bulk-start] error", error)
    return NextResponse.json(
      {
        error: "Failed to start bulk LinkedIn workflow",
        details: error.message ?? "Unknown error",
      },
      { status: 500 },
    )
  }
}
