import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("candidates")
    .select("position")
    .not("position", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const uniquePositions = Array.from(new Set(data.map((item) => item.position)));

  return NextResponse.json(uniquePositions);
}
