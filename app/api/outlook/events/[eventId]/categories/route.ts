import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ensureAccessToken,
  updateEventCategories,
  getOutlookConfig,
  getOutlookConnection,
} from '@/lib/outlook'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> | { eventId: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('[Outlook Update Categories] Failed to load user session:', userError)
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
      console.error('[Outlook Update Categories] Failed to load user profile:', profileError)
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

    const resolvedParams = 'then' in params ? await params : params
    const { eventId } = resolvedParams
    const body = await request.json()
    const { categories } = body

    if (!Array.isArray(categories)) {
      return NextResponse.json(
        { error: 'Categories must be an array' },
        { status: 400 }
      )
    }

    const { tenantId, clientId, clientSecret } = getOutlookConfig()
    const { accessToken } = await ensureAccessToken(connection, tenantId, clientId, clientSecret)
    const updatedEvent = await updateEventCategories(accessToken, eventId, categories)

    return NextResponse.json({ event: updatedEvent })
  } catch (error) {
    console.error('[Outlook Update Categories] Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to update event categories' }, { status: 500 })
  }
}

