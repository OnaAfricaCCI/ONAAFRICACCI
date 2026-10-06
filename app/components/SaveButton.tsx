'use client'

import { useAccount } from './AccountProvider'

/**
 * Save / remove an opportunity — the design's pennant control. Signed-in users
 * save immediately; signed-out users get the sign-in dialog (and the save
 * completes once after the magic link). Saved state is live from AccountProvider.
 *
 *  - 'card'  : a 34px pennant square (ink + coral when saved, outline when not)
 *  - 'detail': a labelled pennant button
 */
function Pennant({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"
      fill={filled ? '#FF6A4D' : 'none'} stroke={filled ? 'none' : 'currentColor'} strokeWidth="2">
      <path d="M6 3h12v18l-6-4-6 4z" strokeLinejoin="round" />
    </svg>
  )
}

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
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    void toggleSave(opportunityId, from === 'saved_page' ? 'saved_page' : from)
  }

  if (variant === 'detail') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        className="inline-flex cursor-pointer items-center gap-2 px-[18px] py-[11px] text-[14px] font-bold"
        style={
          saved
            ? { background: 'var(--ink)', color: 'var(--bg)', border: 'none' }
            : { background: 'transparent', color: 'var(--ink)', border: '1.5px solid var(--ink)' }
        }
      >
        <Pennant filled={saved} />
        {saved ? 'Saved' : 'Save to shortlist'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      title={saved ? 'Saved' : 'Save'}
      className="flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center"
      style={
        saved
          ? { background: 'var(--ink)', color: 'var(--bg)', border: 'none' }
          : { background: 'transparent', color: 'var(--ink)', border: '1.5px solid var(--ink)' }
      }
    >
      <Pennant filled={saved} />
    </button>
  )
}
