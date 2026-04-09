import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteOutlookConnection } from '@/lib/outlook'

export async function DELETE(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('[Outlook Disconnect] Failed to load user session:', userError)
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
      console.error('[Outlook Disconnect] Failed to load user profile:', profileError)
      return NextResponse.json({ error: 'Unable to load user profile' }, { status: 500 })
    }

    // Recruiters use shared calendar, they cannot disconnect their own Outlook
    if (!profile || !['advisor', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deleteOutlookConnection(user.id)

    const response = NextResponse.json({ success: true })
    response.cookies.delete('outlook_oauth_state')
    response.cookies.delete('outlook_code_verifier')
    response.cookies.delete('outlook_user')

    return response
  } catch (error) {
    console.error('[Outlook Disconnect] Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to disconnect Outlook' }, { status: 500 })
  }
}

