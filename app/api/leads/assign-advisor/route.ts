import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { leadService } from '@/lib/database';

export async function POST(request: Request) {
  try {
    const { advisorId, leadIds } = await request.json();

    if (!advisorId || !leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'Advisor ID and lead IDs are required' },
        { status: 400 }
      );
    }

    // Create a Supabase client with the cookies
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    // if (sessionError || !session) {
    //   console.error('Session error:', sessionError);
    //   return NextResponse.json(
    //     { error: 'Not authenticated. Please sign in again.' },
    //     { status: 401 }
    //   );
    // }

    // Update the user_leads join table with the new assignments
    try {
      const result = await leadService.bulkAssignAdvisor(leadIds, advisorId);
      
      if (!result || result.length === 0) {
        throw new Error('No leads were updated');
      }

      return NextResponse.json({
        success: true,
        count: result.length,
        updatedAssignments: result.map(r => ({
          leadId: r.lead_id,
          advisorId: r.user_id,
          lead: r.leads
        }))
      });
    } catch (error) {
      console.error('Error in bulkAssignAdvisor:', error);
      throw error; // This will be caught by the outer try-catch
    }

  } catch (error) {
    console.error('Error assigning advisor to leads:', error);
    return NextResponse.json(
      { error: 'Failed to assign advisor to leads' },
      { status: 500 }
    );
  }
}