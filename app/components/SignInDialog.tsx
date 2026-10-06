'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createBrowserSupabase } from '@/lib/supabase/browser'

/**
 * The sign-in / create-account dialog. Passwordless: we email a secure, expiring
 * magic link (Supabase), which works the same whether the person is new or
 * returning. The pending save and the page to return to travel in the link's
 * redirect so the save completes once on return.
 *
 * Accessibility: it is a modal dialog (role=dialog, aria-modal), traps focus,
 * closes on Escape or a backdrop click, and restores focus to wherever the user
 * was when it opened.
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
    const focusable = root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
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
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
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
      const { error } = await supabase.auth.signInWithOtp({
        email: value,
        options: { emailRedirectTo: cb.toString() },
      })
      if (error) throw error
      setState('sent')
    } catch {
      setState('error')
      setMessage('Could not send the link just now. Please try again.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-heading"
        className="w-full max-w-md border-2 border-[var(--ink)] bg-[var(--bg)] p-6 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="signin-heading" className="font-[family-name:var(--font-display)] text-2xl leading-tight">
            {heading}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 shrink-0 p-1 text-2xl leading-none text-[var(--ink-soft)] hover:text-[var(--accent)]"
          >
            ×
          </button>
        </div>

        {state === 'sent' ? (
          <div className="mt-4">
            <p className="text-[15px] leading-relaxed">
              Check your inbox. We’ve emailed a secure sign-in link to{' '}
              <strong className="break-all">{email.trim().toLowerCase()}</strong>. Open it on this device to
              finish{pendingSaveId ? ' and save this opportunity' : ''}.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full border-2 border-[var(--ink)] px-4 py-3 text-[13px] font-bold uppercase tracking-[0.06em] hover:bg-[var(--ink)] hover:text-[var(--bg)]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4">
            <p className="text-[15px] leading-relaxed text-[var(--ink-2)]">{body}</p>
            <label htmlFor="signin-email" className="mt-5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">
              Email address
            </label>
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
              placeholder="you@example.com"
              className="control-h mt-1.5 w-full border-2 border-[var(--border-md)] bg-[var(--bg)] px-3 text-sm focus:border-[var(--ink)] focus:outline-none"
            />
            {state === 'error' && (
              <p id="signin-error" role="alert" className="mt-2 text-sm text-[var(--terracotta)]">
                {message}
              </p>
            )}
            <button
              type="submit"
              disabled={state === 'sending'}
              className="mt-5 w-full bg-[var(--accent)] px-4 py-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[#121412] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-60"
            >
              {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
            </button>
            <p className="mt-4 text-xs leading-relaxed text-[var(--ink-3)]">
              New or returning, the link does both. An account lets you save opportunities and build an
              optional profile for more relevant results. It is not a funding application. See our{' '}
              <Link href="/privacy" className="underline underline-offset-2">
                privacy policy
              </Link>
              .
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
