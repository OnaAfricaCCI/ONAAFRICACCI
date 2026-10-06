'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserSupabase } from '@/lib/supabase/browser'

/**
 * Inline create-account / sign-in form shown on a signed-out account page. No
 * emailed link, no bounce to another page: email + password, and on success we
 * refresh the page so the real content (the wizard, the shortlist, …) appears
 * in place. Framed by `defaultMode` — 'create' for "Create my profile", 'signin'
 * for returning to saved/profile.
 */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const MIN_PW = 8

export default function AccountGate({
  defaultMode = 'signin',
}: {
  defaultMode?: 'create' | 'signin'
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'create' | 'signin'>(defaultMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    setMessage(''); setNotice('')
    if (!EMAIL_RE.test(value)) { setMessage('Please enter a valid email address.'); return }
    if (password.length < MIN_PW) { setMessage(`Your password needs at least ${MIN_PW} characters.`); return }
    setBusy(true)
    try {
      const supabase = createBrowserSupabase()
      if (mode === 'create') {
        const { data, error } = await supabase.auth.signUp({ email: value, password })
        if (error) {
          if (/already registered|already exists|already been/i.test(error.message)) {
            setMode('signin'); setNotice('That email already has an account. Enter your password to sign in.')
          } else { setMessage(error.message) }
          setBusy(false); return
        }
        if (!data.session) { setNotice('Almost there — check your email to confirm your address, then sign in.'); setBusy(false); return }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: value, password })
        if (error || !data.session) { setMessage('That email and password don’t match. Try again, or create an account.'); setBusy(false); return }
      }
      router.refresh()
    } catch {
      setMessage('Something went wrong. Please try again.'); setBusy(false)
    }
  }

  async function forgot() {
    const value = email.trim().toLowerCase()
    if (!EMAIL_RE.test(value)) { setMessage('Enter your email first, then tap “Forgot password”.'); return }
    try {
      const supabase = createBrowserSupabase()
      await supabase.auth.resetPasswordForEmail(value, { redirectTo: `${window.location.origin}/auth/reset` })
      setMessage(''); setNotice('If that email has an account, we’ve sent a link to reset your password.')
    } catch { setMessage('Could not send the reset email just now.') }
  }

  return (
    <form onSubmit={submit} className="mt-7 max-w-sm">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ag-email" className="mf-lbl">Email</label>
        <input id="ag-email" type="email" inputMode="email" autoComplete="email" required
          value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="mf-fld" />
      </div>
      <div className="mt-4 flex flex-col gap-1.5">
        <label htmlFor="ag-pw" className="mf-lbl">Password</label>
        <input id="ag-pw" type="password" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} required
          value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === 'create' ? 'Choose a password (8+ characters)' : 'Your password'} className="mf-fld" />
      </div>

      {notice && <p role="status" className="mt-3 text-[14px]" style={{ color: 'var(--sage-deep)' }}>{notice}</p>}
      {message && <p role="alert" className="mt-3 text-[14px]" style={{ color: 'var(--accent-active)' }}>{message}</p>}

      <button type="submit" disabled={busy} className="mf-btn-ink mt-5 w-full disabled:opacity-60">
        {busy ? 'Just a moment…' : mode === 'create' ? 'Create account and continue' : 'Sign in'}
      </button>

      <div className="mt-4 flex items-center justify-between text-[14px]" style={{ color: 'var(--graphite)' }}>
        {mode === 'create' ? (
          <button type="button" onClick={() => { setMode('signin'); setMessage(''); setNotice('') }} className="font-bold underline underline-offset-2">Already have an account? Sign in</button>
        ) : (
          <button type="button" onClick={() => { setMode('create'); setMessage(''); setNotice('') }} className="font-bold underline underline-offset-2">New here? Create an account</button>
        )}
        {mode === 'signin' && <button type="button" onClick={forgot} className="underline underline-offset-2">Forgot password?</button>}
      </div>

      <p className="mt-5 text-[13px] leading-relaxed" style={{ color: 'var(--graphite)' }}>
        Your profile is private and never shared with funders. Creating an account is not a funding
        application. See our <Link href="/privacy" className="underline underline-offset-2">privacy policy</Link>.
      </p>
    </form>
  )
}
