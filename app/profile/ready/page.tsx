import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Your profile is ready',
  robots: { index: false, follow: false },
}

export default function ProfileReadyPage() {
  return (
    <main className="mx-auto max-w-[860px] px-5 py-10 sm:py-14">
      <div className="relative overflow-hidden border border-[var(--ink)]" style={{ background: '#121412', color: '#F6F4EC' }}>
        {/* aperture motif */}
        <svg viewBox="0 0 520 520" aria-hidden="true" className="pointer-events-none absolute -right-28 -top-24 h-[360px] w-[360px] sm:h-[480px] sm:w-[480px]">
          <circle cx="260" cy="260" r="195" fill="none" stroke="#5F7359" strokeWidth="86" />
        </svg>
        <div className="relative flex max-w-[560px] flex-col gap-6 px-7 py-12 sm:px-14 sm:py-[72px]">
          <svg viewBox="0 0 100 100" width="56" height="56" aria-hidden="true">
            <circle cx="50" cy="50" r="39" fill="none" stroke="#F6F4EC" strokeWidth="22" />
            <circle cx="50" cy="50" r="28" fill="#FF6A4D" />
          </svg>
          <h1 className="mf-d text-[44px] sm:text-[60px]">Your profile is ready.</h1>
          <p className="text-[17px] leading-relaxed sm:text-[19px]" style={{ color: '#DCE3D5' }}>
            We will use it to surface opportunities that fit your work. It stays private, and you can
            change or delete it whenever you like.
          </p>
          <div className="mt-1 flex flex-wrap gap-3.5">
            <Link href="/recommendations" className="px-[22px] py-[14px] text-[15px] font-bold" style={{ background: '#FF6A4D', color: '#121412' }}>
              Explore opportunities for me
            </Link>
            <Link href="/saved" className="px-[22px] py-[13px] text-[15px] font-bold" style={{ border: '1.5px solid #8FA487', color: '#F6F4EC' }}>
              View my saved opportunities
            </Link>
          </div>
          <p className="mt-1 text-[14px]">
            <Link href="/profile" className="underline underline-offset-4" style={{ color: '#DCE3D5' }}>Review or edit my profile</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
