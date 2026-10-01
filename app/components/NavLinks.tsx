'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_LINKS } from '@/lib/nav'

/**
 * Desktop header navigation (medium screens and up). On small screens it is
 * hidden and MobileMenu takes over, so a growing set of links never crowds a
 * phone header.
 *
 * The header is ink on every theme, so these colours are fixed rather than
 * themed: sage for resting links, ivory for the section you are in, and the
 * one coral element permitted in the header as its underline.
 */
export default function NavLinks() {
  const pathname = usePathname()
  return (
    <nav className="hidden items-center gap-5 whitespace-nowrap text-[13px] font-bold uppercase tracking-[0.08em] md:flex lg:gap-6">
      {NAV_LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`)
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={`border-b-[3px] pb-0.5 transition-colors hover:text-[var(--accent)] ${
              active
                ? 'border-[var(--accent)] text-[#f6f4ec]'
                : 'border-transparent text-[#dce3d5]'
            }`}
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
