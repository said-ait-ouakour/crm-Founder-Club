import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { logAction, detectAction } from "@/lib/activity-logger";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  // Check if user is banned - check error messages and metadata
  if (userError) {
    const errorMsg = userError.message?.toLowerCase() || '';
    if (errorMsg.includes('banned') || errorMsg.includes('user is banned')) {
      // User is banned, sign them out and redirect to login
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }
  }

  // Check if user has banned_until in metadata (Supabase stores ban info here)
  if (user && (user.user_metadata?.banned_until || user.app_metadata?.banned_until)) {
    // User is banned, sign them out and redirect to login
    await supabase.auth.signOut()
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Log user actions (only if user is authenticated and not a GET request)
  const pathname = request.nextUrl.pathname
  const method = request.method
  if (user && method !== 'GET') {
    const skipPatterns = ['/_next', '/api/auth', '/api/cron', '/api/log-action', '/favicon.ico', '/public']
    const isExternalWebhook =
      pathname.startsWith('/api/webhook/') ||
      pathname.startsWith('/api/webhooks/') ||
      pathname.startsWith('/api/twilio/webhook') ||
      pathname.startsWith('/api/sendgrid/webhook') ||
      pathname.startsWith('/api/outlook/callback') ||
      pathname.includes('/callback')
    const shouldSkip = skipPatterns.some((pattern) => pathname.startsWith(pattern))
    const shouldLog = !shouldSkip && !isExternalWebhook
    if (shouldLog) {
      const action = detectAction(pathname, method)
      logAction({ user_id: user.id, endpoint: pathname, action }).catch((err: unknown) => {
        console.error('Logging failed:', err)
      })
    }
  }

  const isPublicPath = [
    '/auth/login',
    '/auth/signin',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/callback',
    '/auth/confirm',
    '/unauthorized',
    '/api',
  ].some(path => request.nextUrl.pathname.startsWith(path))

  // If public path, allow
  if (isPublicPath) {
    return supabaseResponse
  }

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api')
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Removed modules from People Manager: block direct access and redirect.
  if (
    request.nextUrl.pathname.startsWith('/factfinds') ||
    request.nextUrl.pathname.startsWith('/policies') ||
    request.nextUrl.pathname.startsWith('/withdrawal')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/contacts'
    return NextResponse.redirect(url)
  }

  // Deactivation (is_active) is enforced in AuthProvider when loading profile,
  // not here. Doing a DB query on every request was slowing responses and
  // contributing to token refresh races with multiple tabs.

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     * - api routes (handled separately)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}
