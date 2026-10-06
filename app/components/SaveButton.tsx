'use client'

import { useAccount } from './AccountProvider'

/**
 * Save / remove an opportunity. Signed-in users save immediately; signed-out
 * users get the sign-in dialog (and the save completes once after the magic
 * link). The button reflects the live saved state from AccountProvider.
 */
export default function SaveButton({
  opportunityId,
  from,
  variant = 'card',
}: {
  opportunityId: string
  from: 'list' | 'detail' | 'saved_page'
  variant?: 'card' | 'detail'
}) {
  const { isSaved, toggleSave } = useAccount()
  const saved = isSaved(opportunityId)

  const base =
    'inline-flex items-center gap-1.5 border-2 font-bold uppercase tracking-[0.06em] transition-colors'
  const size = variant === 'detail' ? 'px-4 py-2 text-[13px]' : 'px-3 py-1.5 text-[11px]'
  const tone = saved
    ? 'border-[var(--sage-deep)] bg-[var(--sage-mist)] text-[var(--ink)]'
    : 'border-[var(--ink)] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)]'

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void toggleSave(opportunityId, from === 'saved_page' ? 'saved_page' : from)
      }}
      aria-pressed={saved}
      className={`${base} ${size} ${tone}`}
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M5 3h10v14l-5-3-5 3V3z" strokeLinejoin="round" />
      </svg>
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}
