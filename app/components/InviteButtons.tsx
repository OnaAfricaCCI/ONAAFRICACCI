'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { track } from '@/lib/analytics'
import { useAccount } from './AccountProvider'

/**
 * The "create a profile" invitation buttons, with analytics. Records a view on
 * mount and a click, tagged by entry point (no personal data). If the visitor
 * is already signed in with a profile, the primary action points at their
 * recommendations instead of setup.
 */
export default function InviteButtons({
  entryPoint,
  primaryHref = '/profile/setup',
  primaryLabel = 'Create my profile',
  secondaryHref = '/grants',
  secondaryLabel = 'Keep browsing',
}: {
  entryPoint: string
  primaryHref?: string
  primaryLabel?: string
  secondaryHref?: string
  secondaryLabel?: string
}) {
  const { user } = useAccount()

  useEffect(() => {
    track({ name: 'profile_invite_view', entry_point: entryPoint })
  }, [entryPoint])

  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href={primaryHref}
        onClick={() => track({ name: 'profile_invite_click', entry_point: entryPoint })}
        className="bg-[var(--accent)] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.06em] text-[#121412] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
      >
        {primaryLabel}
      </Link>
      <Link
        href={secondaryHref}
        className="border-2 border-[var(--ink)] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)]"
      >
        {secondaryLabel}
      </Link>
      {user && (
        <Link
          href="/profile"
          className="self-center text-[13px] font-semibold text-[var(--terracotta)] underline underline-offset-4 hover:text-[var(--accent)]"
        >
          Open my profile
        </Link>
      )}
    </div>
  )
}
