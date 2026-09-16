'use client'

import Link from 'next/link'
import { useState } from 'react'

const inputClass =
  'w-full border-2 border-[var(--ink)] bg-[var(--paper)] px-4 py-3 text-sm ' +
  'placeholder:text-[var(--ink-soft)] focus:bg-white focus:outline-none transition-colors'

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em]">
      {children}
      {optional && (
        <span className="ml-2 font-normal normal-case tracking-normal text-[var(--ink-soft)]">
          optional
        </span>
      )}
    </label>
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
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <main className="mx-auto max-w-2xl px-5 py-24 text-center">
        <p className="font-[family-name:var(--font-display)] text-5xl">✓</p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold">
          Thank you.
        </h1>
        <p className="mt-4 text-[var(--ink-soft)]">
          Your opportunity has been received. We&rsquo;ll review it and be in touch at{' '}
          <strong>{form.contact_email}</strong> before it goes live.
        </p>
        <Link
          href="/grants"
          className="mt-10 inline-block border-2 border-[var(--ink)] px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper)]"
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
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--terracotta)]">
          For funders
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold leading-tight">
          Submit an opportunity.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
          Just the essentials — about two minutes. We&rsquo;ll review it before it appears
          in the database, and contact you if we need anything else.
        </p>
      </header>

      <form onSubmit={submit} className="mt-10 space-y-6">
        <div>
          <Label>Name of grant / opportunity</Label>
          <input
            className={inputClass}
            placeholder="e.g. East Africa Music Production Fund 2027"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            required
          />
        </div>

        <div>
          <Label optional>Your organization</Label>
          <input
            className={inputClass}
            placeholder="e.g. The Example Foundation"
            value={form.organization}
            onChange={(e) => set('organization', e.target.value)}
          />
        </div>

        <div>
          <Label>Amount / what you&rsquo;re offering</Label>
          <input
            className={inputClass}
            placeholder="e.g. $5,000 – $20,000 per project"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            required
          />
        </div>

        <div>
          <Label>Who it&rsquo;s for</Label>
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
            className={inputClass}
            rows={4}
            placeholder="Anything else worth knowing — sectors, application process, restrictions…"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>

        {status === 'error' && (
          <p className="text-sm font-medium text-[var(--terracotta)]">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-full border-2 border-[var(--ink)] bg-[var(--terracotta)] px-6 py-4 text-xs font-bold uppercase tracking-[0.15em] text-[var(--paper)] transition-colors hover:bg-[var(--ink)] disabled:opacity-50 sm:w-auto"
        >
          {status === 'sending' ? 'Submitting…' : 'Submit opportunity'}
        </button>
      </form>
    </main>
  )
}
