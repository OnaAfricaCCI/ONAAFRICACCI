'use client'

import Link from 'next/link'
import { useAccount } from '@/app/components/AccountProvider'
import { daysLeft } from '@/lib/deadline'
import StatusBadge from '@/app/components/StatusBadge'

export type SavedItem = {
  id: string
  name: string
  slug: string | null
  funder: string | null
  funding_type: string | null
  cci_sector: string | null
  amount: string | null
  deadline: string | null
  deadline_type: string | null
  application_status: string | null
  programme_frequency: string | null
  frequency_detail: string | null
  next_open_date: string | null
  /** A short status label when the opportunity is no longer open, else null. */
  closedLabel: string | null
  missing?: boolean
}

/**
 * The deadline line for a saved row. The status badge already carries the
 * status words, so this focuses on the concrete DATE and the countdown when a
 * close date is near — the thing a shortlist is for. Returns null when there is
 * no specific date to add.
 */
function deadlineLine(i: SavedItem): { text: string; urgent: boolean } | null {
  if (i.missing) return { text: 'No longer listed', urgent: true }
  if (!i.deadline) return null
  const d = new Date(i.deadline)
  if (isNaN(d.getTime())) return null
  const dl = daysLeft(i.deadline)
  if (dl !== null && dl < 0) return null // past date — the badge conveys closed/awaiting
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
        const dl = deadlineLine(g)
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

                {/* Same descriptors as the cards: status badge + cadence. */}
                {!g.missing && (
                  <div className="mt-2">
                    <StatusBadge opportunity={g} frequency={g.programme_frequency} frequencyDetail={g.frequency_detail} size="sm" />
                  </div>
                )}

                {/* Award + the deadline, with days-left when it's close. */}
                <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1">
                  {g.amount && (
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--forest)' }}>{g.amount}</span>
                  )}
                  {dl && (
                    <span className="text-[12px] font-bold uppercase tracking-[0.1em]" style={{ color: dl.urgent ? 'var(--accent-deep)' : '#5F7359' }}>
                      {dl.text}
                    </span>
                  )}
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
