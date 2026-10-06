import type { Metadata } from 'next'
import Link from 'next/link'
import InviteButtons from '@/app/components/InviteButtons'
import PrivacyNotice from '@/app/components/PrivacyNotice'

export const metadata: Metadata = {
  title: 'Find funding for me',
  description:
    'Create a free Ona Funds profile to save opportunities and see funding that fits your location, creative work and preferences. Your profile is private.',
  alternates: { canonical: '/find-funding' },
}

const BENEFITS = [
  ['Save what interests you', 'Keep a shortlist of opportunities and return to them on any device.'],
  ['See what fits', 'Tell us your location, creative work and funding preferences once, and we’ll surface the opportunities that match.'],
  ['Reuse it across visits', 'Your answers come back with you, so you’re not filtering from scratch every time.'],
]

export default function FindFundingPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sage-deep)]">Find funding for me</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-[38px] leading-[1.05] sm:text-[52px]">
        Funding that fits, not a wall of listings.
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-[var(--ink-2)]">
        Ona is free to browse without an account. If you’d like it to do more of the looking for you,
        a short profile lets us point you to the opportunities most relevant to your work. It takes a
        minute, and you can change or delete it whenever you like.
      </p>

      <ul className="mt-10 grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
        {BENEFITS.map(([title, body]) => (
          <li key={title} className="bg-[var(--bg)] p-6">
            <h2 className="font-[family-name:var(--font-display)] text-lg leading-snug">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink-2)]">{body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-10">
        <InviteButtons entryPoint="find_funding_page" />
      </div>

      <p className="mt-6 text-sm text-[var(--ink-soft)]">
        Already have an account?{' '}
        <Link href="/signin" className="underline underline-offset-4 hover:text-[var(--accent)]">
          Sign in
        </Link>{' '}
        to open your profile and saved opportunities.
      </p>

      <PrivacyNotice className="mt-10" />
    </main>
  )
}
