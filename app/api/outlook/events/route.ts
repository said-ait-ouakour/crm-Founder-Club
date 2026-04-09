import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ensureAccessToken,
  fetchCalendarEvents,
  getOutlookConfig,
  getOutlookConnection,
  OutlookMailboxNotSupportedError,
} from '@/lib/outlook'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('[Outlook Events] Failed to load user session:', userError)
      return NextResponse.json({ error: 'Failed to verify session' }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('[Outlook Events] Failed to load user profile:', profileError)
      return NextResponse.json({ error: 'Unable to load profile' }, { status: 500 })
    }

    if (!profile || !['advisor', 'manager', 'recruiter'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get advisorUserId from query params if admin is viewing another advisor's calendar
    const { searchParams } = new URL(request.url)
    const advisorUserId = searchParams.get('advisorUserId')
    
    // Determine which user's calendar to fetch (unified demo: everyone sees same calendar)
    let targetUserId = user.id
    if (advisorUserId && profile.role === 'manager') {
      // Admin can view advisor's calendar - use the selected advisor's ID
      targetUserId = advisorUserId
      console.log('[Outlook Events API] Admin viewing advisor calendar:', {
        adminUserId: user.id,
        advisorUserId: advisorUserId,
        targetUserId: targetUserId
      })
    } else {
      console.log('[Outlook Events API] Fetching calendar:', {
        userId: user.id,
        role: profile.role,
        isRecruiter: profile.role === 'recruiter'
      })
    }

    // Unified demo: getOutlookConnection always returns the shared calendar (Terry's)
    const connection = await getOutlookConnection(targetUserId)
    
    console.log('[Outlook Events API] Outlook connection check:', {
      targetUserId: targetUserId,
      hasConnection: !!connection,
      connectionUserId: connection?.user_id || 'none',
      primaryCalendarId: connection?.primary_calendar_id || 'none',
      userRole: profile.role,
      isRecruiter: profile.role === 'recruiter'
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'No Outlook connection configured', connected: false },
        { status: 404 }
      )
    }

    // Unified demo calendar: all users share the same connection; no per-user verification

    if (!connection.primary_calendar_id) {
      return NextResponse.json({ events: [] })
    }

    // Get date range from query parameters (searchParams already defined above)
    const startDateParam = searchParams.get('start')
    const endDateParam = searchParams.get('end')

    if (!startDateParam || !endDateParam) {
      return NextResponse.json({ error: 'start and end date parameters are required' }, { status: 400 })
    }

    const startDate = new Date(startDateParam)
    const endDate = new Date(endDateParam)
    
    // Ensure dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date parameters' }, { status: 400 })
    }
    
    console.log('[Outlook Events API] Fetching events:', {
      targetUserId: targetUserId,
      advisorUserId: advisorUserId,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      calendarId: connection.primary_calendar_id,
    })

    const { tenantId, clientId, clientSecret } = getOutlookConfig()
    const { accessToken } = await ensureAccessToken(connection, tenantId, clientId, clientSecret)
    
    console.log('[Outlook Events API] About to fetch events:', {
      targetUserId: targetUserId,
      advisorUserId: advisorUserId,
      calendarId: connection.primary_calendar_id,
      connectionUserId: connection.user_id,
      accessTokenLength: accessToken?.length || 0
    })

    let events
    try {
      events = await fetchCalendarEvents(accessToken, connection.primary_calendar_id, startDate, endDate)
    } catch (eventsError) {
      if (eventsError instanceof OutlookMailboxNotSupportedError) {
        return NextResponse.json({
          events: [],
          mailboxNotSupported: true,
          error: eventsError.message,
        })
      }
      throw eventsError
    }
    
    // Try to get advisor email from database to verify we're using the correct connection
    let advisorEmail = null;
    try {
      const { data: advisorData } = await supabase
        .from('users')
        .select('email, fullname')
        .eq('user_id', targetUserId)
        .maybeSingle();
      
      advisorEmail = advisorData?.email || null;
      console.log('[Outlook Events API] Advisor info from database:', {
        targetUserId: targetUserId,
        advisorEmail: advisorEmail,
        advisorFullname: advisorData?.fullname
      });
    } catch (e) {
      console.error('[Outlook Events API] Error fetching advisor email:', e);
    }
    
    // Log organizers from first few events to verify we're getting different calendars
    const organizers = events.slice(0, 5).map(e => ({
      subject: e.subject,
      organizerEmail: e.organizer?.emailAddress?.address,
      organizerName: e.organizer?.emailAddress?.name
    }))
    
    // Check how many events have the advisor as organizer vs someone else
    const eventsWithAdvisorAsOrganizer = events.filter(e => 
      e.organizer?.emailAddress?.address?.toLowerCase() === advisorEmail?.toLowerCase()
    ).length;
    
    console.log('[Outlook Events API] Returning events:', {
      count: events.length,
      targetUserId: targetUserId,
      advisorUserId: advisorUserId,
      connectionUserId: connection.user_id,
      advisorEmail: advisorEmail,
      calendarId: connection.primary_calendar_id,
      eventsWithAdvisorAsOrganizer: eventsWithAdvisorAsOrganizer,
      eventsWithOtherOrganizers: events.length - eventsWithAdvisorAsOrganizer,
      organizers: organizers
    })

    // Include debug info in response to help diagnose connection issues
    return NextResponse.json({ 
      events,
      debug: {
        targetUserId: targetUserId,
        connectionUserId: connection.user_id,
        advisorEmail: advisorEmail,
        calendarId: connection.primary_calendar_id,
        eventsWithAdvisorAsOrganizer: eventsWithAdvisorAsOrganizer,
        eventsWithOtherOrganizers: events.length - eventsWithAdvisorAsOrganizer,
        sampleOrganizers: organizers
      }
    })
  } catch (error) {
    console.error('[Outlook Events] Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to load calendar events' }, { status: 500 })
  }
}

