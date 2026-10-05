import { supabaseAdmin } from '@/lib/supabase-admin'
import { parseGrantFilters } from '@/lib/grantFilters'
import { expandScope } from '@/lib/eligibility'
import GrantsExplorer, { type Opportunity } from './GrantsExplorer'

export const dynamic = 'force-dynamic'

/**
 * The grants list — searched, filtered, sorted and paginated ON THE SERVER.
 *
 * It used to ship the whole directory in one response and filter in the browser.
 * Now the database does the work and returns one page (24) at a time. That keeps
 * the page small, stops a single request harvesting the entire directory, and
 * still serves a crawlable list (each grant also has its own indexable page).
 *
 * The browser-side smart filters live on here as database predicates:
 *   - country/region scope → `scopes && expandScope(selected)` (mirrors matchesScope)
 *   - amount band          → `amount_value` range
 *   - type-aware expiry     → fixed calls past the cutoff drop out; recurring/rolling stay
 *
 * Read with the service-role client: the public key can no longer read the raw
 * tables, and this page never hands those internal columns to the browser.
 */
const COLUMNS =
  'id,name,funder,deadline,amount,eligible_countries,cci_sector,funding_type,' +
  'deadline_type,application_link,description,created_at,link_state,link_checked_at,' +
  'eligible_who,eligible_conditions,eligibility_reviewed,slug'

const PAGE_SIZE = 24
const AMOUNT_RANGES: Record<string, [number, number | null]> = {
  'under-10k': [0, 10_000],
  '10k-50k': [10_000, 50_000],
  '50k-250k': [50_000, 250_000],
  'over-250k': [250_000, null],
}

export default async function GrantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(await searchParams)) {
    if (typeof v === 'string') sp.set(k, v)
    else if (Array.isArray(v) && v[0]) sp.set(k, v[0])
  }
  const filters = parseGrantFilters(sp)
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1)

  // Type-aware expiry. Default drops every fixed call whose date has passed;
  // "show recently closed" keeps the last week. Recurring/rolling/unknown always stay.
  const graceDays = filters.showExpired ? 7 : 0
  const cutoff = new Date(Date.now() - graceDays * 86_400_000).toISOString().slice(0, 10)

  let q = supabaseAdmin
    .from('opportunities')
    .select(COLUMNS, { count: 'exact' })
    .not('description', 'is', null)
    .or(`deadline_type.neq.fixed,deadline.is.null,deadline.gte.${cutoff}`)

  if (filters.sector !== 'all') q = q.eq('cci_sector', filters.sector)
  if (filters.fundingType !== 'all') q = q.eq('funding_type', filters.fundingType)
  if (filters.deadlineType !== 'all') q = q.eq('deadline_type', filters.deadlineType)
  if (filters.country !== 'all') {
    const tags = expandScope(filters.country)
    if (tags.length) q = q.overlaps('scopes', tags)
  }
  if (filters.amountBand !== 'all') {
    const [lo, hi] = AMOUNT_RANGES[filters.amountBand]
    q = q.gte('amount_value', lo)
    if (hi != null) q = q.lt('amount_value', hi)
  }
  if (filters.search.trim()) {
    const s = filters.search.trim().replace(/[%,()]/g, ' ')
    q = q.or(`name.ilike.*${s}*,funder.ilike.*${s}*,description.ilike.*${s}*,cci_sector.ilike.*${s}*`)
  }

  if (filters.sortBy === 'za') q = q.order('name', { ascending: false })
  else if (filters.sortBy === 'newest') q = q.order('created_at', { ascending: false })
  else if (filters.sortBy === 'deadline') q = q.order('deadline', { ascending: true, nullsFirst: false })
  else q = q.order('name', { ascending: true })

  const from = (page - 1) * PAGE_SIZE
  const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1)
  if (error) console.error('grants list query failed:', error.message)
  const rows = (data as unknown as Opportunity[]) ?? []
  const total = count ?? 0

  // The filter dropdowns need the full set of options, not just this page's —
  // a tiny three-column read over the whole table.
  const { data: opts } = await supabaseAdmin
    .from('opportunities')
    .select('cci_sector,funding_type,deadline_type')
    .not('description', 'is', null)
  const distinct = (key: 'cci_sector' | 'funding_type' | 'deadline_type') =>
    [...new Set((opts ?? []).map((o) => (o as Record<string, string | null>)[key]).filter(Boolean))].sort() as string[]

  return (
    <GrantsExplorer
      initialGrants={rows}
      initialFilters={filters}
      page={page}
      pageSize={PAGE_SIZE}
      total={total}
      sectors={distinct('cci_sector')}
      fundingTypes={distinct('funding_type')}
      deadlineTypes={distinct('deadline_type')}
    />
  )
}
