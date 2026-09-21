'use client'

import { useState } from 'react'
import { track } from '@/lib/analytics'

type Props = {
  /** Optional dropdown choices. When omitted, only the email field is shown. */
  sectors?: string[]
  countries?: string[]
  heading?: string
  blurb?: string
  /** 'band' = full-width bordered block, 'inline' = lighter, for mid-page use */
  variant?: 'band' | 'inline'
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default function EmailCapture({
  sectors = [],
  countries = [],
  heading = 'Get the weekly digest',
  blurb = 'New opportunities and closing deadlines, once a week. No noise, unsubscribe anytime.',
  variant = 'band',
}: Props) {
  const [email, setEmail] = useState('')
  const [sector, setSector] = useState('')
  const [country, setCountry] = useState('')
  const [company, setCompany] = useState('') // honeypot
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const hasPrefs = sectors.length > 0 || countries.length > 0

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const clean = email.trim().toLowerCase()
    if (!EMAIL_RE.test(clean)) {
      setMessage('Please enter a valid email address.')
      setStatus('error')
      return
    }
    setStatus('sending')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: clean,
          sectors: sector ? [sector] : [],
          countries: country ? [country] : [],
          company, // bots fill this; humans never see it
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.')
      setStatus('done')
      track({ name: 'subscribe', placement: hasPrefs ? 'grants' : 'home', with_preferences: Boolean(sector || country) })
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
    }
  }

  const wrapper =
    variant === 'band'
      ? 'border-2 border-[var(--border)] border-t-4 border-t-[var(--accent)] bg-[var(--bg)] p-7 sm:p-9'
      : 'border-t border-[var(--line)] py-10'

  if (status === 'done') {
    return (
      <section className={wrapper}>
        <p className="font-[family-name:var(--font-display)] text-2xl leading-[1.2]">
          You&rsquo;re on the list.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
          The digest lands weekly at <strong>{email.trim().toLowerCase()}</strong>. Every
          email has an unsubscribe link at the bottom.
        </p>
      </section>
    )
  }

  return (
    <section className={wrapper}>
      <h2 className="font-[family-name:var(--font-display)] text-2xl leading-[1.2]">
        {heading}
      </h2>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--ink-soft)]">{blurb}</p>

      <form onSubmit={submit} className="mt-6">
        {/* Honeypot: hidden from people, tempting to bots */}
        <input
          type="text"
          name="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Your email address"
            className="control-h w-full border-2 border-[var(--border-md)] bg-[var(--bg)] px-[14px] text-sm placeholder:text-[var(--ink-3)] focus:border-[var(--ink)] focus:outline-none sm:max-w-sm"
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            className="control-h border-2 border-[var(--ink)] bg-[var(--ink)] px-7 text-[13px] font-bold uppercase tracking-[0.06em] text-[var(--bg)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-35"
          >
            {status === 'sending' ? 'Signing up…' : 'Subscribe'}
          </button>
        </div>

        {hasPrefs && (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            {sectors.length > 0 && (
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                aria-label="Sector you care about (optional)"
                className="control-h w-full truncate border-2 border-[var(--border-md)] bg-[var(--bg)] pl-[14px] pr-9 text-sm hover:border-[var(--ink)] focus:border-[var(--ink)] focus:outline-none sm:max-w-52"
              >
                <option value="">Any sector (optional)</option>
                {sectors.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
            {countries.length > 0 && (
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                aria-label="Country you care about (optional)"
                className="control-h w-full truncate border-2 border-[var(--border-md)] bg-[var(--bg)] pl-[14px] pr-9 text-sm hover:border-[var(--ink)] focus:border-[var(--ink)] focus:outline-none sm:max-w-52"
              >
                <option value="">Any country (optional)</option>
                {countries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {status === 'error' && (
          <p className="mt-3 text-sm font-medium text-[var(--error)]">{message}</p>
        )}
      </form>
    </section>
  )
}
