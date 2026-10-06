'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { track } from '@/lib/analytics'

/**
 * Dismissible nudge to set up a profile (design: sage panel, ring mark), shown
 * on the saved page when there's no profile. Dismissal is remembered so it
 * doesn't nag during ordinary browsing.
 */
const KEY = 'ona.profileSetupCard.dismissed'

export default function ProfileSetupCard() {
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    try {
      // Read the dismissal once on mount — intentional.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHidden(localStorage.getItem(KEY) === '1')
    } catch {
      setHidden(false)
    }
    track({ name: 'profile_invite_view', entry_point: 'saved_page' })
  }, [])

  if (hidden) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-5 px-6 py-5" style={{ background: '#5F7359', color: '#F6F4EC' }}>
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 100 100" width="34" height="34" aria-hidden="true" style={{ flex: 'none' }}>
          <circle cx="50" cy="50" r="39" fill="none" stroke="#F6F4EC" strokeWidth="22" />
          <circle cx="50" cy="50" r="28" fill="#FF6A4D" />
        </svg>
        <div>
          <div className="mf-d text-[20px] sm:text-[22px]">Help Ona Funds find opportunities relevant to you.</div>
          <div className="mt-1 text-[14px]" style={{ color: '#DCE3D5' }}>Build a short profile in about two minutes. Optional, and private.</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/profile/setup"
          onClick={() => track({ name: 'profile_invite_click', entry_point: 'saved_page' })}
          className="px-[18px] py-3 text-[14px] font-bold"
          style={{ background: '#F6F4EC', color: '#121412' }}
        >
          Create my profile
        </Link>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => { try { localStorage.setItem(KEY, '1') } catch {} setHidden(true) }}
          className="text-[20px]"
          style={{ color: '#DCE3D5' }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
