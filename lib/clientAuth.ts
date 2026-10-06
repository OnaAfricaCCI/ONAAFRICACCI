import { createBrowserSupabase } from './supabase/browser'

/**
 * Shared client sign-in / create-account logic, used by the dialog, the inline
 * account gate and the sign-in page so they behave identically.
 *
 * Create: POST /api/auth/signup (server makes a confirmed account — no email),
 * then sign in with the password to establish the browser session.
 * Sign in: just signInWithPassword.
 */
export type AuthResult = { ok: true } | { ok: false; error: string; switchToSignin?: boolean }

export async function createAccount(email: string, password: string): Promise<AuthResult> {
  let res: Response
  try {
    res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch {
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
  if (res.status === 409) {
    return { ok: false, error: 'That email already has an account. Enter your password to sign in.', switchToSignin: true }
  }
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    return { ok: false, error: (d as { error?: string }).error || 'Could not create your account. Please try again.' }
  }
  return signIn(email, password)
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const supabase = createBrowserSupabase()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.session) {
      return { ok: false, error: 'That email and password don’t match. Try again, or create an account.' }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}
