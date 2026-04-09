import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { HubstaffService } from '@/lib/hubstaff';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Support both single date (backward compatibility) and date range
    const date = searchParams.get('date');
    const fromDate = searchParams.get('fromDate') || date || new Date().toISOString().split('T')[0];
    const toDate = searchParams.get('toDate') || date || new Date().toISOString().split('T')[0];
    const userId = searchParams.get('userId'); // Database user ID (UUID)
    const hubstaffUserId = searchParams.get('hubstaffUserId'); // Hubstaff user ID (optional, if provided directly)
    
    // Pass cookies function directly - createRouteHandlerClient will await it internally
    const supabase = createRouteHandlerClient({ cookies: () => cookies() });
    
    let hubstaffId: number | null = null;
    
    // If hubstaffUserId is provided directly, use it
    if (hubstaffUserId) {
      hubstaffId = parseInt(hubstaffUserId, 10);
    } else if (userId) {
      // Otherwise, fetch from database using userId (UUID)
      const { data: userData, error } = await supabase
        .from('users')
        .select('hubstaff_id')
        .eq('user_id', userId)
        .single();
      
      if (error || !userData?.hubstaff_id) {
        return NextResponse.json({ 
          error: 'User not found or does not have Hubstaff ID',
          screenshots: [] 
        }, { status: 404 });
      }
      
      hubstaffId = userData.hubstaff_id;
    } else {
      return NextResponse.json({ 
        error: 'Either userId or hubstaffUserId is required',
        screenshots: [] 
      }, { status: 400 });
    }

    if (!hubstaffId) {
      return NextResponse.json({ 
        error: 'Hubstaff ID not found',
        screenshots: [] 
      }, { status: 404 });
    }

    // Get screenshots for the date range
    // If fromDate and toDate are the same, it's a single day
    // Otherwise, fetch screenshots for the entire range
    try {
      const screenshots = await HubstaffService.getUserScreenshots(
        hubstaffId,
        fromDate,
        toDate
      );

      return NextResponse.json({ 
        screenshots,
        fromDate,
        toDate,
        date: fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`, // Backward compatibility
        hubstaffUserId: hubstaffId,
        count: screenshots.length
      });
    } catch (error) {
      console.error('Error fetching screenshots:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Return error details but with empty screenshots array to prevent breaking the UI
      return NextResponse.json({ 
        screenshots: [],
        fromDate,
        toDate,
        date: fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`,
        hubstaffUserId: hubstaffId,
        count: 0,
        error: errorMessage
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in screenshots API route:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      screenshots: [] 
    }, { status: 500 });
  }
}

