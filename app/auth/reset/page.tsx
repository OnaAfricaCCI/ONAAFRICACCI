'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserSupabase } from '@/lib/supabase/browser'

/**
 * Set a new password, reached from the "Forgot password?" email link. The link
 * carries a short-lived recovery session; once it's established we let the
 * person choose a new password (updateUser), then send them to their profile.
 */
const MIN_PW = 8

export default function ResetPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    const supabase = createBrowserSupabase()
    let active = true
    ;(async () => {
      let { data } = await supabase.auth.getSession()
      if (!data.session) {
        const code = new URLSearchParams(window.location.search).get('code')
        if (code) {
          await supabase.auth.exchangeCodeForSession(code).catch(() => {})
          ;({ data } = await supabase.auth.getSession())
        }
      }
      if (!active) return
      if (data.session) setReady(true)
      else setMessage('This reset link has expired or was already used. Request a new one from the sign-in page.')
    })()
    return () => { active = false }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < MIN_PW) { setMessage(`Your password needs at least ${MIN_PW} characters.`); return }
    setBusy(true); setMessage('')
    try {
      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) { setMessage(error.message); setBusy(false); return }
      setDone(true)
      setTimeout(() => { router.push('/profile'); router.refresh() }, 1200)
    } catch {
      setMessage('Could not update your password. Please try again.'); setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
      <span className="mf-lbl">Your account</span>
      <h1 className="mf-d mt-3 text-[34px] sm:text-[44px]">Set a new password.</h1>

      {done ? (
        <p className="mt-6 text-[16px]" style={{ color: 'var(--sage-deep)' }}>Password updated. Taking you to your profile…</p>
      ) : ready ? (
        <form onSubmit={submit} className="mt-8 max-w-sm">
          <div className="flex items-baseline justify-between">
            <label htmlFor="new-pw" className="mf-lbl block">New password</label>
            <button type="button" onClick={() => setShowPw((v) => !v)}
              className="text-[13px] font-bold underline underline-offset-2" style={{ color: 'var(--accent-deep)' }}
              aria-pressed={showPw}>{showPw ? 'Hide password' : 'Show password'}</button>
          </div>
          <input id="new-pw" type={showPw ? 'text' : 'password'} autoComplete="new-password" required value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="mf-fld mt-2" />
          {message && <p role="alert" className="mt-3 text-[14px]" style={{ color: 'var(--accent-active)' }}>{message}</p>}
          <button type="submit" disabled={busy} className="mf-btn-ink mt-5 w-full disabled:opacity-60">
            {busy ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      ) : (
        <div className="mt-8">
          <p className="text-[16px]" style={{ color: message ? 'var(--accent-active)' : 'var(--graphite)' }}>
            {message || 'Checking your reset link…'}
          </p>
          {message && <Link href="/signin" className="mf-btn-outline mt-5">Back to sign in</Link>}
        </div>
      )}
    </main>
  )
}
