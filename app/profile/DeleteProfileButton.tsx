'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { track } from '@/lib/analytics'

/**
 * Delete the grant-seeker PROFILE only. The account and saved opportunities are
 * kept — the copy and the confirm dialog make that distinction explicit.
 */
export default function DeleteProfileButton() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function doDelete() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/profile', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      track({ name: 'profile_deleted' })
      router.push('/profile?deleted=1')
      router.refresh()
    } catch {
      setError('Could not delete your profile just now. Please try again.')
      setBusy(false)
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-[13px] font-semibold text-[var(--terracotta)] underline underline-offset-4 hover:text-[var(--accent)]"
      >
        Delete my profile
      </button>
    )
  }

  return (
    <div className="border-2 border-[var(--terracotta)] p-5">
      <p className="text-sm leading-relaxed">
        Delete your profile and the preferences in it? <strong>Your account and your saved
        opportunities will stay.</strong> You can create a new profile later. This can’t be undone.
      </p>
      {error && <p role="alert" className="mt-2 text-sm text-[var(--terracotta)]">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={doDelete}
          disabled={busy}
          className="bg-[var(--terracotta)] px-4 py-2.5 text-[13px] font-bold uppercase tracking-[0.06em] text-[var(--bg)] disabled:opacity-60"
        >
          {busy ? 'Deleting…' : 'Yes, delete my profile'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="border-2 border-[var(--ink)] px-4 py-2.5 text-[13px] font-bold uppercase tracking-[0.06em]"
        >
          Keep my profile
        </button>
      </div>
    </div>
  )
}
