'use client'

import Link from 'next/link'
import { useState } from 'react'
import { track } from '@/lib/analytics'
import { TheFind } from '@/app/components/Motif'

const inputClass =
  'control-h w-full border-2 border-[var(--border-md)] bg-[var(--bg)] px-[14px] text-sm ' +
  'placeholder:text-[var(--ink-3)] focus:border-[var(--ink)] focus:outline-none transition-colors'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [company, setCompany] = useState('') // honeypot
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, message, company }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setStatus('sent')
      track({ name: 'contact_message_sent' })
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5">
      <section className="grid items-center gap-8 border-b border-[var(--line)] py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
        <p className="label text-[var(--sage-deep)]">
          Contact
        </p>
        <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-[38px] leading-[1.05] sm:text-[56px]">
          Talk to us.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--ink-soft)]">
          Looking for funding, or offering it? Start here. If you&rsquo;d rather email,
          write to{' '}
          <a
            href="mailto:hello@onafunds.com"
            className="underline underline-offset-4 hover:text-[var(--accent)]"
          >
            hello@onafunds.com
          </a>
          .
        </p>
        </div>
        <TheFind
          cols={4}
          rows={4}
          coral={{ col: 1, row: 2 }}
          className="hidden h-[112px] w-[112px] justify-self-end lg:block"
        />
      </section>

      <section className="grid gap-px border border-[var(--line)] bg-[var(--line)] my-12 lg:grid-cols-2">
        {/* Seekers + general */}
        <div className="bg-[var(--paper)] p-8 sm:p-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">
            For grant seekers and everyone else
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-[1.2]">
            Get in touch
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
            Found a grant that&rsquo;s out of date? Spotted something we missed? Want to work
            together? Send us a note. We read every message.
          </p>

          {status === 'sent' ? (
            <div className="mt-8 border-l-4 border-[var(--forest)] bg-[var(--forest-soft)] p-5">
              <p className="font-[family-name:var(--font-display)] text-xl font-semibold">
                Message sent.
              </p>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                Thank you. We&rsquo;ll get back to you at {email}.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="relative mt-8 space-y-4">
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
                className={`${inputClass} h-auto py-3`}
                placeholder="Your message"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
              {status === 'error' && (
                <p className="text-sm font-medium text-[var(--error)]">{errorMsg}</p>
              )}
              <button
                type="submit"
                disabled={status === 'sending'}
                className="border-2 border-[var(--ink)] bg-[var(--ink)] px-6 py-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[var(--bg)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)] disabled:opacity-50"
              >
                {status === 'sending' ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
        </div>

        {/* Providers */}
        <div className="flex flex-col bg-[var(--paper-deep)] p-8 sm:p-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">
            For grant and fund providers
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-[1.2]">
            List your opportunity
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
            Reach creatives and cultural organisations across Africa. Tell us the
            essentials, it takes about two minutes, and we&rsquo;ll review it and add it
            to the database.
          </p>

          <ul className="mt-8 space-y-3 text-sm">
            {[
              'Five quick fields, no lengthy applications',
              'Reviewed by our team before it goes live',
              'Seen by creatives across the continent and the diaspora',
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
              className="inline-block border-2 border-[var(--ink)] bg-[var(--ink)] px-6 py-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[var(--bg)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)]"
            >
              Submit an opportunity →
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
