'use client'

import { useState } from 'react'

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
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
    }
  }

  const wrapper =
    variant === 'band'
      ? 'border-2 border-[var(--ink)] bg-[var(--paper-deep)] p-7 sm:p-9'
      : 'border-t border-[var(--line)] py-10'

  if (status === 'done') {
    return (
      <section className={wrapper}>
        <p className="font-[family-name:var(--font-display)] text-2xl font-semibold">
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
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold sm:text-3xl">
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
            className="control-h w-full border-2 border-[var(--ink)] bg-[var(--paper)] px-4 text-sm font-medium placeholder:font-normal placeholder:text-[var(--ink-soft)] focus:bg-white focus:outline-none sm:max-w-sm"
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            className="control-h border-2 border-[var(--ink)] bg-[var(--ink)] px-7 text-xs font-bold uppercase tracking-[0.15em] text-[var(--paper)] transition-colors hover:bg-transparent hover:text-[var(--ink)] disabled:opacity-50"
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
                className="control-h w-full truncate border-2 border-[var(--ink)] bg-[var(--paper)] pl-4 pr-9 text-sm font-medium sm:max-w-52"
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
                className="control-h w-full truncate border-2 border-[var(--ink)] bg-[var(--paper)] pl-4 pr-9 text-sm font-medium sm:max-w-52"
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
          <p className="mt-3 text-sm font-medium text-[var(--terracotta)]">{message}</p>
        )}
      </form>
    </section>
  )
}
