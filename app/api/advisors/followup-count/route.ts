import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

async function handleFollowupCountRequest(request: NextRequest, body?: { fromDate?: string; toDate?: string; date?: string; userId?: string }) {
  try {
    // Support both GET (query params) and POST (body) for date ranges
    let fromDate: string;
    let toDate: string;
    let userId: string | null = null;

    if (request.method === 'POST' && body) {
      // POST request - get from body
      fromDate = body.fromDate || body.date || '';
      toDate = body.toDate || body.date || '';
      userId = body.userId || null;
    } else {
      // GET request - get from query params (backward compatibility)
      const { searchParams } = new URL(request.url);
      const date = searchParams.get('date');
      fromDate = searchParams.get('fromDate') || date || '';
      toDate = searchParams.get('toDate') || date || '';
      userId = searchParams.get('userId');
    }

    if (!fromDate || !toDate) {
      return NextResponse.json({ error: 'Date or date range parameters are required' }, { status: 400 });
    }

    // Pass cookies function directly - createRouteHandlerClient will await it internally
    const supabase = createRouteHandlerClient({ cookies: () => cookies() });

    // Get users to process (either single user or all users)
    let usersToProcess: any[] = [];
    
    if (userId) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, user_id, fullname')
        .eq('user_id', userId)
        .single();

      if (userError || !userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      // Normalize fullname to fullName for consistency
      if (!userData.fullName && (userData as any).fullname) {
        (userData as any).fullName = (userData as any).fullname;
      }
      usersToProcess = [userData];
    } else {
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, user_id, fullname');
      // Normalize fullname to fullName for consistency
      usersToProcess = (allUsers || []).map((user: any) => {
        if (!user.fullName && user.fullname) {
          user.fullName = user.fullname;
        }
        return user;
      });
    }

    const followupCounts: { [userId: string]: { newLeadsFollowup: number; followedUpLeadsToday: number; newCalls: number } } = {};

    // Process each user
    for (const user of usersToProcess) {
      // Get all calls made by this advisor (all time) - no filter by assigned leads
      const { data: allCallsByAdvisor, error: allCallsError } = await supabase
        .from('calls')
        .select('lead_id, created_at')
        .ilike('advisor_name', user.fullName || '');

      if (allCallsError) {
        console.error(`Error fetching all calls for advisor ${user.fullName}:`, allCallsError);
        continue;
      }

      // Parse date range
      const fromDateParts = fromDate.split('-');
      const toDateParts = toDate.split('-');
      const startDate = new Date(Date.UTC(parseInt(fromDateParts[0]), parseInt(fromDateParts[1]) - 1, parseInt(fromDateParts[2]), 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(parseInt(toDateParts[0]), parseInt(toDateParts[1]) - 1, parseInt(toDateParts[2]), 23, 59, 59, 999));

      // Get calls made in the specified date range
      const { data: callsInRange, error: dateCallsError } = await supabase
        .from('calls')
        .select('lead_id, created_at')
        .ilike('advisor_name', user.fullName || '')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (dateCallsError) {
        console.error(`Error fetching calls in date range for advisor ${user.fullName}:`, dateCallsError);
        continue;
      }

      const callsInRangeList = callsInRange || [];
      const allCallsList = allCallsByAdvisor || [];
      
      // Count followed up leads in range: unique leads that were called in the date range
      const followedUpLeadsInRange = new Set(callsInRangeList.map((call: any) => call.lead_id));

      // Count new leads followed up in range: leads that received their first call within the date range
      const newLeadsFollowedUpInRange = new Set<string>();
      
      // Count new calls: first-time calls within the date range
      const newCallsSet = new Set<string>();

      for (const call of callsInRangeList) {
        // Get all calls to this lead (all time)
        const callsToThisLead = allCallsList.filter(
          (c: any) => c.lead_id === call.lead_id
        );
        
        if (callsToThisLead.length === 0) continue;
        
        // Find the earliest call to this lead
        const earliestCall = callsToThisLead.reduce((earliest: any, current: any) => {
          const earliestTime = new Date(earliest.created_at).getTime();
          const currentTime = new Date(current.created_at).getTime();
          return currentTime < earliestTime ? current : earliest;
        }, callsToThisLead[0]);

        // If the earliest call to this lead is within the date range, it's a new lead followed up
        if (earliestCall) {
          const earliestCallDate = new Date(earliestCall.created_at);
          if (earliestCallDate >= startDate && earliestCallDate <= endDate) {
            newLeadsFollowedUpInRange.add(call.lead_id);
            newCallsSet.add(call.lead_id);
          }
        }
      }

      // Always use user.id (database primary key) as the key to match with dashboard lookup
      followupCounts[user.id] = {
        newLeadsFollowup: newLeadsFollowedUpInRange.size,
        followedUpLeadsToday: followedUpLeadsInRange.size,
        newCalls: newCallsSet.size
      };
    }

    // For backward compatibility, also return the old format
    const legacyFollowupCounts: { [userId: string]: number } = {};
    Object.keys(followupCounts).forEach((key) => {
      legacyFollowupCounts[key] = followupCounts[key].newCalls;
    });

    return NextResponse.json({ 
      followupCounts: legacyFollowupCounts,
      newLeadsFollowup: Object.keys(followupCounts).reduce((acc, key) => {
        acc[key] = followupCounts[key].newLeadsFollowup;
        return acc;
      }, {} as { [key: string]: number }),
      followedUpLeadsToday: Object.keys(followupCounts).reduce((acc, key) => {
        acc[key] = followupCounts[key].followedUpLeadsToday;
        return acc;
      }, {} as { [key: string]: number }),
      newCalls: Object.keys(followupCounts).reduce((acc, key) => {
        acc[key] = followupCounts[key].newCalls;
        return acc;
      }, {} as { [key: string]: number }),
      detailedCounts: followupCounts,
      fromDate,
      toDate,
      date: fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`, // Backward compatibility
      totalAdvisors: Object.keys(followupCounts).length
    });

  } catch (error) {
    console.error('Error in follow-up count API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleFollowupCountRequest(request);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return handleFollowupCountRequest(request, body);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
