import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getAuthorizationScopes,
  getOutlookConfig,
  upsertOutlookConnection,
} from '@/lib/outlook'

function buildRedirectResponse(request: NextRequest, status: 'success' | 'error', reason?: string) {
  // Always redirect back to the calendar page so the client can show
  // a success or error toast and keep the user in the calendar flow.
  const basePath = '/calendar'
  const redirectUrl = new URL(basePath, request.url)
  redirectUrl.searchParams.set('outlook', status)

  if (reason) {
    redirectUrl.searchParams.set('reason', reason)
  }

  // Sanitize port for forwarded dev environments (e.g., GitHub.dev / Codespaces)
  // Those environments sometimes present a host like
  // `...-3000.app.github.dev:3000` which results in an ugly or incorrect
  // redirect URL. If we detect the app.github.dev host, strip the explicit
  // port so the public forwarded hostname is used.
  try {
    if (redirectUrl.hostname.endsWith('.app.github.dev') && redirectUrl.port) {
      redirectUrl.port = ''
    }
  } catch (e) {
    // ignore URL manipulation errors
  }

  return NextResponse.redirect(redirectUrl)
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  const stateCookie = request.cookies.get('outlook_oauth_state')?.value
  const codeVerifier = request.cookies.get('outlook_code_verifier')?.value
  const attemptedUser = request.cookies.get('outlook_user')?.value

  const clearAuthCookies = (response: NextResponse) => {
    response.cookies.delete('outlook_oauth_state')
    response.cookies.delete('outlook_code_verifier')
    response.cookies.delete('outlook_user')
  }

  if (oauthError) {
    const response = buildRedirectResponse(request, 'error', oauthError)
    clearAuthCookies(response)
    return response
  }

  if (!code || !state || !stateCookie || state !== stateCookie || !codeVerifier) {
    const response = buildRedirectResponse(request, 'error', 'invalid_state')
    clearAuthCookies(response)
    return response
  }

  try {
    const { clientId, clientSecret, tenantId, redirectUri } = getOutlookConfig()

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: getAuthorizationScopes(),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
    })

    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    if (!tokenResponse.ok) {
      const responseText = await tokenResponse.text()
      console.error('[Outlook Callback] Token exchange failed:', responseText)
      const response = buildRedirectResponse(request, 'error', 'token_exchange_failed')
      clearAuthCookies(response)
      return response
    }

    const tokens = await tokenResponse.json()
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('[Outlook Callback] Failed to load user session:', userError)
      const response = buildRedirectResponse(request, 'error', 'session_error')
      clearAuthCookies(response)
      return response
    }

    if (!user || (attemptedUser && attemptedUser !== user.id)) {
      const response = buildRedirectResponse(request, 'error', 'unauthorized')
      clearAuthCookies(response)
      return response
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('[Outlook Callback] Failed to load user profile:', profileError)
      const response = buildRedirectResponse(request, 'error', 'profile_error')
      clearAuthCookies(response)
      return response
    }

    if (!['advisor', 'manager'].includes(profile.role)) {
      const response = buildRedirectResponse(request, 'error', 'forbidden')
      clearAuthCookies(response)
      return response
    }

    await upsertOutlookConnection(user.id, tokens)

    const response = buildRedirectResponse(request, 'success')
    clearAuthCookies(response)
    return response
  } catch (error) {
    console.error('[Outlook Callback] Unexpected error:', error)
    const response = buildRedirectResponse(request, 'error', 'unexpected')
    clearAuthCookies(response)
    return response
  }
}

