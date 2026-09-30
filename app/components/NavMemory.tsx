'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Remembers whether the visitor has moved between pages *within* the site this
 * tab-session. That is the one fact the back arrow needs: if there is an in-app
 * page behind you, "back" returns you to it — with your scroll and filters
 * intact — and if there isn't (you arrived straight from Google or a shared
 * link), the arrow falls back to the full list instead of bouncing you off-site.
 *
 * The flag is set only on a *later* page, never the first one the tab loads, so
 * a direct arrival is never mistaken for browsing.
 */
export const NAV_FLAG = 'ona:internalNav'

export default function NavMemory() {
  const pathname = usePathname()
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      // The page the tab opened on. Not a navigation — don't mark it.
      first.current = false
      return
    }
    try {
      sessionStorage.setItem(NAV_FLAG, '1')
    } catch {
      // Private mode or storage disabled: the arrow simply falls back to the
      // list. No error to the visitor.
    }
  }, [pathname])

  return null
}
