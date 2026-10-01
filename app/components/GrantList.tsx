import Link from 'next/link'
import { slugify } from '@/lib/slug'

/**
 * A compact, linked list of grants — used for "more from this funder",
 * "related opportunities" and the list of a funder's own opportunities.
 *
 * Presentational only: it renders whatever facts it is handed and invents
 * nothing. Each row links to the grant's own page by its stored slug (falling
 * back to the name, so a not-yet-slugged grant still resolves).
 */
export type GrantListItem = {
  name: string
  slug: string | null
  funder?: string | null
  funding_type: string | null
  cci_sector: string | null
  deadline: string | null
  deadline_type: string | null
}

function href(g: GrantListItem): string {
  return `/grants/${g.slug || slugify(g.name)}`
}

function deadlineText(g: GrantListItem): string | null {
  if (g.deadline_type === 'rolling') return 'Rolling'
  if (!g.deadline) return g.deadline_type === 'recurring' ? 'Recurring' : null
  const d = new Date(g.deadline)
  if (isNaN(d.getTime())) return null
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000)
  // A recurring call's past date is its last round, not an expiry.
  if (g.deadline_type === 'recurring' && days < 0) return 'Recurring'
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  if (days >= 0 && days <= 30) return `${date} · ${days === 0 ? 'today' : `${days}d left`}`
  return date
}

export default function GrantList({
  items,
  showFunder = false,
}: {
  items: GrantListItem[]
  /** Show the funder name on each row (off when the list is already a funder's own grants). */
  showFunder?: boolean
}) {
  if (items.length === 0) return null
  return (
    <ul className="grid gap-px border border-[var(--ink)] bg-[var(--ink)]">
      {items.map((g) => {
        const meta = [g.funding_type, g.cci_sector].filter(Boolean).join(' · ')
        const dl = deadlineText(g)
        return (
          <li key={g.slug || g.name} className="bg-[var(--bg)]">
            <Link
              href={href(g)}
              className="group flex flex-col gap-1 p-4 transition-colors hover:bg-[var(--surface)] sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
            >
              <span className="min-w-0">
                <span className="font-[family-name:var(--font-display)] text-[17px] leading-snug group-hover:text-[var(--accent)]">
                  {g.name}
                </span>
                {(meta || (showFunder && g.funder)) && (
                  <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                    {[showFunder ? g.funder : null, meta].filter(Boolean).join('  ·  ')}
                  </span>
                )}
              </span>
              {dl && (
                <span className="shrink-0 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-3)]">
                  {dl}
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
