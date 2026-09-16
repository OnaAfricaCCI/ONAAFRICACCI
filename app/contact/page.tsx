'use client'

import Link from 'next/link'
import { useState } from 'react'

const inputClass =
  'w-full border-2 border-[var(--ink)] bg-[var(--paper)] px-4 py-3 text-sm ' +
  'placeholder:text-[var(--ink-soft)] focus:bg-white focus:outline-none transition-colors'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setStatus('sent')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5">
      <section className="border-b border-[var(--line)] py-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--terracotta)]">
          Contact
        </p>
        <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-4xl font-semibold leading-[1.05] sm:text-6xl">
          Talk to us.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--ink-soft)]">
          Whether you&rsquo;re looking for funding or offering it, this is the door.
        </p>
      </section>

      <section className="grid gap-px border border-[var(--line)] bg-[var(--line)] my-12 lg:grid-cols-2">
        {/* Seekers + general */}
        <div className="bg-[var(--paper)] p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--forest)]">
            For grant seekers &amp; everyone else
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
            Get in touch
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
            Questions, corrections, ideas, partnerships — we read everything.
          </p>

          {status === 'sent' ? (
            <div className="mt-8 border-l-4 border-[var(--forest)] bg-[var(--forest-soft)] p-5">
              <p className="font-[family-name:var(--font-display)] text-xl font-semibold">
                Message sent.
              </p>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                Thank you — we&rsquo;ll get back to you at {email}.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-4">
              <input
                className={inputClass}
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <input
                className={inputClass}
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <textarea
                className={inputClass}
                placeholder="Your message"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
              {status === 'error' && (
                <p className="text-sm font-medium text-[var(--terracotta)]">{errorMsg}</p>
              )}
              <button
                type="submit"
                disabled={status === 'sending'}
                className="border-2 border-[var(--ink)] bg-[var(--ink)] px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-[var(--paper)] transition-colors hover:bg-transparent hover:text-[var(--ink)] disabled:opacity-50"
              >
                {status === 'sending' ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
        </div>

        {/* Providers */}
        <div className="flex flex-col bg-[var(--paper-deep)] p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--terracotta)]">
            For grant &amp; fund providers
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
            List your opportunity
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
            Reach creatives and cultural organizations across Africa. Tell us the
            essentials — it takes about two minutes — and we&rsquo;ll review and publish
            it in the grants database.
          </p>

          <ul className="mt-8 space-y-3 text-sm">
            {[
              'Five quick fields — no lengthy applications',
              'Reviewed by our team before publishing',
              'Reaches a pan-African creative audience',
            ].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span className="mt-0.5 font-[family-name:var(--font-display)] font-bold text-[var(--terracotta)]">
                  →
                </span>
                {line}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-10">
            <Link
              href="/contact/submit"
              className="inline-block border-2 border-[var(--ink)] bg-[var(--terracotta)] px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-[var(--paper)] transition-colors hover:bg-[var(--ink)]"
            >
              Submit an opportunity →
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
