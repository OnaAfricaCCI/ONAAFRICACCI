'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { track } from '@/lib/analytics'
import { useAccount } from './AccountProvider'

/**
 * The "create a profile" invitation buttons (design styling), with analytics.
 * Records a view on mount and a click, tagged by entry point (no personal data).
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
    <div className="flex flex-wrap items-center gap-3.5">
      <Link
        href={primaryHref}
        onClick={() => track({ name: 'profile_invite_click', entry_point: entryPoint })}
        className="mf-btn"
      >
        {primaryLabel}
      </Link>
      <Link href={secondaryHref} className="mf-btn-outline">
        {secondaryLabel}
      </Link>
      {user && (
        <Link href="/profile" className="text-[15px] font-bold underline underline-offset-4" style={{ color: 'var(--accent-deep)' }}>
          Open my profile
        </Link>
      )}
    </div>
  )
}
