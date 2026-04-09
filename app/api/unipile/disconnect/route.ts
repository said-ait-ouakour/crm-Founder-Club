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
      .select("id, unipile_account_id")
      .eq("user_id", user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    if (!userProfile.unipile_account_id) {
      return NextResponse.json({ error: "No LinkedIn account connected" }, { status: 400 })
    }

    try {
      await unipile.deleteAccount(userProfile.unipile_account_id)
    } catch (deleteError: any) {
      console.warn("[unipile-disconnect] Failed to delete account from Unipile:", deleteError.message)
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({ unipile_account_id: null, linkedin_account_id: null })
      .eq("user_id", user.id)

    if (updateError) {
      return NextResponse.json({ error: "Failed to update user profile" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "LinkedIn account disconnected" })
  } catch (error: any) {
    console.error("[unipile-disconnect] Error:", error)
    return NextResponse.json(
      { error: "Failed to disconnect LinkedIn account", details: error.message },
      { status: 500 }
    )
  }
}
