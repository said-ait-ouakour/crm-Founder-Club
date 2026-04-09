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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const leadId = params.id
    if (!leadId) {
      return NextResponse.json({ error: "Lead id is required." }, { status: 400 })
    }

    const payload = await request.json().catch(() => null)
    const stage = typeof payload?.stage === "string" ? payload.stage.trim() : ""

    if (!stage) {
      return NextResponse.json({ error: "Stage is required." }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("leads")
      .update({ stage })
      .eq("id", leadId)
      .select("id, stage")
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 })
    }

    return NextResponse.json({ success: true, stage: data.stage ?? stage })
  } catch (error: any) {
    console.error("[lead-stage] error", error)
    return NextResponse.json(
      {
        error: "Failed to update lead stage.",
        details: error?.message ?? "Unknown error",
      },
      { status: 500 },
    )
  }
}


