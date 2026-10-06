'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createBrowserSupabase } from '@/lib/supabase/browser'

/**
 * The sign-in / create-account dialog (design: ink ring mark, ink action
 * button, no-mailing-list reassurance). Passwordless: we email a secure,
 * expiring magic link, the same for new and returning people. The pending save
 * and the return page travel in the link's redirect so the save completes once.
 *
 * Modal dialog: role=dialog, aria-modal, focus trap, Escape / backdrop close,
 * focus restored on close.
 */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default function SignInDialog({
  pendingSaveId,
  heading = 'Sign in to Ona Funds',
  body = 'We’ll email you a secure link to sign in or create your account. No password needed.',
  onClose,
}: {
  pendingSaveId?: string | null
  heading?: string
  body?: string
  onClose: () => void
}) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  const trapFocus = useCallback((e: KeyboardEvent) => {
    const root = dialogRef.current
    if (!root) return
    const f = root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    if (f.length === 0) return
    const first = f[0]
    const last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }, [])

  useEffect(() => {
    returnFocus.current = document.activeElement as HTMLElement | null
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') trapFocus(e)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      returnFocus.current?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    if (!EMAIL_RE.test(value)) {
      setState('error')
      setMessage('Please enter a valid email address.')
      return
    }
    setState('sending')
    setMessage('')
    try {
      const cb = new URL('/auth/callback', window.location.origin)
      cb.searchParams.set('next', window.location.pathname + window.location.search)
      if (pendingSaveId) cb.searchParams.set('save', pendingSaveId)
      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.signInWithOtp({ email: value, options: { emailRedirectTo: cb.toString() } })
      if (error) throw error
      setState('sent')
    } catch {
      setState('error')
      setMessage('Could not send the link just now. Please try again.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
      style={{ background: 'rgba(18,20,18,0.55)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-heading"
        className="flex w-full max-w-[400px] flex-col gap-4 p-[30px]"
        style={{ background: 'var(--bg)', border: '1px solid var(--ink)' }}
      >
        <div className="flex items-start justify-between">
          <svg viewBox="0 0 100 100" width="30" height="30" aria-hidden="true">
            <circle cx="50" cy="50" r="39" fill="none" stroke="var(--ink)" strokeWidth="22" />
            <circle cx="50" cy="50" r="28" fill="#FF6A4D" />
          </svg>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[22px] leading-none" style={{ color: 'var(--graphite)' }}>
            ✕
          </button>
        </div>

        {state === 'sent' ? (
          <>
            <h3 id="signin-heading" className="mf-d text-[26px]" style={{ lineHeight: 1.05 }}>Check your inbox.</h3>
            <p className="text-[15px] leading-relaxed" style={{ color: 'var(--graphite)' }}>
              We’ve emailed a secure sign-in link to <strong className="break-all" style={{ color: 'var(--ink)' }}>{email.trim().toLowerCase()}</strong>.
              Open it on this device to finish{pendingSaveId ? ' and save this opportunity' : ''}.
            </p>
            <button type="button" onClick={onClose} className="mf-btn-outline w-full">Done</button>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <h3 id="signin-heading" className="mf-d text-[28px]" style={{ lineHeight: 1.02 }}>{heading}</h3>
            <p className="text-[15px] leading-relaxed" style={{ color: 'var(--graphite)' }}>{body}</p>
            <label htmlFor="signin-email" className="mf-lbl">Email</label>
            <input
              id="signin-email"
              ref={inputRef}
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={state === 'error'}
              aria-describedby={state === 'error' ? 'signin-error' : undefined}
              placeholder="you@email.com"
              className="mf-fld"
            />
            {state === 'error' && (
              <p id="signin-error" role="alert" className="text-[14px]" style={{ color: 'var(--accent-active)' }}>{message}</p>
            )}
            <button type="submit" disabled={state === 'sending'} className="mf-btn-ink w-full disabled:opacity-60">
              {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
            </button>
            <p className="text-[13px] leading-normal" style={{ color: 'var(--graphite)' }}>
              No password to remember. We will not add you to any mailing list.{' '}
              <Link href="/privacy" className="font-semibold underline underline-offset-2">Privacy</Link>.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
