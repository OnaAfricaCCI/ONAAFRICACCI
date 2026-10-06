import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Your profile is ready',
  robots: { index: false, follow: false },
}

export default function ProfileReadyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 text-center sm:py-24">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sage-deep)]">All set</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-[36px] leading-[1.1] sm:text-[52px]">
        Your profile is ready.
      </h1>
      <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-[var(--ink-2)]">
        We’ll use it to point you to funding that fits. It’s private, you can change it any time, and
        creating it isn’t a funding application. If your email is set up with us, a confirmation is on its way.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/recommendations"
          className="bg-[var(--accent)] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[#121412] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
        >
          Explore opportunities for me
        </Link>
        <Link
          href="/saved"
          className="border-2 border-[var(--ink)] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)]"
        >
          View my saved opportunities
        </Link>
      </div>
      <p className="mt-6 text-sm text-[var(--ink-soft)]">
        <Link href="/profile" className="underline underline-offset-4 hover:text-[var(--accent)]">
          Review or edit my profile
        </Link>
      </p>
    </main>
  )
}
