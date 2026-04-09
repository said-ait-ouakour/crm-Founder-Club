import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const N8N_WEBHOOK_URL = process.env.N8N_EMPLOYEE_DEACTIVATE_WEBHOOK_URL;

function createServiceClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, employeeName, employeeEmail } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Fetch complete user data from users table
    const { data: userData, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (fetchError || !userData) {
      console.error("Error fetching user:", fetchError);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user is already deactivated
    if (userData.is_active === false) {
      return NextResponse.json(
        { error: "User is already deactivated" },
        { status: 400 }
      );
    }

    // Update is_active to false in users table
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ is_active: false })
      .eq("id", userId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating user:", updateError);
      return NextResponse.json(
        { error: "Failed to deactivate user" },
        { status: 500 }
      );
    }

    // Delete user from Supabase Auth using Admin client
    // Note: If auth deletion fails, we still proceed with deactivation
    // The user is already marked as inactive, which prevents login via middleware
    if (userData.user_id) {
      try {
        const { data: deleteData, error: authDeleteError } = await supabase.auth.admin.deleteUser(
          userData.user_id
        );

        if (authDeleteError) {
          // Log the error but don't fail the deactivation
          // The user is already marked as inactive, which is the primary goal
          console.warn("Warning: Could not delete auth user (may not exist or already deleted):", authDeleteError);
          // Check if it's a "user not found" type error - that's acceptable
          const isUserNotFound = authDeleteError.message?.includes('not found') || 
                                 authDeleteError.message?.includes('does not exist') ||
                                 authDeleteError.code === 'user_not_found';
          
          if (!isUserNotFound) {
            // Only log unexpected errors, but continue with deactivation
            console.error("Unexpected error deleting auth user:", authDeleteError);
          }
        } else {
          console.log("Auth user deleted successfully");
        }
      } catch (authError) {
        // Log the error but don't fail the deactivation
        console.warn("Warning: Exception during auth deletion (continuing with deactivation):", authError);
      }
    } else {
      console.log("No user_id found, skipping auth deletion");
    }

    // Prepare employee object for webhook (array format)
    const employeeObject = {
      id: updatedUser.id,
      created_at: updatedUser.created_at,
      fullName: updatedUser.fullname || updatedUser.fullName || employeeName,
      email: updatedUser.email || employeeEmail,
      ringcentral_name: updatedUser.ringcentral_name || null,
      user_id: updatedUser.user_id || null,
      role: updatedUser.role || null,
      hubstaff_id: updatedUser.hubstaff_id || null,
      ringcentral_id: updatedUser.ringcentral_id || null,
      peoplemanager_id: updatedUser.peoplemanager_id || null,
      is_active: false,
      from: "crm-pm",
    };

    // Call n8n webhook with employee data in array format
    if (N8N_WEBHOOK_URL) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify([employeeObject]), // Array format
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text().catch(() => "Unknown error");
          console.error("Webhook error:", errorText);
          // Don't fail the request if webhook fails, but log it
          console.warn("Webhook call failed, but user deactivation completed");
        } else {
          console.log("Webhook called successfully");
        }
      } catch (webhookError) {
        console.error("Error calling webhook:", webhookError);
        // Don't fail the request if webhook fails, but log it
        console.warn("Webhook call failed, but user deactivation completed");
      }
    } else {
      console.warn("N8N_EMPLOYEE_DEACTIVATE_WEBHOOK_URL not configured");
    }

    // Recheck database status after webhook
    const { data: finalUserData, error: finalCheckError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (finalCheckError) {
      console.error("Error rechecking user:", finalCheckError);
    }

    // Return updated user data
    return NextResponse.json({
      success: true,
      message: "Employee deactivated successfully",
      user: finalUserData || updatedUser,
    });
  } catch (error) {
    console.error("Error in deactivate API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

