import { supabaseAdmin } from '@/lib/supabase-admin'
import { parseFunderFilters } from '@/lib/funderFilters'
import FundersExplorer, { type FunderCard } from './FundersExplorer'

export const dynamic = 'force-dynamic'

/**
 * The funders directory — searched, filtered, sorted and paginated ON THE SERVER.
 *
 * It used to fetch the whole table in the browser (select('*')) and filter there.
 * Now the database does the work and returns one page (24) at a time: the page
 * stays small, a single request can't harvest the whole directory, and each
 * funder still has its own indexable profile page.
 */
const COLUMNS =
  'id,slug,name,description,funder_type,regions_of_focus,funding_types,logo_url'

const PAGE_SIZE = 24

export default async function FundersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(await searchParams)) {
    if (typeof v === 'string') sp.set(k, v)
    else if (Array.isArray(v) && v[0]) sp.set(k, v[0])
  }
  const filters = parseFunderFilters(sp)
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1)

  let q = supabaseAdmin
    .from('funders')
    .select(COLUMNS, { count: 'exact' })
    .eq('is_active', true)
    .not('description', 'is', null)

  if (filters.type !== 'all') q = q.eq('funder_type', filters.type)
  // regions_of_focus / cci_sectors / funding_types are array columns — a grant
  // matches when the column CONTAINS the chosen value.
  if (filters.region !== 'all') q = q.contains('regions_of_focus', [filters.region])
  if (filters.sector !== 'all') q = q.contains('cci_sectors', [filters.sector])
  if (filters.support !== 'all') q = q.contains('funding_types', [filters.support])
  if (filters.search.trim()) {
    const s = filters.search.trim().replace(/[%,()]/g, ' ')
    q = q.or(`name.ilike.*${s}*,description.ilike.*${s}*,notes.ilike.*${s}*`)
  }

  q = q.order('name', { ascending: true })

  const from = (page - 1) * PAGE_SIZE
  const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1)
  if (error) console.error('funders list query failed:', error.message)
  const rows = (data as unknown as FunderCard[]) ?? []
  const total = count ?? 0

  // The filter dropdowns need the full set of options, not just this page's —
  // a small read of the four filterable columns across the whole table.
  const { data: opts } = await supabaseAdmin
    .from('funders')
    .select('funder_type,regions_of_focus,cci_sectors,funding_types')
    .eq('is_active', true)
    .not('description', 'is', null)
  const rowsOpts = (opts ?? []) as Array<Record<string, unknown>>
  const distinctScalar = (key: string) =>
    [...new Set(rowsOpts.map((o) => o[key]).filter(Boolean))].sort() as string[]
  const distinctArray = (key: string) =>
    [...new Set(rowsOpts.flatMap((o) => (o[key] as string[] | null) ?? []))].sort() as string[]

  return (
    <FundersExplorer
      initialFunders={rows}
      initialFilters={filters}
      page={page}
      pageSize={PAGE_SIZE}
      total={total}
      types={distinctScalar('funder_type')}
      regions={distinctArray('regions_of_focus')}
      sectors={distinctArray('cci_sectors')}
      supports={distinctArray('funding_types')}
    />
  )
}
