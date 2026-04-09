'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type LoginResult = {
  ok: boolean;
  error?: string;
  role?: string | null;
};

export async function login(formData: FormData): Promise<LoginResult> {
  const supabase = await createClient()

  const email = (formData.get('email') as string) || ''
  const password = (formData.get('password') as string) || ''

  if (!email || !password) {
    return { ok: false, error: 'Email and password are required.' }
  }

  const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // If user is banned, return generic error message instead of revealing the ban
    if (error.message?.toLowerCase().includes('banned') || error.message?.toLowerCase().includes('user is banned')) {
      return { ok: false, error: 'Your credentials are not correct. Please try again.' }
    }
    return { ok: false, error: 'Your credentials are not correct. Please try again.' }
  }

  // Double-check we have a session
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !sessionData.session) {
    return { ok: false, error: 'Authentication failed. No session created.' }
  }

  // Add a small delay to ensure session is properly set
  await new Promise(resolve => setTimeout(resolve, 100))

  let role: string | null = null
  const userId = sessionData.session.user.id

  if (userId) {
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      console.error('[login] Failed to load user role during login:', profileError)
    } else {
      role = profile?.role ?? null
    }
  }

  revalidatePath('/', 'layout')
  return { ok: true, role }
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    return { ok: false, error: 'Could not create account' }
  }

  revalidatePath('/', 'layout')
  return { ok: true, message: 'Check your email to confirm your account' }
}
