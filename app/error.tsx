'use client'

/**
 * What a visitor sees when a page throws.
 *
 * Without this file, React unmounts the whole tree and Next shows a bare
 * "Application error" — or, in production, a blank white screen. One bad row
 * from the database or one unexpected null would take the page down with no
 * way back. This keeps the header, explains the situation in plain words, and
 * offers a retry that re-renders without a full reload.
 */

import Link from 'next/link'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Goes to the Vercel function logs, where it can actually be found.
    console.error('page error:', error)
  }, [error])

  return (
    <main className="mx-auto max-w-2xl px-5 py-24">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">
        Something broke
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-[38px] leading-[1.05] sm:text-[48px]">
        That didn&rsquo;t load.
      </h1>
      <p className="mt-5 text-base leading-relaxed text-[var(--ink-soft)]">
        This is our fault, not yours. The page hit an error on its way to you.
        Trying again usually works — the database occasionally takes a moment.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={reset}
          className="border-2 border-[var(--ink)] bg-[var(--ink)] px-7 py-3.5 text-[13px] font-bold uppercase tracking-[0.06em] text-[var(--bg)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="border-2 border-[var(--ink)] px-7 py-3.5 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)]"
        >
          Back to home
        </Link>
      </div>
      <p className="mt-10 text-sm text-[var(--ink-3)]">
        If it keeps happening, tell us at{' '}
        <a href="mailto:hello@onafunds.com" className="underline underline-offset-4">
          hello@onafunds.com
        </a>
        {error.digest ? ` and quote reference ${error.digest}.` : '.'}
      </p>
    </main>
  )
}
