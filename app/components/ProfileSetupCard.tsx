'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { track } from '@/lib/analytics'

/**
 * A quiet, dismissible nudge to set up a profile, shown on the saved page when
 * the user has no profile yet. Dismissal is remembered (localStorage) so it
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
    <div className="mb-8 flex flex-col gap-3 border-2 border-[var(--ink)] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-[family-name:var(--font-display)] text-lg leading-snug">
          Help Ona find opportunities relevant to you.
        </p>
        <p className="mt-1 text-sm text-[var(--ink-2)]">
          A short, private profile means better matches. It takes a minute.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Link
          href="/profile/setup"
          onClick={() => track({ name: 'profile_invite_click', entry_point: 'saved_page' })}
          className="bg-[var(--accent)] px-4 py-2.5 text-[13px] font-bold uppercase tracking-[0.06em] text-[#121412] hover:bg-[var(--ink)] hover:text-[var(--bg)]"
        >
          Set up profile
        </Link>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(KEY, '1')
            } catch {}
            setHidden(true)
          }}
          className="text-[13px] font-semibold text-[var(--ink-soft)] underline underline-offset-4 hover:text-[var(--accent)]"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
