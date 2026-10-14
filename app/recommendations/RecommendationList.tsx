'use client'

import Link from 'next/link'
import { track } from '@/lib/analytics'
import SaveButton from '@/app/components/SaveButton'
import StatusBadge from '@/app/components/StatusBadge'

export type RecItem = {
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
  reasons: string[]
}

/** A short deadline date, shown only when there is a concrete one. */
function deadlineText(i: RecItem): string | null {
  if (!i.deadline) return null
  const d = new Date(i.deadline)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * A recommendation card. Mirrors the grants-page card's information hierarchy —
 * status first, then name, funder and the key facts — stripped to what matters
 * at a glance, with the "why this matched you" note kept at the foot.
 */
export default function RecommendationList({ items }: { items: RecItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {items.map((g) => {
        const kicker = [g.funding_type, g.cci_sector].filter(Boolean).join(' · ')
        const dl = deadlineText(g)
        return (
          <div key={g.id} className="mf-card mf-card-hover flex flex-col gap-3 p-6">
            <div className="flex items-start justify-between gap-3">
              <span className="mf-lbl">{kicker || 'Opportunity'}</span>
              <SaveButton opportunityId={g.id} from="list" />
            </div>

            <StatusBadge opportunity={g} frequency={g.programme_frequency} frequencyDetail={g.frequency_detail} size="sm" />

            <Link
              href={`/grants/${g.slug ?? g.id}`}
              onClick={() => track({ name: 'recommendation_opened' })}
              className="text-[20px] font-bold leading-tight hover:text-[var(--accent-deep)]"
              style={{ fontWeight: 700 }}
            >
              {g.name}
            </Link>
            {g.funder && <div className="text-[14px]" style={{ color: 'var(--graphite)' }}>{g.funder}</div>}

            {(g.amount || dl) && (
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {g.amount && (
                  <div>
                    <span className="mf-lbl" style={{ color: '#8FA487' }}>Award</span>
                    <div className="text-[14px] font-semibold leading-snug" style={{ color: 'var(--forest)' }}>{g.amount}</div>
                  </div>
                )}
                {dl && (
                  <div>
                    <span className="mf-lbl" style={{ color: '#8FA487' }}>Deadline</span>
                    <div className="text-[14px] font-semibold leading-snug">{dl}</div>
                  </div>
                )}
              </div>
            )}

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
