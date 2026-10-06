import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { rateLimited, readJson, tooLarge, tooMany } from '@/lib/guard'

/**
 * Create an account, server-side, already confirmed — so there is NO email
 * confirmation step and the person is signed in immediately afterwards (the
 * browser then calls signInWithPassword to get the session).
 *
 * This deliberately does not verify email ownership at sign-up: browsing,
 * saving and building a profile carry nothing sensitive, so an email round-trip
 * would be friction for no benefit. The one place verification would matter —
 * the branded confirmation email — is handled separately.
 */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const MIN_PW = 8

export async function POST(req: Request) {
  if (rateLimited(req, 15)) return tooMany()
  const body = await readJson(req, 2000)
  if (body === null) return tooLarge()

  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (password.length < MIN_PW || password.length > 200) {
    return NextResponse.json({ error: `Your password needs at least ${MIN_PW} characters.` }, { status: 400 })
  }

  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // mark the address confirmed — no email, instant access
  })

  if (error) {
    const msg = error.message || ''
    if (/already|exists|registered|duplicate/i.test(msg)) {
      return NextResponse.json({ error: 'already-registered' }, { status: 409 })
    }
    if (/password/i.test(msg)) {
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    console.error('signup failed:', msg)
    return NextResponse.json({ error: 'Could not create your account. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
