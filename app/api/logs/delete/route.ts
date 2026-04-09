import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "manager") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Log IDs are required" }, { status: 400 });
    }

    const { error } = await supabase.from("logs").delete().in("id", ids);

    if (error) {
      console.error("Error deleting logs:", error);
      return NextResponse.json({ error: "Failed to delete logs" }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error) {
    console.error("Error in DELETE /api/logs/delete:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
