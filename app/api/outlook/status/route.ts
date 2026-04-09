import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ensureAccessToken,
  fetchCalendars,
  getOutlookConfig,
  getOutlookConnection,
} from '@/lib/outlook'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('[Outlook Status] Failed to load user session:', userError)
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
      console.error('[Outlook Status] Failed to load user profile:', profileError)
      return NextResponse.json({ error: 'Unable to load profile' }, { status: 500 })
    }

    if (!profile || !['advisor', 'manager', 'recruiter'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const connection = await getOutlookConnection(user.id)

    if (!connection) {
      return NextResponse.json({ connected: false })
    }

    let primaryCalendarName: string | null = null
    let tokenExpiresAt = connection.token_expires_at

    if (connection.primary_calendar_id) {
      try {
        const { tenantId, clientId, clientSecret } = getOutlookConfig()
        const { accessToken, updatedConnection } = await ensureAccessToken(
          connection,
          tenantId,
          clientId,
          clientSecret
        )

        if (updatedConnection?.token_expires_at) {
          tokenExpiresAt = updatedConnection.token_expires_at
        }

        const calendars = await fetchCalendars(accessToken)
        primaryCalendarName =
          calendars.find((calendar) => calendar.id === connection.primary_calendar_id)?.name ?? null
      } catch (error) {
        console.warn('[Outlook Status] Unable to load calendar name:', error)
      }
    }

    return NextResponse.json({
      connected: true,
      connectionId: connection.id,
      connectedAt: connection.connected_at,
      primaryCalendarId: connection.primary_calendar_id,
      primaryCalendarName,
      tokenExpiresAt,
      needsCalendarSelection: !connection.primary_calendar_id,
    })
  } catch (error) {
    console.error('[Outlook Status] Unexpected error:', error)
    return NextResponse.json({ error: 'Unexpected error fetching status' }, { status: 500 })
  }
}

