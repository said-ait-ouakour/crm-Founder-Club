import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { RingCentralService } from '@/lib/ringcentral';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createServiceClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables are not configured.');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Use service role so managers can fetch calls for any advisor regardless of RLS
    const supabase = createServiceClient();
    
    // Get user with ringcentral_id
    const { data: user, error } = await supabase
      .from('users')
      .select('id, fullname, email, ringcentral_id')
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.error('Error fetching user:', error);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.ringcentral_id) {
      return NextResponse.json({ error: 'User does not have RingCentral ID configured' }, { status: 400 });
    }

    // Fetch RingCentral calls
    const calls = await RingCentralService.getUserCalls(
      user.ringcentral_id,
      date,
      new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      user.fullname
    );
    
    const callSummary = RingCentralService.calculateDailyCallSummary(calls);
    const callsByResult = RingCentralService.getCallsByResult(calls);
    const callsByResultAndDirection = RingCentralService.getCallsByResultAndDirection(calls);

    return NextResponse.json({ 
      user: {
        id: user.id,
        fullName: user.fullname,
        email: user.email
      },
      calls,
      callSummary,
      callsByResult,
      callsByResultAndDirection,
      date
    });
  } catch (error) {
    console.error('Error in RingCentral calls API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
