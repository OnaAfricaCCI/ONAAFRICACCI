/**
 * The funders directory's filter state, expressed in the web address.
 *
 * Same idea as the grants list (see grantFilters.ts): the filters live in the
 * URL so a filtered view is shareable, and returning from a funder profile
 * restores the exact view. The server page reads these off the request and
 * seeds the explorer, which then keeps the URL in step.
 *
 * Only values that differ from the default appear in the URL, so a plain
 * `/funders` stays clean and crawlable.
 */

export type FunderFilters = {
  search: string
  type: string
  region: string
  sector: string
  support: string
}

export const DEFAULT_FUNDER_FILTERS: FunderFilters = {
  search: '',
  type: 'all',
  region: 'all',
  sector: 'all',
  support: 'all',
}

// Short URL keys, so a shared link stays readable.
const KEY = {
  search: 'q',
  type: 'type',
  region: 'region',
  sector: 'sector',
  support: 'support',
} as const

/** Read filters from a URLSearchParams (or anything with the same `get`). */
export function parseFunderFilters(params: {
  get(key: string): string | null
}): FunderFilters {
  return {
    search: params.get(KEY.search) ?? '',
    type: params.get(KEY.type) || 'all',
    region: params.get(KEY.region) || 'all',
    sector: params.get(KEY.sector) || 'all',
    support: params.get(KEY.support) || 'all',
  }
}

/** Build the query string (no leading `?`) with only the non-default values. */
export function funderFiltersToQuery(f: FunderFilters): string {
  const p = new URLSearchParams()
  if (f.search.trim()) p.set(KEY.search, f.search)
  if (f.type !== 'all') p.set(KEY.type, f.type)
  if (f.region !== 'all') p.set(KEY.region, f.region)
  if (f.sector !== 'all') p.set(KEY.sector, f.sector)
  if (f.support !== 'all') p.set(KEY.support, f.support)
  return p.toString()
}
