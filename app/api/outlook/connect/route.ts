import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createPkcePair, getAuthorizationScopes, getOutlookConfig } from '@/lib/outlook'

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('[Outlook Connect] Failed to retrieve user:', userError)
      return NextResponse.json({ error: 'Unable to verify user session' }, { status: 500 })
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
      console.error('[Outlook Connect] Failed to load user profile:', profileError)
      return NextResponse.json({ error: 'Unable to load user profile' }, { status: 500 })
    }

    // Recruiters use shared calendar, they cannot connect their own Outlook
    if (!profile || !['advisor', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { clientId, tenantId, redirectUri } = getOutlookConfig()
    const state = crypto.randomUUID()
    const { codeVerifier, codeChallenge } = createPkcePair()

    const authorizationUrl = new URL(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`
    )

    authorizationUrl.searchParams.set('client_id', clientId)
    authorizationUrl.searchParams.set('response_type', 'code')
    authorizationUrl.searchParams.set('redirect_uri', redirectUri)
    authorizationUrl.searchParams.set('response_mode', 'query')
    authorizationUrl.searchParams.set('scope', getAuthorizationScopes())
    authorizationUrl.searchParams.set('state', state)
    authorizationUrl.searchParams.set('prompt', 'select_account')
    authorizationUrl.searchParams.set('code_challenge', codeChallenge)
    authorizationUrl.searchParams.set('code_challenge_method', 'S256')

    const response = NextResponse.json({ authorizationUrl: authorizationUrl.toString() })
    const isProduction = process.env.NODE_ENV === 'production'

    response.cookies.set('outlook_oauth_state', state, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    })

    response.cookies.set('outlook_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    })

    response.cookies.set('outlook_user', user.id, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[Outlook Connect] Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to initialize Outlook connection' }, { status: 500 })
  }
}

