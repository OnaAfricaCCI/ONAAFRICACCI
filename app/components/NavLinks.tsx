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

/** Header navigation. The active section carries the red rule — the one
 *  permitted red element in the header. */
export default function NavLinks() {
  const pathname = usePathname()
  return (
    <nav className="flex basis-full gap-5 overflow-x-auto whitespace-nowrap text-[13px] font-bold uppercase tracking-[0.06em] [scrollbar-width:none] sm:basis-auto sm:gap-6 [&::-webkit-scrollbar]:hidden">
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`)
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={`border-b-[3px] pb-0.5 transition-colors hover:text-[var(--accent)] ${
              active ? 'border-[var(--accent)]' : 'border-transparent'
            }`}
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
