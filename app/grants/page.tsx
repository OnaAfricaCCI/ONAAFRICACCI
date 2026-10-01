import { supabase } from '@/lib/supabase'
import { isPublishableGrant } from '@/lib/quality'
import { parseGrantFilters } from '@/lib/grantFilters'
import { isGone } from '@/lib/deadline'
import GrantsExplorer, { type Opportunity } from './GrantsExplorer'

export const dynamic = 'force-dynamic'

/**
 * The grants list, fetched on the server.
 *
 * This page used to fetch in the browser, so a crawler was handed the words
 * "Finding opportunities…" and nothing else. Now the server fetches the grants
 * and ships them in the HTML, and GrantsExplorer layers the filtering on top.
 * A search engine reads the full list and follows each title to the grant's own
 * page; a visitor still gets the live filter.
 */

/**
 * Exactly the columns the list renders. `select('*')` shipped raw_text — the
 * entire scraped page of every grant — and other unused fields: 65 KB of a
 * 184 KB payload, read by nothing.
 */
const COLUMNS =
  'id,name,funder,deadline,amount,eligible_countries,cci_sector,funding_type,' +
  'deadline_type,application_link,description,created_at,link_state,link_checked_at,' +
  'eligible_who,eligible_conditions,eligibility_reviewed,slug'

/** A ceiling on one request: 144 grants is fine, 3,000 would be a huge payload. */
const MAX_ROWS = 500

export default async function GrantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { data, error } = await supabase
    .from('opportunities')
    .select(COLUMNS)
    .not('description', 'is', null)
    .order('created_at', { ascending: false })
    .limit(MAX_ROWS)

  if (error) {
    console.error('grants list query failed:', error.message)
  }
  // Drop one-time calls that closed over a week ago on the server, so they are
  // never in the HTML a crawler reads. Recurring/rolling (and recently-closed,
  // for the toggle) are kept; the explorer handles the rest client-side.
  const rows = ((data as unknown as Opportunity[]) ?? [])
    .filter(isPublishableGrant)
    .filter((r) => !isGone(r.deadline, r.deadline_type))

  // Filters travel in the URL so a shared link and the browser Back button both
  // land on the same filtered view. Seeding the explorer from them here means
  // the first HTML already matches, so there is no flash and no hydration gap.
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(await searchParams)) {
    if (typeof v === 'string') sp.set(k, v)
    else if (Array.isArray(v) && v[0]) sp.set(k, v[0])
  }
  const initialFilters = parseGrantFilters(sp)

  return (
    <GrantsExplorer
      initialGrants={rows}
      truncated={rows.length >= MAX_ROWS}
      initialFilters={initialFilters}
    />
  )
}
