'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

/** Routes that never show the control. */
const HIDDEN_ON = ['/contact']

export default function BackToTop() {
  const [show, setShow] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // Appear once a third of the way down the page. React bails out when the
    // boolean is unchanged, so this stays cheap on every scroll tick.
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      setShow(scrollable > 400 && window.scrollY > scrollable / 3)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null

  return (
    <button
      type="button"
      aria-label="Back to top"
      tabIndex={show ? 0 : -1}
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
        })
      }
      className={`fixed bottom-6 right-6 z-20 flex h-11 w-11 items-center justify-center border border-[var(--line)] bg-[var(--paper)]/85 text-[var(--ink-soft)] shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-[var(--ink)] hover:text-[var(--ink)] ${
        show ? 'pointer-events-auto opacity-60 hover:opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
