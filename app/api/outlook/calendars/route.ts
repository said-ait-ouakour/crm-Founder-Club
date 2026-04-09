import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ensureAccessToken,
  fetchCalendars,
  getOutlookConfig,
  getOutlookConnection,
  OutlookMailboxNotSupportedError,
} from '@/lib/outlook'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('[Outlook Calendars] Failed to load user session:', userError)
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
      console.error('[Outlook Calendars] Failed to load user profile:', profileError)
      return NextResponse.json({ error: 'Unable to load profile' }, { status: 500 })
    }

    if (!profile || !['advisor', 'manager', 'recruiter'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const connection = await getOutlookConnection(user.id)

    if (!connection) {
      return NextResponse.json(
        { error: 'No Outlook connection configured', connected: false },
        { status: 404 }
      )
    }

    const { tenantId, clientId, clientSecret } = getOutlookConfig()
    const { accessToken } = await ensureAccessToken(connection, tenantId, clientId, clientSecret)
    let calendars
    try {
      calendars = await fetchCalendars(accessToken)
    } catch (calendarsError) {
      if (calendarsError instanceof OutlookMailboxNotSupportedError) {
        return NextResponse.json({
          connected: true,
          primaryCalendarId: connection.primary_calendar_id,
          calendars: [],
          error: calendarsError.message,
        })
      }
      throw calendarsError
    }

    return NextResponse.json({
      connected: true,
      primaryCalendarId: connection.primary_calendar_id,
      calendars,
    })
  } catch (error) {
    console.error('[Outlook Calendars] Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to load calendars' }, { status: 500 })
  }
}

