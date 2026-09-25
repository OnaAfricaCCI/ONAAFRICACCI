'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/grants', label: 'Grants' },
  { href: '/funders', label: 'Funders' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

/**
 * Header navigation.
 *
 * The header is ink on every theme, so these colours are fixed rather than
 * themed: sage for resting links, ivory for the section you are in, and the
 * one coral element permitted in the header as its underline.
 */
export default function NavLinks() {
  const pathname = usePathname()
  return (
    <nav className="flex min-w-0 flex-1 gap-5 overflow-x-auto whitespace-nowrap text-[13px] font-bold uppercase tracking-[0.08em] [scrollbar-width:none] sm:flex-none sm:gap-6 [&::-webkit-scrollbar]:hidden">
      {LINKS.map((l) => {
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
