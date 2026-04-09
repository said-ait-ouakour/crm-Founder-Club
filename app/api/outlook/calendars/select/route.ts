import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ensureAccessToken,
  fetchCalendars,
  getOutlookConfig,
  getOutlookConnection,
  OutlookMailboxNotSupportedError,
  updatePrimaryCalendar,
} from '@/lib/outlook'

type SelectCalendarRequest = {
  calendarId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SelectCalendarRequest

    if (!body?.calendarId) {
      return NextResponse.json({ error: 'calendarId is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('[Outlook Select Calendar] Failed to load user session:', userError)
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
      console.error('[Outlook Select Calendar] Failed to load user profile:', profileError)
      return NextResponse.json({ error: 'Unable to load profile' }, { status: 500 })
    }

    // Recruiters use shared calendar, they cannot select their own calendar
    if (!profile || !['advisor', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const connection = await getOutlookConnection(user.id)

    if (!connection) {
      return NextResponse.json({ error: 'No Outlook connection found' }, { status: 404 })
    }

    // Verify the selected calendar exists for the user
    try {
      const { tenantId, clientId, clientSecret } = getOutlookConfig()
      const { accessToken } = await ensureAccessToken(connection, tenantId, clientId, clientSecret)
      const calendars = await fetchCalendars(accessToken)
      const selectedCalendar = calendars.find((calendar) => calendar.id === body.calendarId)

      if (!selectedCalendar) {
        return NextResponse.json({ error: 'Selected calendar does not exist' }, { status: 400 })
      }
    } catch (verificationError) {
      if (verificationError instanceof OutlookMailboxNotSupportedError) {
        return NextResponse.json({ error: verificationError.message }, { status: 400 })
      }
      console.warn('[Outlook Select Calendar] Calendar verification failed:', verificationError)
      return NextResponse.json({ error: 'Unable to verify calendar selection' }, { status: 502 })
    }

    await updatePrimaryCalendar(user.id, body.calendarId)

    return NextResponse.json({ success: true, primaryCalendarId: body.calendarId })
  } catch (error) {
    console.error('[Outlook Select Calendar] Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to save calendar selection' }, { status: 500 })
  }
}

