import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createServiceClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, accessGranted } = body;

    if (!userId || typeof accessGranted !== 'boolean') {
      return NextResponse.json(
        { error: "User ID and accessGranted status are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Update access_granted status
    const { data, error } = await supabase
      .from("users")
      .update({ access_granted: accessGranted })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating user access:", error);
      return NextResponse.json(
        { error: "Failed to update user access" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: accessGranted 
        ? "Lead assignment access granted" 
        : "Lead assignment access revoked",
      user: data,
    });
  } catch (error) {
    console.error("Error in update-access API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


