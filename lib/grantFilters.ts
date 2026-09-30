/**
 * The grants list's filter state, expressed in the web address.
 *
 * Keeping the filters in the URL (`/grants?q=film&sort=za`) does two things:
 * a filtered view becomes a real link someone can share or bookmark, and — the
 * reason this exists — when a visitor opens a grant and clicks "← All grants",
 * the browser returns to the exact address they left, so their search and
 * filters come back with them instead of resetting.
 *
 * The server page reads these off the request and hands them to the explorer as
 * its starting state, so the very first HTML already reflects the filter (no
 * flash, and no hydration mismatch). The explorer then keeps the URL in step as
 * the visitor changes things.
 *
 * Only values that differ from the default appear in the URL, so a plain
 * `/grants` stays clean — and that clean address is still the full, crawlable
 * list search engines index.
 */

export type AmountBand = 'all' | 'under-10k' | '10k-50k' | '50k-250k' | 'over-250k'
export type SortKey = 'az' | 'za' | 'deadline' | 'newest'

export type GrantFilters = {
  search: string
  sector: string
  country: string
  fundingType: string
  deadlineType: string
  amountBand: AmountBand
  sortBy: SortKey
  showExpired: boolean
}

export const DEFAULT_FILTERS: GrantFilters = {
  search: '',
  sector: 'all',
  country: 'all',
  fundingType: 'all',
  deadlineType: 'all',
  amountBand: 'all',
  sortBy: 'az',
  showExpired: false,
}

const AMOUNT_BANDS: AmountBand[] = ['all', 'under-10k', '10k-50k', '50k-250k', 'over-250k']
const SORT_KEYS: SortKey[] = ['az', 'za', 'deadline', 'newest']

// Short URL keys, so a shared link stays readable.
const KEY = {
  search: 'q',
  sector: 'sector',
  country: 'place',
  fundingType: 'type',
  deadlineType: 'when',
  amountBand: 'amount',
  sortBy: 'sort',
  showExpired: 'expired',
} as const

/**
 * Read filters from a URLSearchParams (or anything with the same `get`).
 * Unknown or malformed values fall back to the default, so a hand-edited or
 * stale URL can never put the list into an impossible state.
 */
export function parseGrantFilters(params: {
  get(key: string): string | null
}): GrantFilters {
  const amount = params.get(KEY.amountBand) as AmountBand | null
  const sort = params.get(KEY.sortBy) as SortKey | null
  return {
    search: params.get(KEY.search) ?? '',
    sector: params.get(KEY.sector) || 'all',
    country: params.get(KEY.country) || 'all',
    fundingType: params.get(KEY.fundingType) || 'all',
    deadlineType: params.get(KEY.deadlineType) || 'all',
    amountBand: amount && AMOUNT_BANDS.includes(amount) ? amount : 'all',
    sortBy: sort && SORT_KEYS.includes(sort) ? sort : 'az',
    showExpired: params.get(KEY.showExpired) === '1',
  }
}

/** Build the query string (no leading `?`) with only the non-default values. */
export function grantFiltersToQuery(f: GrantFilters): string {
  const p = new URLSearchParams()
  if (f.search.trim()) p.set(KEY.search, f.search)
  if (f.sector !== 'all') p.set(KEY.sector, f.sector)
  if (f.country !== 'all') p.set(KEY.country, f.country)
  if (f.fundingType !== 'all') p.set(KEY.fundingType, f.fundingType)
  if (f.deadlineType !== 'all') p.set(KEY.deadlineType, f.deadlineType)
  if (f.amountBand !== 'all') p.set(KEY.amountBand, f.amountBand)
  if (f.sortBy !== 'az') p.set(KEY.sortBy, f.sortBy)
  if (f.showExpired) p.set(KEY.showExpired, '1')
  return p.toString()
}
