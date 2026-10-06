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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {items.map((g) => {
        const kicker = [g.funding_type, g.cci_sector].filter(Boolean).join(' · ')
        return (
          <div key={g.id} className="mf-card mf-card-hover flex flex-col gap-3 p-6">
            <div className="flex items-start justify-between gap-3">
              <span className="mf-lbl">{kicker || 'Opportunity'}</span>
              <SaveButton opportunityId={g.id} from="list" />
            </div>
            <Link
              href={`/grants/${g.slug ?? g.id}`}
              onClick={() => track({ name: 'recommendation_opened' })}
              className="text-[20px] font-bold leading-tight hover:text-[var(--accent-deep)]"
              style={{ fontWeight: 700 }}
            >
              {g.name}
            </Link>
            {g.funder && <div className="text-[14px]" style={{ color: 'var(--graphite)' }}>{g.funder}</div>}
            {g.reasons.length > 0 && (
              <div className="mt-auto p-3 text-[13px] leading-relaxed" style={{ background: 'var(--bg)', borderLeft: '3px solid #8FA487', color: 'var(--ink)' }}>
                {g.reasons.join(' ')}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
