'use client'

import Link from 'next/link'
import { track } from '@/lib/analytics'
import SaveButton from '@/app/components/SaveButton'

export type RecItem = {
  id: string
  name: string
  slug: string | null
  funder: string | null
  funding_type: string | null
  cci_sector: string | null
  reasons: string[]
}

export default function RecommendationList({ items }: { items: RecItem[] }) {
  return (
    <ul className="grid gap-px border border-[var(--ink)] bg-[var(--ink)]">
      {items.map((g) => {
        const meta = [g.funder, [g.funding_type, g.cci_sector].filter(Boolean).join(' · ')].filter(Boolean).join('  ·  ')
        return (
          <li key={g.id} className="bg-[var(--bg)] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <Link
                  href={`/grants/${g.slug ?? g.id}`}
                  onClick={() => track({ name: 'recommendation_opened' })}
                  className="font-[family-name:var(--font-display)] text-[18px] leading-snug hover:text-[var(--accent)]"
                >
                  {g.name}
                </Link>
                {meta && <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">{meta}</span>}
                {g.reasons.length > 0 && (
                  <p className="mt-2 text-sm text-[var(--sage-deep)]">
                    <span className="font-semibold">Relevant to your preferences.</span>{' '}
                    {g.reasons.join(' ')}
                  </p>
                )}
              </div>
              <div className="shrink-0">
                <SaveButton opportunityId={g.id} from="list" />
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
