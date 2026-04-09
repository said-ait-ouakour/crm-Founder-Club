"use server"

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const WEBHOOK_URL = process.env.N8N_LINKEDIN_CONVERSATION_WEBHOOK_URL
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

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!WEBHOOK_URL) {
      return NextResponse.json(
        {
          error: "Webhook URL not configured",
          details: "Set N8N_LINKEDIN_CONVERSATION_WEBHOOK_URL in your environment.",
        },
        { status: 500 },
      )
    }

    const leadId = params.id
    if (!leadId) {
      return NextResponse.json({ error: "Lead id is required" }, { status: 400 })
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

    let incomingPayload: any = null
    try {
      incomingPayload = await request.json()
    } catch {
      incomingPayload = null
    }

    const profileUrl: string | undefined =
      incomingPayload?.profile_url ?? incomingPayload?.profileUrl ?? undefined

    const webhookPayload: Record<string, any> = {
      lead_id: leadId,
      iam_account_id: userProfile.unipile_account_id,
    }
    if (profileUrl) {
      webhookPayload.profile_url = profileUrl
    }

    console.log("[linkedin-start-agent] triggering webhook", {
      leadId,
      iamAccountId: userProfile.unipile_account_id,
      hasProfileUrl: Boolean(profileUrl),
    })

    const res = await fetch(WEBHOOK_URL, {
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
      console.error("[linkedin-start-conversation] webhook error", {
        status: res.status,
        response: parsedBody ?? rawBody,
      })

      return NextResponse.json(
        {
          error: "Failed to trigger LinkedIn conversation webhook",
          details: parsedBody?.message ?? (rawBody || `Webhook responded with status ${res.status}`),
          response: parsedBody ?? null,
        },
        { status: res.status },
      )
    }

    if (parsedBody !== null) {
      console.log("[linkedin-start-conversation] webhook response (json)", {
        leadId,
        status: res.status,
        payload: parsedBody,
      })
      return NextResponse.json(parsedBody, { status: res.status })
    }

    if (rawBody) {
      console.log("[linkedin-start-conversation] webhook response (text)", {
        leadId,
        status: res.status,
        payload: rawBody,
      })
      return NextResponse.json(
        {
          success: true,
          message: rawBody,
        },
        { status: res.status },
      )
    }

    return NextResponse.json({ success: true }, { status: res.status })
  } catch (error: any) {
    console.error("[linkedin-start-conversation] error", error)
    return NextResponse.json(
      {
        error: "Failed to trigger LinkedIn conversation webhook",
        details: error.message ?? "Unknown error",
      },
      { status: 500 },
    )
  }
}

