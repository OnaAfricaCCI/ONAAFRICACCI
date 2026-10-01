'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { NAV_LINKS } from '@/lib/nav'

/**
 * The header menu on phones. With several sections now, a row of links no
 * longer fits a small screen, so below the `md` breakpoint the links collapse
 * behind a hamburger and open as a full-width panel under the header.
 *
 * Closes when you pick a link, press Escape, or tap outside it — and the button
 * itself doubles as the close (X) control while open.
 */
export default function MobileMenu() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  // Close after navigating to a new page.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // While open: close on Escape or a tap outside the menu.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return (
    <div ref={wrap} className="md:hidden">
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center text-[#f6f4ec] transition-colors hover:text-[var(--accent)]"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {open ? (
            <>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full z-30 border-t border-white/10 bg-[#121412] px-5 pb-6 pt-1 shadow-[0_16px_32px_rgba(0,0,0,0.35)]"
        >
          <nav className="flex flex-col">
            {NAV_LINKS.map((l) => {
              const active = pathname === l.href || pathname.startsWith(`${l.href}/`)
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className={`border-b border-white/10 py-3.5 text-[15px] font-bold uppercase tracking-[0.08em] transition-colors hover:text-[var(--accent)] ${
                    active ? 'text-[var(--accent)]' : 'text-[#dce3d5]'
                  }`}
                >
                  {l.label}
                </Link>
              )
            })}
          </nav>
          <Link
            href="/#digest"
            className="mt-5 inline-block bg-[var(--accent)] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[#121412] transition-colors hover:bg-[#f6f4ec]"
          >
            Get the digest
          </Link>
        </div>
      )}
    </div>
  )
}
