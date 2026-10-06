import type { Metadata } from 'next'
import Link from 'next/link'
import InviteButtons from '@/app/components/InviteButtons'

export const metadata: Metadata = {
  title: 'Find funding for me',
  description:
    'Tell Ona about your work and see the grants, prizes, residencies and fellowships most relevant to you. Your profile is private.',
  alternates: { canonical: '/find-funding' },
}

function RingBullet() {
  return (
    <svg viewBox="0 0 100 100" width="20" height="20" aria-hidden="true" style={{ flex: 'none', marginTop: 2 }}>
      <circle cx="50" cy="50" r="39" fill="none" stroke="#5F7359" strokeWidth="22" />
      <circle cx="50" cy="50" r="28" fill="#5F7359" />
    </svg>
  )
}

const POINTS = [
  'Browsing stays free and open. No account needed to look.',
  'Your profile is private and never shown to funders.',
  'Creating a profile is not a funding application.',
]

export default function FindFundingPage() {
  // The motif grid: rings in sage, one in coral (the one that fits you).
  const rings = Array.from({ length: 15 }, (_, i) => i === 6)

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <div className="grid overflow-hidden border border-[var(--ink)] lg:grid-cols-[1.15fr_0.85fr]">
        {/* Content */}
        <div className="order-2 flex flex-col gap-6 px-7 py-10 sm:px-12 sm:py-16 lg:order-1">
          <span className="mf-lbl">Find funding for me</span>
          <h1 className="mf-d text-[44px] sm:text-[60px]" style={{ lineHeight: 0.96 }}>
            Funding that fits, found for you.
          </h1>
          <p className="max-w-[520px] text-[17px] leading-relaxed sm:text-[19px]" style={{ color: 'var(--graphite)' }}>
            Tell us a little about your work and we will surface the grants, prizes, residencies and
            fellowships most relevant to you. It takes about two minutes, and you can save
            opportunities to come back to on any device.
          </p>
          <ul className="flex list-none flex-col gap-3.5 p-0">
            {POINTS.map((p) => (
              <li key={p} className="flex gap-3 text-[16px]">
                <RingBullet />
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-3">
            <InviteButtons entryPoint="find_funding_page" />
            <span className="text-[15px]" style={{ color: 'var(--graphite)' }}>
              Already have an account?{' '}
              <Link href="/signin" className="font-bold underline underline-offset-4">Sign in</Link>
            </span>
          </div>
        </div>

        {/* Motif panel — The Find */}
        <div className="relative order-1 min-h-[180px] overflow-hidden lg:order-2 lg:min-h-[520px]" style={{ background: '#5F7359' }}>
          <div
            aria-hidden="true"
            className="absolute inset-0 grid grid-cols-6 content-center gap-4 p-7 lg:grid-cols-5 lg:gap-7 lg:p-12"
          >
            {rings.map((coral, i) => (
              <div
                key={i}
                className="rounded-full"
                style={
                  coral
                    ? { aspectRatio: '1', background: '#FF6A4D' }
                    : { aspectRatio: '1', border: '7px solid #8FA487' }
                }
              />
            ))}
          </div>
          <div className="absolute inset-x-8 bottom-9 hidden lg:block" style={{ color: '#F6F4EC' }}>
            <span className="mf-lbl" style={{ color: '#DCE3D5' }}>The record</span>
            <div className="mf-d mt-2 text-[26px]" style={{ lineHeight: 1.05 }}>
              Out of hundreds of calls, the ones that fit you.
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
