'use client'

import Link from 'next/link'
import { useAccount } from './AccountProvider'

/**
 * The header's account control. Rendered on the client from the shared session
 * state (so it never forces the whole site to render dynamically, and SSR stays
 * cacheable). Before the session is known it shows the neutral "Find funding"
 * entry, which is also what signed-out visitors see.
 */
export default function AccountMenu() {
  const { user, ready } = useAccount()
  const link = 'text-[13px] font-semibold text-[#f6f4ec]/85 transition-colors hover:text-[var(--accent)]'

  if (!ready || !user) {
    return (
      <Link href="/find-funding" className={link}>
        Find funding<span className="hidden sm:inline"> for me</span>
      </Link>
    )
  }
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <Link href="/saved" className={link}>
        Saved
      </Link>
      <Link href="/profile" className={link}>
        Profile
      </Link>
    </div>
  )
}
