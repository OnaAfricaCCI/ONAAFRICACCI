'use client'

import Link from 'next/link'
import { useAccount } from '@/app/components/AccountProvider'

export type SavedItem = {
  id: string
  name: string
  slug: string | null
  funder: string | null
  funding_type: string | null
  cci_sector: string | null
  /** A short status label when the opportunity is no longer open, else null. */
  closedLabel: string | null
  missing?: boolean
}

export default function SavedList({ items }: { items: SavedItem[] }) {
  const { isSaved, toggleSave } = useAccount()
  const visible = items.filter((i) => isSaved(i.id))

  if (visible.length === 0) {
    return (
      <div className="border-2 border-dashed border-[var(--line)] p-12 text-center">
        <p className="mf-d text-[20px]">Nothing saved yet.</p>
        <p className="mt-2 text-[14px]" style={{ color: 'var(--graphite)' }}>Use the Save pennant on any opportunity to keep it here.</p>
        <Link href="/grants" className="mf-btn-outline mt-5">Browse opportunities</Link>
      </div>
    )
  }

  return (
    <div style={{ borderTop: '1px solid #DCE3D5' }}>
      {visible.map((g, i) => {
        const meta = [g.funder, g.funding_type, g.cci_sector].filter(Boolean).join(' · ')
        const n = String(i + 1).padStart(2, '0')
        return (
          <div
            key={g.id}
            className="grid items-center gap-x-4 gap-y-1 py-[18px] sm:grid-cols-[auto_1fr_auto_auto]"
            style={{ borderBottom: '1px solid #DCE3D5' }}
          >
            <span className="mf-lbl tabular-nums" style={{ color: '#8FA487' }}>{n}</span>
            <div className="min-w-0">
              {g.missing ? (
                <div className="text-[18px] font-bold" style={{ color: 'var(--ink-soft)' }}>{g.name || 'This opportunity is no longer listed'}</div>
              ) : (
                <Link href={`/grants/${g.slug ?? g.id}`} className="text-[18px] font-bold leading-tight hover:text-[var(--accent-deep)]">{g.name}</Link>
              )}
              {meta && <div className="text-[13px]" style={{ color: 'var(--graphite)' }}>{meta}</div>}
            </div>
            <span className="mf-lbl" style={{ color: g.closedLabel ? 'var(--accent-deep)' : '#5F7359' }}>
              {g.closedLabel ?? 'Open'}
            </span>
            <button
              type="button"
              onClick={() => void toggleSave(g.id, 'saved_page')}
              className="justify-self-start text-[14px] font-bold underline underline-offset-2 sm:justify-self-end"
              style={{ color: 'var(--accent-deep)' }}
            >
              Remove<span className="sr-only"> {g.name}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
