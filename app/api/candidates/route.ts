import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Helper function to get candidate IDs based on communication filters
async function getCandidateIdsByCommunicationFilters(
  responseStatusFilter: string,
  responseChannelFilter: string,
  contactedFilter: string
): Promise<number[] | null> {
  // If no communication filters are active, return null (don't filter)
  if (
    responseStatusFilter === "all" &&
    responseChannelFilter === "all" &&
    contactedFilter === "all"
  ) {
    return null;
  }

  try {
    // Get candidate IDs that match each filter criteria
    const candidateIdSets: Set<number>[] = [];

    // Response Channel Filter: Email
    if (responseChannelFilter === "email") {
      const { data: conversations } = await supabase
        .from("candidates_conversation")
        .select("id, candidate_id");
      
      if (conversations && conversations.length > 0) {
        const convMap = new Map(conversations.map((c: any) => [c.id, c.candidate_id]));
        const convIds = Array.from(convMap.keys());
        const { data: emails } = await supabase
          .from("candidate_email_messages")
          .select("conversation_id")
          .in("conversation_id", convIds)
          .ilike("direction", "inbound");
        
        if (emails) {
          const emailConvIds = new Set(emails.map((e: any) => e.conversation_id));
          const emailCandidateIds = Array.from(emailConvIds)
            .map((convId) => convMap.get(convId))
            .filter((id): id is number => id !== undefined);
          candidateIdSets.push(new Set(emailCandidateIds));
        }
      } else {
        return []; // No conversations = no email responses
      }
    }

    // Response Channel Filter: SMS
    if (responseChannelFilter === "sms") {
      const { data: sms } = await supabase
        .from("candidates_sms_whatsapp_conversations")
        .select("candidate_id")
        .eq("is_inbound", true)
        .eq("message_type", "SMS");
      
      if (sms && sms.length > 0) {
        candidateIdSets.push(new Set(sms.map((s) => s.candidate_id)));
      } else {
        return []; // No SMS responses
      }
    }

    // Response Channel Filter: WhatsApp
    if (responseChannelFilter === "whatsapp") {
      const { data: whatsapp } = await supabase
        .from("candidates_sms_whatsapp_conversations")
        .select("candidate_id")
        .eq("is_inbound", true)
        .eq("message_type", "WhatsApp");
      
      if (whatsapp && whatsapp.length > 0) {
        candidateIdSets.push(new Set(whatsapp.map((w) => w.candidate_id)));
      } else {
        return []; // No WhatsApp responses
      }
    }

    // Response Channel Filter: Calls
    if (responseChannelFilter === "calls") {
      // Check if candidate_calls table exists and has calls
      const { data: calls, error: callsError } = await supabase
        .from("candidate_calls")
        .select("candidate_id, call_ended_reason, call_status")
        .not("call_ended_reason", "in", "(customer-busy,customer-did-not-answer,voicemail,silence-timed-out)");
      
      if (callsError) {
        // If candidate_calls table doesn't exist, try linking via phone number from calls table
        console.warn("candidate_calls table not found, trying alternative:", callsError);
        
        const { data: allCandidates } = await supabase
          .from("candidates")
          .select("id, phone_number")
          .not("phone_number", "is", null);
        
        if (allCandidates && allCandidates.length > 0) {
          const phoneToCandidateId = new Map(
            allCandidates.map((c: any) => [c.phone_number, c.id])
          );
          
          const { data: callsData } = await supabase
            .from("calls")
            .select("lead_phone, call_ended_reason, call_status")
            .not("call_ended_reason", "in", "(customer-busy,customer-did-not-answer,voicemail,silence-timed-out)");
          
          if (callsData) {
            const callCandidateIds = callsData
              .map((call: any) => phoneToCandidateId.get(call.lead_phone))
              .filter((id): id is number => id !== undefined);
            
            if (callCandidateIds.length > 0) {
              candidateIdSets.push(new Set(callCandidateIds));
            } else {
              return []; // No matching calls
            }
          } else {
            return []; // No calls found
          }
        } else {
          return []; // No candidates with phone numbers
        }
      } else if (calls && calls.length > 0) {
        // Filter for completed/successful calls
        const successfulCallIds = calls
          .filter((call: any) => {
            const reason = call.call_ended_reason?.toLowerCase() || "";
            return reason.includes("ended-call") || 
                   call.call_status === "completed" ||
                   !reason.includes("busy") && 
                   !reason.includes("no-answer") &&
                   !reason.includes("voicemail");
          })
          .map((call: any) => call.candidate_id);
        
        if (successfulCallIds.length > 0) {
          candidateIdSets.push(new Set(successfulCallIds));
        } else {
          return []; // No successful calls
        }
      } else {
        return []; // No calls found
      }
    }

    // Response Status Filter: Responded (any channel)
    if (responseStatusFilter === "responded") {
      const emailIds = new Set<number>();
      const { data: conversations } = await supabase
        .from("candidates_conversation")
        .select("id, candidate_id");
      
      if (conversations && conversations.length > 0) {
        const convMap = new Map(conversations.map((c: any) => [c.id, c.candidate_id]));
        const convIds = Array.from(convMap.keys());
        const { data: emails } = await supabase
          .from("candidate_email_messages")
          .select("conversation_id")
          .in("conversation_id", convIds)
          .ilike("direction", "inbound");
        
        if (emails) {
          const emailConvIds = new Set(emails.map((e: any) => e.conversation_id));
          emailConvIds.forEach((convId) => {
            const candidateId = convMap.get(convId);
            if (candidateId) emailIds.add(candidateId);
          });
        }
      }

      const { data: smswa } = await supabase
        .from("candidates_sms_whatsapp_conversations")
        .select("candidate_id")
        .eq("is_inbound", true);
      
      const smswaIds = new Set(smswa?.map((s) => s.candidate_id) || []);
      const allRespondedIds = new Set([...emailIds, ...smswaIds]);
      candidateIdSets.push(allRespondedIds);
    }

    // Response Status Filter: No Response
    if (responseStatusFilter === "no_response") {
      const respondedIds = new Set<number>();
      
      const { data: conversations } = await supabase
        .from("candidates_conversation")
        .select("id, candidate_id");
      
      if (conversations && conversations.length > 0) {
        const convIds = conversations.map((c) => c.id);
        const { data: emails } = await supabase
          .from("candidate_email_messages")
          .select("conversation_id")
          .in("conversation_id", convIds)
          .ilike("direction", "inbound");
        
        if (emails) {
          const emailConvIds = new Set(emails.map((e) => e.conversation_id));
          conversations
            .filter((c) => emailConvIds.has(c.id))
            .forEach((c) => respondedIds.add(c.candidate_id));
        }
      }

      const { data: smswa } = await supabase
        .from("candidates_sms_whatsapp_conversations")
        .select("candidate_id")
        .eq("is_inbound", true);
      
      smswa?.forEach((s) => respondedIds.add(s.candidate_id));

      const { data: allCandidates } = await supabase.from("candidates").select("id");
      const allIds = new Set(allCandidates?.map((c) => c.id) || []);
      const noResponseIds = new Set([...allIds].filter((id) => !respondedIds.has(id)));
      candidateIdSets.push(noResponseIds);
    }

    // Contacted Filter
    if (contactedFilter === "contacted" || contactedFilter === "not_contacted") {
      const contactedIds = new Set<number>();
      
      const { data: conversations } = await supabase
        .from("candidates_conversation")
        .select("candidate_id");
      conversations?.forEach((c) => contactedIds.add(c.candidate_id));

      const { data: smswa } = await supabase
        .from("candidates_sms_whatsapp_conversations")
        .select("candidate_id");
      smswa?.forEach((s) => contactedIds.add(s.candidate_id));

      if (contactedFilter === "contacted") {
        candidateIdSets.push(contactedIds);
      } else {
        const { data: allCandidates } = await supabase.from("candidates").select("id");
        const allIds = new Set(allCandidates?.map((c) => c.id) || []);
        const notContactedIds = new Set([...allIds].filter((id) => !contactedIds.has(id)));
        candidateIdSets.push(notContactedIds);
      }
    }

    // Intersect all sets (candidates must match ALL active filters)
    if (candidateIdSets.length === 0) {
      return [];
    }

    let result = candidateIdSets[0];
    for (let i = 1; i < candidateIdSets.length; i++) {
      result = new Set([...result].filter((id) => candidateIdSets[i].has(id)));
    }

    return Array.from(result);
  } catch (error) {
    console.error("Error in getCandidateIdsByCommunicationFilters:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search") || "";
    const recruiterFilter = searchParams.get("recruiter") || "";
    const emailFilter = searchParams.get("email") || "";
    const phoneFilter = searchParams.get("phone") || "";
    const hasNotesFilter = searchParams.get("has_notes") || "";
    const advisorId = searchParams.get("advisorId") || null;
    const isAdmin = searchParams.get("isAdmin") === "true";
    const isRecruiter = searchParams.get("isRecruiter") === "true";
    const roleFilter = searchParams.get("role") || "";
    const typeformSentFilter = searchParams.get("typeform_sent") || "";
    const typeformCompletedFilter = searchParams.get("typeform_completed") || "";
    const candidateStatusFilter = searchParams.get("candidate_status") || "all";
    const stageFilter = searchParams.get("stage") || "all";
    const hasCallSummaryFilter = searchParams.get("has_call_summary") || "all";
    const responseStatusFilter = searchParams.get("response_status") || "all";
    const responseChannelFilter = searchParams.get("response_channel") || "all";
    const contactedFilter = searchParams.get("contacted") || "all";

    // Get candidate IDs that match communication filters (if any)
    const communicationFilteredIds = await getCandidateIdsByCommunicationFilters(
      responseStatusFilter,
      responseChannelFilter,
      contactedFilter
    );

    // Build the query
    let query = supabase
      .from("candidates")
      .select("*", { count: "exact" });

    // Apply communication filter IDs if any communication filters are active
    if (communicationFilteredIds !== null) {
      if (communicationFilteredIds.length === 0) {
        // No candidates match the communication filters, return empty result
        return NextResponse.json({
          data: [],
          count: 0,
          page,
          pageSize,
          totalPages: 0,
        });
      }
      query = query.in("id", communicationFilteredIds);
    }

    // Apply role-based filtering
    if (isAdmin) {
      // console.log("Manager access - showing all candidates");
    } else if (isRecruiter) {
      // console.log("Recruiter access - showing all candidates");
    } else if (advisorId) {
      // TEMP: Advisors can see all candidates for now (no recruiter filter)
      // console.log("Advisor access - temporarily showing all candidates", { advisorId });
    }

    // Apply search filter for full name
    if (search.trim() !== "") {
      query = query.ilike("full_name", `%${search}%`);
    }

    // Apply recruiter filter (by recruiter_name, not ID)
    if (recruiterFilter && recruiterFilter !== "all" && recruiterFilter.trim() !== "") {
      // Filter by recruiter_name column directly
      query = query.eq("recruiter_name", recruiterFilter);
      console.log("[Recruiter Filter] Applied filter for recruiter name:", recruiterFilter);
    }

    // Apply email filter
    if (emailFilter.trim() !== "") {
      query = query.ilike("email", `%${emailFilter}%`);
    }

    // Apply phone filter
    if (phoneFilter.trim() !== "") {
      query = query.ilike("phone_number", `%${phoneFilter}%`);
    }

    // Apply has notes filter
    if (hasNotesFilter === "true") {
      query = query.not("notes", "is", null);
    } else if (hasNotesFilter === "false") {
      query = query.is("notes", null);
    }

    if (roleFilter && roleFilter !== "all") {
      query = query.eq("position", roleFilter);
    }

    // Apply typeform_sent filter
    if (typeformSentFilter && typeformSentFilter !== "all") {
      if (typeformSentFilter === "true") {
        query = query.eq("typeform_sent", true);
      } else if (typeformSentFilter === "false") {
        query = query.eq("typeform_sent", false);
      }
    }

    // Apply typeform_completed filter
    if (typeformCompletedFilter && typeformCompletedFilter !== "all") {
      if (typeformCompletedFilter === "true") {
        query = query.eq("typeform_completed", true);
      } else if (typeformCompletedFilter === "false") {
        query = query.eq("typeform_completed", false);
      }
    }

    // Apply stage filter
    if (stageFilter && stageFilter !== "all") {
      switch (stageFilter) {
        case "interview":
          query = query.eq("interview_sent", true);
          console.log("[Stage Filter] Filtering for interview_sent = true");
          break;
        case "joboffer":
          query = query.eq("joboffer_sent", true);
          console.log("[Stage Filter] Filtering for joboffer_sent = true");
          break;
        case "documents":
          query = query.eq("docs_uploaded", true);
          console.log("[Stage Filter] Filtering for docs_uploaded = true");
          break;
        case "references":
          query = query.eq("references_contacted", true);
          console.log("[Stage Filter] Filtering for references_contacted = true");
          break;
        case "contractsent":
          query = query.eq("contract_sent", true);
          console.log("[Stage Filter] Filtering for contract_sent = true");
          break;
        case "contractsigned":
          query = query.eq("contract_signed", true);
          console.log("[Stage Filter] Filtering for contract_signed = true");
          break;
        default:
          console.warn("[Stage Filter] Unknown stage filter value:", stageFilter);
      }
    }

    // Apply candidate status filter - filters ONLY the status column
    // Valid values: "not_suitable", "interview_booked", "interview_attended", "not_interested", "has_position_already"
    if (candidateStatusFilter && candidateStatusFilter !== "all") {
      query = query.eq("status", candidateStatusFilter);
    }

    // Apply call summary filter
    if (hasCallSummaryFilter && hasCallSummaryFilter !== "all") {
      try {
        // Get all candidate IDs that have calls
        const { data: callsData, error: callsError } = await supabase
          .from("candidate_calls")
          .select("candidate_id")
          .not("candidate_id", "is", null);

        if (callsError) {
          console.error("Error fetching candidate calls for filter:", callsError);
        } else {
          const candidateIdsWithCalls = new Set(
            (callsData || [])
              .map((call: any) => call.candidate_id)
              .filter((id): id is number => id !== null && id !== undefined && typeof id === 'number')
              .map((id) => Number(id))
          );

          if (hasCallSummaryFilter === "true") {
            // Filter for candidates that have calls
            if (candidateIdsWithCalls.size > 0) {
              // If we already have communication filter IDs, intersect them
              if (communicationFilteredIds !== null && communicationFilteredIds.length > 0) {
                const filteredIds = communicationFilteredIds.filter((id) => candidateIdsWithCalls.has(id));
                if (filteredIds.length > 0) {
                  query = query.in("id", filteredIds);
                } else {
                  return NextResponse.json({
                    data: [],
                    count: 0,
                    page,
                    pageSize,
                    totalPages: 0,
                  });
                }
              } else {
                query = query.in("id", Array.from(candidateIdsWithCalls));
              }
              console.log("[Call Summary Filter] Filtering for candidates with call summary");
            } else {
              // No candidates have calls, return empty result
              return NextResponse.json({
                data: [],
                count: 0,
                page,
                pageSize,
                totalPages: 0,
              });
            }
          } else if (hasCallSummaryFilter === "false") {
            // Filter for candidates that don't have calls
            // Since Supabase doesn't support NOT IN easily, we'll get all candidate IDs
            // and filter out those with calls, then apply to query
            if (candidateIdsWithCalls.size > 0) {
              // If we have communication filter IDs, intersect and exclude those with calls
              if (communicationFilteredIds !== null && communicationFilteredIds.length > 0) {
                const filteredIds = communicationFilteredIds.filter((id) => !candidateIdsWithCalls.has(id));
                if (filteredIds.length > 0) {
                  query = query.in("id", filteredIds);
                  console.log("[Call Summary Filter] Filtering for candidates without call summary (with communication filters)");
                } else {
                  return NextResponse.json({
                    data: [],
                    count: 0,
                    page,
                    pageSize,
                    totalPages: 0,
                  });
                }
              } else {
                // Get all candidate IDs first (before other filters are applied)
                // This is a workaround for NOT IN limitation
                const { data: allCandidates } = await supabase
                  .from("candidates")
                  .select("id");
                
                if (allCandidates) {
                  const allCandidateIds = allCandidates.map((c: any) => c.id);
                  const candidateIdsWithoutCalls = allCandidateIds.filter(
                    (id: number) => !candidateIdsWithCalls.has(id)
                  );
                  
                  if (candidateIdsWithoutCalls.length > 0) {
                    query = query.in("id", candidateIdsWithoutCalls);
                    console.log("[Call Summary Filter] Filtering for candidates without call summary");
                  } else {
                    return NextResponse.json({
                      data: [],
                      count: 0,
                      page,
                      pageSize,
                      totalPages: 0,
                    });
                  }
                }
              }
            } else {
              // No candidates have calls, so all candidates pass the filter
              console.log("[Call Summary Filter] No candidates have calls, showing all");
            }
          }
        }
      } catch (error) {
        console.error("Error applying call summary filter:", error);
        // Continue without the filter if there's an error
      }
    }

    // Apply sorting and pagination
    query = query.order("created_at", { ascending: false });
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching candidates:", error);
      return NextResponse.json({ error: "Failed to fetch candidates" }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    });

  } catch (error) {
    console.error("Error in candidates API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Basic validation
    if (!body.full_name || !body.email) {
      return NextResponse.json(
        { error: "Full name and email are required" },
        { status: 400 }
      );
    }

    // Prepare candidate data for insertion
    const candidateData: any = {
      full_name: body.full_name || null,
      email: body.email || null,
      phone_number: body.phone_number || null,
      general_location: body.general_location || null,
      zip_code: body.zip_code || null,
      headline: body.headline || null,
      position: body.position || null,
      current_title: body.current_title || null,
      current_company: body.current_company || null,
      current_position_start_date: body.current_position_start_date || null,
      current_stage: body.current_stage || null,
      recruiter: body.recruiter || null,
      education_degree: body.education_degree || null,
      education_institution: body.education_institution || null,
      minimum_salary: body.minimum_salary || null,
      maximum_salary: body.maximum_salary || null,
      currency_code: body.currency_code || null,
      compensation_period: body.compensation_period || null,
      profile_url: body.profile_url || null,
      meeting_date: body.meeting_date || null,
      interviewer_email: body.interviewer_email || null,
      meeting_link: body.meeting_link || null,
      screening_questions: body.screening_questions || null,
      date_applied: body.date_applied || null,
    };

    const { data: candidate, error } = await supabase
      .from('candidates')
      .insert(candidateData)
      .select()
      .single();

    if (error) {
      console.error('Error creating candidate:', error);
      return NextResponse.json(
        { error: 'Failed to create candidate', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: candidate }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/candidates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}