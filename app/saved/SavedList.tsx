'use client'

import Link from 'next/link'
import { useAccount } from '@/app/components/AccountProvider'
import { daysLeft } from '@/lib/deadline'

export type SavedItem = {
  id: string
  name: string
  slug: string | null
  funder: string | null
  funding_type: string | null
  cci_sector: string | null
  deadline: string | null
  deadline_type: string | null
  /** A short status label when the opportunity is no longer open, else null. */
  closedLabel: string | null
  missing?: boolean
}

/** A short deadline / status line for a saved row. */
function deadlineSnippet(i: SavedItem): { text: string; urgent: boolean } {
  if (i.missing) return { text: 'No longer listed', urgent: true }
  if (i.closedLabel) return { text: i.closedLabel, urgent: true }
  if (i.deadline_type === 'rolling') return { text: 'Rolling deadline', urgent: false }
  if (!i.deadline) return { text: i.deadline_type === 'recurring' ? 'Recurring' : 'Timing varies', urgent: false }
  const d = new Date(i.deadline)
  if (isNaN(d.getTime())) return { text: 'Open', urgent: false }
  const dl = daysLeft(i.deadline)
  if (i.deadline_type === 'recurring' && (dl ?? 0) < 0) return { text: 'Recurring', urgent: false }
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  if (dl !== null && dl >= 0 && dl <= 30) {
    return { text: `Closes ${date} · ${dl === 0 ? 'today' : `${dl}d left`}`, urgent: true }
  }
  return { text: `Closes ${date}`, urgent: false }
}

export default function SavedList({ items }: { items: SavedItem[] }) {
  const { isSaved, toggleSave } = useAccount()
  const visible = items.filter((i) => isSaved(i.id))

  if (visible.length === 0) {
    return (
      <div className="border-2 border-dashed border-[var(--line)] p-12 text-center">
        <p className="mf-d text-[20px]">Nothing saved yet.</p>
        <p className="mt-2 text-[14px]" style={{ color: 'var(--graphite)' }}>Use the Save pennant on any opportunity to keep it here.</p>
        <Link href="/grants" className="mf-btn-outline mt-5 cursor-pointer">Browse opportunities</Link>
      </div>
    )
  }

  return (
    <div style={{ borderTop: '1px solid #DCE3D5' }}>
      {visible.map((g, i) => {
        const meta = [g.funder, g.funding_type, g.cci_sector].filter(Boolean).join(' · ')
        const n = String(i + 1).padStart(2, '0')
        const dl = deadlineSnippet(g)
        const href = `/grants/${g.slug ?? g.id}`
        return (
          <div
            key={g.id}
            className="flex flex-col gap-3 py-[18px] sm:flex-row sm:items-start sm:justify-between sm:gap-6"
            style={{ borderBottom: '1px solid #DCE3D5' }}
          >
            <div className="flex min-w-0 gap-4">
              <span className="mf-lbl tabular-nums" style={{ color: '#8FA487' }}>{n}</span>
              <div className="min-w-0">
                {g.missing ? (
                  <div className="text-[18px] font-bold" style={{ color: 'var(--ink-soft)' }}>{g.name || 'This opportunity is no longer listed'}</div>
                ) : (
                  <Link href={href} className="cursor-pointer text-[18px] font-bold leading-tight hover:text-[var(--accent-deep)]">{g.name}</Link>
                )}
                {meta && <div className="mt-0.5 text-[13px]" style={{ color: 'var(--graphite)' }}>{meta}</div>}
                <div className="mt-1 text-[12px] font-bold uppercase tracking-[0.1em]" style={{ color: dl.urgent ? 'var(--accent-deep)' : '#5F7359' }}>
                  {dl.text}
                </div>
              </div>
            </div>

            {/* Actions — clearly clickable (pointer cursor, hover state) */}
            <div className="flex shrink-0 items-center gap-4 pl-8 sm:pl-0">
              {!g.missing && (
                <Link href={href} className="cursor-pointer text-[14px] font-bold underline underline-offset-2 hover:text-[var(--accent-deep)]">
                  Open
                </Link>
              )}
              <button
                type="button"
                onClick={() => void toggleSave(g.id, 'saved_page')}
                className="cursor-pointer text-[14px] font-bold underline underline-offset-2 hover:text-[var(--accent-deep)]"
                style={{ color: 'var(--accent-deep)' }}
              >
                Remove<span className="sr-only"> {g.name}</span>
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
