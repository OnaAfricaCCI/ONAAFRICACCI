'use client'

import { useRouter } from 'next/navigation'
import { NAV_FLAG } from './NavMemory'

/**
 * The "← All grants" / "← All funders" arrow on a detail page.
 *
 * It stays a real link to the list (so search engines follow it, and
 * open-in-new-tab and middle-click still work). But on a normal click, if the
 * visitor reached this page by browsing the site, it steps the browser *back*
 * to wherever they came from — restoring their scroll position and the filters
 * they had set, which a fresh trip to the list would throw away.
 *
 * If they arrived directly (no in-app history), it just follows the link to the
 * full list, so the arrow never sends anyone off the site.
 */
export default function BackLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: React.ReactNode
}) {
  const router = useRouter()

  function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Leave modified clicks alone: new tab, new window, download, etc.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

    let browsed = false
    try {
      browsed = sessionStorage.getItem(NAV_FLAG) === '1'
    } catch {
      browsed = false
    }

    if (browsed) {
      e.preventDefault()
      router.back()
    }
    // else: fall through to the plain <a href>, landing on the full list.
  }

  return (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  )
}
