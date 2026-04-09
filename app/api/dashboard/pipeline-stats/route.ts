import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_pipeline_kpi_stats");

    if (error) {
      console.error("pipeline-stats RPC error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? { total_leads: 0, stages: [] });
  } catch (err: any) {
    console.error("pipeline-stats unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
