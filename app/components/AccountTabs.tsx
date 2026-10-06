'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * The account-area sub-navigation (For you / Saved / My profile), shown as an
 * ink strip directly under the main header — the design's secondary nav. Like
 * the main header it stays ink in both themes, so its colours are fixed.
 */
const TABS = [
  { href: '/recommendations', label: 'For you' },
  { href: '/saved', label: 'Saved' },
  { href: '/profile', label: 'My profile' },
]

export default function AccountTabs() {
  const pathname = usePathname()
  return (
    <div
      className="sticky top-14 z-20 border-b border-white/10 sm:top-16"
      style={{ background: '#121412' }}
    >
      <nav
        aria-label="My Funding"
        className="mx-auto flex max-w-6xl gap-5 px-5 text-[11px] font-black uppercase tracking-[0.1em] sm:gap-7 sm:text-[12px] sm:tracking-[0.12em]"
      >
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`)
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? 'page' : undefined}
              className="pt-3.5 pb-[7px] transition-colors"
              style={{
                color: active ? '#F6F4EC' : '#8FA487',
                borderBottom: active ? '2px solid #FF6A4D' : '2px solid transparent',
              }}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
