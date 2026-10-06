'use client'

import Link from 'next/link'
import { useAccount } from '@/app/components/AccountProvider'
import SaveButton from '@/app/components/SaveButton'

export type SavedItem = {
  id: string
  name: string
  slug: string | null
  funder: string | null
  funding_type: string | null
  cci_sector: string | null
  /** A short status label when the opportunity is no longer open, else null. */
  closedLabel: string | null
  /** True when the opportunity row no longer exists (archived/removed). */
  missing?: boolean
}

export default function SavedList({ items }: { items: SavedItem[] }) {
  const { isSaved } = useAccount()
  // Reflect live un-saves: once removed it drops out of the list immediately.
  const visible = items.filter((i) => isSaved(i.id))

  if (visible.length === 0) {
    return (
      <div className="border-2 border-dashed border-[var(--line)] p-12 text-center">
        <p className="font-[family-name:var(--font-display)] text-xl">Nothing saved yet.</p>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          Use the Save button on any opportunity to keep it here.
        </p>
        <Link href="/grants" className="mt-5 inline-block border-2 border-[var(--ink)] px-4 py-2.5 text-[13px] font-bold uppercase tracking-[0.06em] hover:border-[var(--accent)]">
          Browse opportunities
        </Link>
      </div>
    )
  }

  return (
    <ul className="grid gap-px border border-[var(--ink)] bg-[var(--ink)]">
      {visible.map((g) => {
        const meta = [g.funder, [g.funding_type, g.cci_sector].filter(Boolean).join(' · ')].filter(Boolean).join('  ·  ')
        return (
          <li key={g.id} className="bg-[var(--bg)] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0">
                {g.missing ? (
                  <span className="font-[family-name:var(--font-display)] text-[17px] text-[var(--ink-soft)]">
                    {g.name || 'This opportunity is no longer listed'}
                  </span>
                ) : (
                  <Link href={`/grants/${g.slug ?? g.id}`} className="font-[family-name:var(--font-display)] text-[17px] leading-snug hover:text-[var(--accent)]">
                    {g.name}
                  </Link>
                )}
                {meta && <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">{meta}</span>}
                {g.closedLabel && (
                  <span className="mt-1 inline-block bg-[var(--line)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">
                    {g.closedLabel}
                  </span>
                )}
              </div>
              <div className="shrink-0">
                <SaveButton opportunityId={g.id} from="saved_page" />
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
