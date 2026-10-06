'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createBrowserSupabase } from '@/lib/supabase/browser'
import { safeNext } from '@/lib/returnUrl'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default function SignInForm({ next, hadError }: { next: string; hadError: string | null }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState(
    hadError === 'expired'
      ? 'That link had expired. Enter your email to get a fresh one.'
      : hadError === 'link'
        ? 'That link was invalid. Enter your email to get a new one.'
        : '',
  )

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
      cb.searchParams.set('next', safeNext(next, '/profile'))
      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.signInWithOtp({ email: value, options: { emailRedirectTo: cb.toString() } })
      if (error) throw error
      setState('sent')
    } catch {
      setState('error')
      setMessage('Could not send the link just now. Please try again.')
    }
  }

  if (state === 'sent') {
    return (
      <div className="mt-8 border-2 border-[var(--ink)] p-6">
        <p className="text-[15px] leading-relaxed">
          Check your inbox. We’ve emailed a secure sign-in link to{' '}
          <strong className="break-all">{email.trim().toLowerCase()}</strong>. Open it on this device to finish.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mt-8">
      <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">
        Email address
      </label>
      <input
        id="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={state === 'error'}
        aria-describedby={message ? 'email-msg' : undefined}
        placeholder="you@example.com"
        className="control-h mt-1.5 w-full max-w-sm border-2 border-[var(--border-md)] bg-[var(--bg)] px-3 text-sm focus:border-[var(--ink)] focus:outline-none"
      />
      {message && (
        <p id="email-msg" role={state === 'error' ? 'alert' : undefined} className="mt-2 max-w-sm text-sm text-[var(--terracotta)]">
          {message}
        </p>
      )}
      <div className="mt-5">
        <button
          type="submit"
          disabled={state === 'sending'}
          className="bg-[var(--accent)] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[#121412] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-60"
        >
          {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
        </button>
      </div>
      <p className="mt-5 max-w-sm text-xs leading-relaxed text-[var(--ink-3)]">
        New or returning, the same link works. No password needed. Signing in is not a funding application. See our{' '}
        <Link href="/privacy" className="underline underline-offset-2">
          privacy policy
        </Link>
        .
      </p>
    </form>
  )
}
