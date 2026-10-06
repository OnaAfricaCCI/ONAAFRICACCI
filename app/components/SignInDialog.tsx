'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createBrowserSupabase } from '@/lib/supabase/browser'
import { createAccount, signIn } from '@/lib/clientAuth'

/**
 * Sign-in / create-account dialog — email + password, so it completes IN the
 * dialog with no email round-trip. Creating an account (or signing in) returns
 * a session immediately (email confirmation is off), the parent completes any
 * pending save, and the person carries on without leaving the page.
 *
 * Modal dialog: role=dialog, aria-modal, focus trap, Escape / backdrop close,
 * focus restored on close.
 */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const MIN_PW = 8

export default function SignInDialog({
  pendingSaveId,
  heading = 'Sign in to Ona Funds',
  body = 'Create an account or sign in. It takes a few seconds and you stay right here.',
  onClose,
  onAuthed,
}: {
  pendingSaveId?: string | null
  heading?: string
  body?: string
  onClose: () => void
  onAuthed: (pendingSaveId?: string | null) => void
}) {
  const [mode, setMode] = useState<'create' | 'signin'>('create')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  const trapFocus = useCallback((e: KeyboardEvent) => {
    const root = dialogRef.current
    if (!root) return
    const f = root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')
    if (f.length === 0) return
    const first = f[0], last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }, [])

  useEffect(() => {
    returnFocus.current = document.activeElement as HTMLElement | null
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'Tab') trapFocus(e) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; returnFocus.current?.focus?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    setMessage(''); setNotice('')
    if (!EMAIL_RE.test(value)) { setMessage('Please enter a valid email address.'); return }
    if (password.length < MIN_PW) { setMessage(`Your password needs at least ${MIN_PW} characters.`); return }
    setBusy(true)
    const result = mode === 'create' ? await createAccount(value, password) : await signIn(value, password)
    if (!result.ok) {
      if (result.switchToSignin) { setMode('signin'); setNotice(result.error) } else { setMessage(result.error) }
      setBusy(false); return
    }
    onAuthed(pendingSaveId)
  }

  async function forgot() {
    const value = email.trim().toLowerCase()
    if (!EMAIL_RE.test(value)) { setMessage('Enter your email above first, then tap “Forgot password”.'); return }
    try {
      const supabase = createBrowserSupabase()
      await supabase.auth.resetPasswordForEmail(value, { redirectTo: `${window.location.origin}/auth/reset` })
      setMessage(''); setNotice('If that email has an account, we’ve sent a link to reset your password.')
    } catch { setMessage('Could not send the reset email just now.') }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
      style={{ background: 'rgba(18,20,18,0.55)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="signin-heading"
        className="flex w-full max-w-[400px] flex-col gap-4 p-[30px]" style={{ background: 'var(--bg)', border: '1px solid var(--ink)' }}>
        <div className="flex items-start justify-between">
          <svg viewBox="0 0 100 100" width="30" height="30" aria-hidden="true">
            <circle cx="50" cy="50" r="39" fill="none" stroke="var(--ink)" strokeWidth="22" />
            <circle cx="50" cy="50" r="28" fill="#FF6A4D" />
          </svg>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[22px] leading-none" style={{ color: 'var(--graphite)' }}>✕</button>
        </div>

        <h3 id="signin-heading" className="mf-d text-[28px]" style={{ lineHeight: 1.02 }}>{heading}</h3>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--graphite)' }}>{body}</p>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="si-email" className="mf-lbl">Email</label>
            <input id="si-email" ref={inputRef} type="email" inputMode="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="mf-fld" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="si-pw" className="mf-lbl">Password</label>
            <input id="si-pw" type="password" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} required
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'create' ? 'At least 8 characters' : 'Your password'} className="mf-fld" />
          </div>

          {notice && <p role="status" className="text-[14px]" style={{ color: 'var(--sage-deep)' }}>{notice}</p>}
          {message && <p role="alert" className="text-[14px]" style={{ color: 'var(--accent-active)' }}>{message}</p>}

          <button type="submit" disabled={busy} className="mf-btn-ink w-full disabled:opacity-60">
            {busy ? 'Just a moment…' : mode === 'create' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="flex items-center justify-between text-[13px]" style={{ color: 'var(--graphite)' }}>
          {mode === 'create' ? (
            <button type="button" onClick={() => { setMode('signin'); setMessage(''); setNotice('') }} className="font-bold underline underline-offset-2">
              Already have an account? Sign in
            </button>
          ) : (
            <button type="button" onClick={() => { setMode('create'); setMessage(''); setNotice('') }} className="font-bold underline underline-offset-2">
              New here? Create an account
            </button>
          )}
          {mode === 'signin' && (
            <button type="button" onClick={forgot} className="underline underline-offset-2">Forgot password?</button>
          )}
        </div>

        <p className="text-[13px] leading-normal" style={{ color: 'var(--graphite)' }}>
          We will not add you to any mailing list. Creating an account is not a funding application.{' '}
          <Link href="/privacy" className="font-semibold underline underline-offset-2">Privacy</Link>.
        </p>
      </div>
    </div>
  )
}
