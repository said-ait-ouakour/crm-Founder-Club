import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ensureAccessToken,
  createOutlookEvent,
  getOutlookConfig,
  getOutlookConnection,
  type CreateOutlookEventParams,
} from '@/lib/outlook'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('[Outlook Create Event] Failed to load user session:', userError)
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
      console.error('[Outlook Create Event] Failed to load user profile:', profileError)
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

    if (!connection.primary_calendar_id) {
      return NextResponse.json(
        { error: 'No primary calendar selected. Please select a calendar first.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { subject, start, end, body: eventBody, location, attendees } = body

    if (!subject || !start || !end) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, start, end' },
        { status: 400 }
      )
    }

    const { tenantId, clientId, clientSecret } = getOutlookConfig()
    const { accessToken } = await ensureAccessToken(connection, tenantId, clientId, clientSecret)

    const eventData: CreateOutlookEventParams = {
      subject,
      start: new Date(start),
      end: new Date(end),
      body: eventBody,
      location,
      attendees,
    }

    const event = await createOutlookEvent(accessToken, connection.primary_calendar_id, eventData)

    return NextResponse.json({ event, success: true })
  } catch (error) {
    console.error('[Outlook Create Event] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create calendar event' },
      { status: 500 }
    )
  }
}

