'use client'

import Link from 'next/link'
import { useState } from 'react'
import { track } from '@/lib/analytics'

const inputClass =
  'control-h w-full border-2 border-[var(--border-md)] bg-[var(--bg)] px-[14px] text-sm ' +
  'placeholder:text-[var(--ink-3)] focus:border-[var(--ink)] focus:outline-none transition-colors'

function Label({
  children,
  optional,
  help,
}: {
  children: React.ReactNode
  optional?: boolean
  help?: string
}) {
  return (
    <div className="mb-1.5">
      <label className="block text-xs font-semibold uppercase tracking-[0.15em]">
        {children}
        {optional && (
          <span className="ml-2 font-normal normal-case tracking-normal text-[var(--ink-soft)]">
            optional
          </span>
        )}
      </label>
      {help && <p className="mt-1 text-xs text-[var(--ink-soft)]">{help}</p>}
    </div>
  )
}

export default function SubmitOpportunityPage() {
  const [form, setForm] = useState({
    name: '',
    organization: '',
    amount: '',
    for_who: '',
    deadline: '',
    rolling: false,
    link: '',
    contact_email: '',
    notes: '',
    company: '', // honeypot
  })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/submit-opportunity', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setStatus('sent')
      track({ name: 'opportunity_submitted' })
    } catch (err) {
      setErrorMsg(
        err instanceof Error && err.message !== 'Failed'
          ? err.message
          : 'Something went wrong sending that. Give it another go, or email us directly.',
      )
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <main className="mx-auto max-w-2xl px-5 py-24 text-center">
        <p className="font-[family-name:var(--font-display)] text-5xl">✓</p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-[38px] leading-[1.1]">
          Thanks, we&rsquo;ve got it.
        </h1>
        <p className="mt-4 text-[var(--ink-soft)]">
          We&rsquo;ll review your opportunity and add it to the database. If anything
          needs clarifying, we&rsquo;ll email you at <strong>{form.contact_email}</strong>.
        </p>
        <Link
          href="/grants"
          className="mt-10 inline-block border-2 border-[var(--ink)] px-6 py-3 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)]"
        >
          Browse the grants database
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <Link
        href="/contact"
        className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--terracotta)] hover:underline underline-offset-4"
      >
        ← Contact
      </Link>

      <header className="mt-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">
          For funders
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[34px] leading-[1.1] sm:text-[44px]">
          Submit an opportunity.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
          Just the essentials, about two minutes. We&rsquo;ll review it before it appears
          in the database, and get in touch if we need anything else.
        </p>
      </header>

      <form onSubmit={submit} className="relative mt-10 space-y-6">
        {/* Honeypot: hidden from people, tempting to bots */}
        <input
          type="text"
          name="company"
          value={form.company}
          onChange={(e) => set('company', e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />
        <div>
          <Label>Name of grant or opportunity</Label>
          <input
            className={inputClass}
            placeholder="e.g. East Africa Music Production Fund 2027"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            required
          />
        </div>

        <div>
          <Label optional>Your organisation</Label>
          <input
            className={inputClass}
            placeholder="e.g. The Example Foundation"
            value={form.organization}
            onChange={(e) => set('organization', e.target.value)}
          />
        </div>

        <div>
          <Label help="A figure, a range, or what the award includes.">
            Amount or what you&rsquo;re offering
          </Label>
          <input
            className={inputClass}
            placeholder="e.g. $5,000 – $20,000 per project"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            required
          />
        </div>

        <div>
          <Label help="Countries, sectors, career stage, anything that decides eligibility.">
            Who it&rsquo;s for
          </Label>
          <input
            className={inputClass}
            placeholder="e.g. Emerging musicians in Kenya, Uganda and Tanzania"
            value={form.for_who}
            onChange={(e) => set('for_who', e.target.value)}
            required
          />
        </div>

        <div>
          <Label>Deadline</Label>
          <div className="flex flex-wrap items-center gap-4">
            <input
              className={`${inputClass} max-w-52 disabled:opacity-40`}
              type="date"
              value={form.deadline}
              onChange={(e) => set('deadline', e.target.value)}
              disabled={form.rolling}
              required={!form.rolling}
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.rolling}
                onChange={(e) => set('rolling', e.target.checked)}
                className="h-4 w-4 accent-[var(--terracotta)]"
              />
              No fixed deadline (rolling)
            </label>
          </div>
        </div>

        <div>
          <Label>Contact email</Label>
          <input
            className={inputClass}
            type="email"
            placeholder="So we can reach you about this listing"
            value={form.contact_email}
            onChange={(e) => set('contact_email', e.target.value)}
            required
          />
        </div>

        <div>
          <Label optional>Link to more information</Label>
          <input
            className={inputClass}
            type="url"
            placeholder="https://…"
            value={form.link}
            onChange={(e) => set('link', e.target.value)}
          />
        </div>

        <div>
          <Label optional>Notes</Label>
          <textarea
            className={`${inputClass} h-auto py-3`}
            rows={4}
            placeholder="Anything else worth knowing — sectors, application process, restrictions…"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>

        {status === 'error' && (
          <p className="text-sm font-medium text-[var(--error)]">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-full border-2 border-[var(--ink)] bg-[var(--ink)] px-6 py-4 text-[13px] font-bold uppercase tracking-[0.06em] text-[var(--bg)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)] disabled:opacity-50 sm:w-auto"
        >
          {status === 'sending' ? 'Submitting…' : 'Submit opportunity'}
        </button>
      </form>
    </main>
  )
}
