import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { HubstaffService } from '@/lib/hubstaff';
import { RingCentralService } from '@/lib/ringcentral';

async function handleActivityRequest(request: NextRequest, body?: { fromDate?: string; toDate?: string; date?: string; userId?: string }) {
  try {
    // Support both GET (query params) and POST (body) for date ranges
    let fromDate: string;
    let toDate: string;
    let requestedUserId: string | null = null;

    if (request.method === 'POST' && body) {
      // POST request - get from body
      fromDate = body.fromDate || body.date || new Date().toISOString().split('T')[0];
      toDate = body.toDate || body.date || new Date().toISOString().split('T')[0];
      requestedUserId = body.userId || null;
    } else {
      // GET request - get from query params (backward compatibility)
      const { searchParams } = new URL(request.url);
      const date = searchParams.get('date');
      fromDate = searchParams.get('fromDate') || date || new Date().toISOString().split('T')[0];
      toDate = searchParams.get('toDate') || date || new Date().toISOString().split('T')[0];
      requestedUserId = searchParams.get('userId');
    }
    
    // Pass cookies function directly - createRouteHandlerClient will await it internally
    const supabase = createRouteHandlerClient({ cookies: () => cookies() });
    
    // Determine which users to fetch data for
    let users: any[] = [];
    if (requestedUserId) {
      // Fetch data for a specific user (advisor viewing their own data)
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, fullname, email, hubstaff_id, ringcentral_id, role, user_id')
        .eq('user_id', requestedUserId)
        .or('hubstaff_id.not.is.null,ringcentral_id.not.is.null')
        .single();
      
      if (error) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      // Normalize fullname to fullName for frontend consistency (if needed)
      if (userData && !userData.fullName && (userData as any).fullname) {
        (userData as any).fullName = (userData as any).fullname;
      }
      users = [userData];
    } else {
      // Fetch data for all users (manager viewing all data)
      const { data: allUsers, error } = await supabase
        .from('users')
        .select('id, fullname, email, hubstaff_id, ringcentral_id, role, user_id')
        .or('hubstaff_id.not.is.null,ringcentral_id.not.is.null')
        .order('fullname');
      
      if (error) {
        console.error('Error fetching users from database:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return NextResponse.json({ 
          error: 'Failed to fetch users',
          details: error.message || 'Database query failed'
        }, { status: 500 });
      }
      
      if (!allUsers) {
        console.warn('No users returned from database (null/undefined)');
        users = [];
      } else {
        // Normalize fullname to fullName for frontend consistency (if needed)
        users = allUsers.map((user: any) => {
          if (!user.fullName && user.fullname) {
            user.fullName = user.fullname;
          }
          return user;
        });
      }
    }

    const teamActivity: any[] = [];

    // Get access token once for all users to prevent multiple requests
    let accessToken: string | null = null;
    const usersWithHubstaff = users.filter(user => user.hubstaff_id);
    
    if (usersWithHubstaff.length > 0) {
      try {
        accessToken = await HubstaffService.getAccessToken();
      } catch (error) {
        // Continue without access token - will return empty data for Hubstaff
      }
    }

    // Batch fetch activities for all users with hubstaff_id in a single request
    let activitiesByUserId: { [userId: number]: any[] } = {};
    
    if (usersWithHubstaff.length > 0 && accessToken) {
      try {
        const hubstaffUserIds = usersWithHubstaff.map(user => user.hubstaff_id!);
        console.log(`Batch fetching Hubstaff activities for ${hubstaffUserIds.length} users: ${fromDate} to ${toDate}`);
        
        // Use batch method to fetch all users in one request
        activitiesByUserId = await HubstaffService.getMultipleUsersActivitiesWithToken(
          hubstaffUserIds,
          fromDate,
          toDate,
          accessToken
        );
        
        console.log(`Batch fetch completed. Activities retrieved for ${Object.keys(activitiesByUserId).length} users`);
      } catch (error) {
        console.error(`Error in batch fetching Hubstaff activities:`, error);
        console.error(`Date range: ${fromDate} to ${toDate}`);
        // Continue with empty activities - will show empty data for all users
      }
    }

    // Process each user and build team activity response
    for (const user of users) {
      try {
        let activities: any[] = [];
        let summary: any = HubstaffService.calculateDailySummary([]);
        let calls: any[] = [];
        let callSummary: any = RingCentralService.calculateDailyCallSummary([]);

        // Get Hubstaff activity from batch fetch results
        if (user.hubstaff_id && activitiesByUserId[user.hubstaff_id]) {
          activities = activitiesByUserId[user.hubstaff_id];
          // Calculate aggregated summary for the date range
          summary = HubstaffService.calculateDateRangeSummary(activities, fromDate, toDate);
          console.log(`Fetched ${activities.length} activities for ${user.fullName || user.fullname}`);
        }

        // RingCentral calls will be fetched on-demand via separate API endpoint
        // No automatic fetching to avoid rate limiting
        
        teamActivity.push({
          user,
          activities,
          summary,
          calls,
          callSummary
        });
      } catch (error) {
        console.error(`Error processing user ${user.fullName || user.fullname}:`, error);
        teamActivity.push({
          user,
          activities: [],
          summary: HubstaffService.calculateDailySummary([]),
          calls: [],
          callSummary: RingCentralService.calculateDailyCallSummary([])
        });
      }
    }

    return NextResponse.json({ 
      data: teamActivity,
      fromDate,
      toDate,
      date: fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`, // Backward compatibility
      totalUsers: teamActivity.length
    });
  } catch (error) {
    console.error('Error in handleActivityRequest:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error stack:', errorStack);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: errorMessage
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleActivityRequest(request);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return handleActivityRequest(request, body);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
