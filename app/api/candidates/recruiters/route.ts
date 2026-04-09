import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    // Get distinct recruiter names from candidates table
    const { data, error } = await supabase
      .from("candidates")
      .select("recruiter_name")
      .not("recruiter_name", "is", null)
      .not("recruiter_name", "eq", "");

    if (error) {
      console.error("Error fetching recruiter names:", error);
      return NextResponse.json(
        { error: "Failed to fetch recruiter names" },
        { status: 500 }
      );
    }

    // Get unique recruiter names and sort them
    const uniqueRecruiters = Array.from(
      new Set(
        (data || [])
          .map((c: any) => c.recruiter_name)
          .filter((name: string | null) => name && name.trim() !== "")
      )
    ).sort();

    return NextResponse.json({ data: uniqueRecruiters });
  } catch (error) {
    console.error("Error in recruiters API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

