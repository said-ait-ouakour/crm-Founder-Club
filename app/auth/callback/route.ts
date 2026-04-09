import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'

  if (code) {
    try {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(key: string) {
              return cookieStore.get(key)?.value
            },
            set(key: string, value: string, options: any) {
              cookieStore.set({ name: key, value, ...options })
            },
            remove(key: string, options: any) {
              cookieStore.set({ name: key, value: '', ...options })
            },
          },
        }
      )
      
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        console.error('Error exchanging code for session:', error)
        return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=Auth Error`)
      }

      // Refresh the session to get a new session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=No session`)
      }

      // Set the auth cookie manually
      const response = NextResponse.redirect(`${requestUrl.origin}${next}`)
      
      // Set the session token cookie
      response.cookies.set({
        name: 'sb-access-token',
        value: session.access_token,
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
      
      return response
    } catch (error) {
      console.error('Error in auth callback:', error)
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=Server Error`)
    }
  }

  // If no code, redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/auth/login`)
}
