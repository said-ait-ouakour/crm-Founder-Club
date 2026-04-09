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

export async function POST(request: Request) {
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
      .select("id, fullname, email, unipile_account_id")
      .eq("user_id", user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: "User profile not found", details: profileError?.message }, { status: 404 })
    }

    if (userProfile.unipile_account_id) {
      return NextResponse.json(
        { error: "LinkedIn account already connected", accountId: userProfile.unipile_account_id },
        { status: 400 }
      )
    }

    const successUrl = `${APP_URL}/api/unipile/callback?user_id=${user.id}&action=success`
    const failureUrl = `${APP_URL}/api/unipile/callback?user_id=${user.id}&action=failure`

    const hostedAuthResponse = await unipile.createHostedAuthLink({
      type: "create",
      provider: "LINKEDIN",
      success_redirect_url: successUrl,
      failure_redirect_url: failureUrl,
      name: userProfile.fullname || userProfile.email || user.id,
    })

    if (!hostedAuthResponse.url) {
      throw new Error("Failed to generate Unipile authentication link")
    }

    return NextResponse.json({
      authUrl: hostedAuthResponse.url,
      expiresAt: hostedAuthResponse.expires_at,
    })
  } catch (error: any) {
    console.error("[unipile-connect] Error:", error)
    return NextResponse.json(
      { error: "Failed to initiate LinkedIn connection", details: error.message },
      { status: 500 }
    )
  }
}
