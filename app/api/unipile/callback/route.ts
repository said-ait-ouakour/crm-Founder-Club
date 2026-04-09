import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { unipile } from "@/lib/unipile"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

const createServiceClient = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are not configured.")
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get("user_id")
    const action = url.searchParams.get("action")
    const accountId = url.searchParams.get("account_id")

    if (!userId) {
      return NextResponse.redirect(`${APP_URL}/profile?linkedin_error=missing_user_id`)
    }

    if (action === "failure") {
      return NextResponse.redirect(`${APP_URL}/profile?linkedin_error=connection_failed`)
    }

    if (!accountId) {
      return NextResponse.redirect(`${APP_URL}/profile?linkedin_error=missing_account_id`)
    }

    const supabase = createServiceClient()

    // Fetch the connected user's LinkedIn provider_id for traceability (linkedin_account_id)
    let linkedinAccountId: string | null = null
    try {
      const ownProfile = await unipile.getOwnProfile(accountId)
      linkedinAccountId = (ownProfile as any)?.provider_id ?? null
    } catch (e) {
      console.warn("[unipile-callback] Could not fetch own profile for linkedin_account_id:", e)
    }

    const updatePayload: { unipile_account_id: string; linkedin_account_id?: string | null } = {
      unipile_account_id: accountId,
    }
    if (linkedinAccountId) {
      updatePayload.linkedin_account_id = linkedinAccountId
    }

    const { error: updateError } = await supabase
      .from("users")
      .update(updatePayload)
      .eq("user_id", userId)

    if (updateError) {
      console.error("[unipile-callback] Failed to update user:", updateError)
      return NextResponse.redirect(`${APP_URL}/profile?linkedin_error=save_failed`)
    }

    return NextResponse.redirect(`${APP_URL}/profile?linkedin_connected=true`)
  } catch (error: any) {
    console.error("[unipile-callback] Error:", error)
    return NextResponse.redirect(`${APP_URL}/profile?linkedin_error=unexpected_error`)
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    
    console.log("[unipile-callback] Webhook received:", JSON.stringify(payload, null, 2))

    const accountId = payload.account_id || payload.data?.account_id || payload.id
    const userId = payload.metadata?.user_id || payload.user_id

    if (!accountId) {
      console.warn("[unipile-callback] No account_id in webhook payload")
      return NextResponse.json({ received: true, warning: "No account_id found" })
    }

    if (userId) {
      const supabase = createServiceClient()

      let linkedinAccountId: string | null = null
      try {
        const ownProfile = await unipile.getOwnProfile(accountId)
        linkedinAccountId = (ownProfile as any)?.provider_id ?? null
      } catch (e) {
        console.warn("[unipile-callback] Webhook: could not fetch own profile for linkedin_account_id:", e)
      }

      const updatePayload: { unipile_account_id: string; linkedin_account_id?: string | null } = {
        unipile_account_id: accountId,
      }
      if (linkedinAccountId) {
        updatePayload.linkedin_account_id = linkedinAccountId
      }

      const { error: updateError } = await supabase
        .from("users")
        .update(updatePayload)
        .eq("user_id", userId)

      if (updateError) {
        console.error("[unipile-callback] Failed to update user via webhook:", updateError)
        return NextResponse.json({ received: true, error: "Failed to update user" })
      }
    }

    return NextResponse.json({ received: true, accountId })
  } catch (error: any) {
    console.error("[unipile-callback] Webhook error:", error)
    return NextResponse.json({ received: true, error: error.message }, { status: 200 })
  }
}
