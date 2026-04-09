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
      .select("id, fullname, email, unipile_account_id")
      .eq("user_id", user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    if (!userProfile.unipile_account_id) {
      return NextResponse.json({
        connected: false,
        accountId: null,
        account: null,
      })
    }

    let accountDetails = null
    let accountStatus = "unknown"

    try {
      accountDetails = await unipile.getAccount(userProfile.unipile_account_id)
      accountStatus = accountDetails.status || "connected"
    } catch (fetchError: any) {
      console.warn("[unipile-status] Failed to fetch account details:", fetchError.message)
      accountStatus = "error"
    }

    return NextResponse.json({
      connected: true,
      accountId: userProfile.unipile_account_id,
      status: accountStatus,
      account: accountDetails,
    })
  } catch (error: any) {
    console.error("[unipile-status] Error:", error)
    return NextResponse.json(
      { error: "Failed to get LinkedIn status", details: error.message },
      { status: 500 }
    )
  }
}
