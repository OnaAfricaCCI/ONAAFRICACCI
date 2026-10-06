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
      <div className="mt-8 max-w-md p-6" style={{ border: '1px solid var(--ink)' }}>
        <p className="text-[15px] leading-relaxed">
          Check your inbox. We’ve emailed a secure sign-in link to{' '}
          <strong className="break-all">{email.trim().toLowerCase()}</strong>. Open it on this device to finish.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mt-8 max-w-sm">
      <label htmlFor="email" className="mf-lbl block">Email</label>
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
        placeholder="you@email.com"
        className="mf-fld mt-2"
      />
      {message && (
        <p id="email-msg" role={state === 'error' ? 'alert' : undefined} className="mt-2 text-[14px]" style={{ color: 'var(--accent-active)' }}>
          {message}
        </p>
      )}
      <div className="mt-5">
        <button type="submit" disabled={state === 'sending'} className="mf-btn-ink w-full disabled:opacity-60">
          {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
        </button>
      </div>
      <p className="mt-5 text-[13px] leading-relaxed" style={{ color: 'var(--graphite)' }}>
        New or returning, the same link works. No password needed. Signing in is not a funding application. See our{' '}
        <Link href="/privacy" className="underline underline-offset-2">privacy policy</Link>.
      </p>
    </form>
  )
}
