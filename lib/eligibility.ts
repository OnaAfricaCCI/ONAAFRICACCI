/**
 * Turning messy eligibility text into a usable "where you're based" filter.
 *
 * `opportunities.eligible_countries` holds the funders' own wording, collected
 * from their sites and spreadsheets. It is not a clean country list — it holds
 * things like "Yes — many African countries", "Pan-African (continent-based)"
 * and "Rotating country list (Kenya, Nigeria, South Africa, Tanzania and
 * others)". Left as-is it produces 95 dropdown options, 83 of them used exactly
 * once, and it hides pan-African funding from anyone who picks a country.
 *
 * This module reads that text and derives a small set of scope tags. Nothing is
 * written back to the database and nothing shown on a grant card changes — the
 * cards still display the funder's own words. This is only about what the
 * filter offers and which grants it returns.
 *
 * The rule that matters: choosing a country returns grants naming that country
 * AND grants open across Africa or globally, because a Kenyan creative is
 * eligible for all three. Picking "Kenya" used to return 4 grants; it now
 * returns every grant they can actually apply to, with the Kenya-specific ones
 * first.
 */

export type ScopeGroup = 'scope' | 'region' | 'country'

export type ScopeOption = {
  /** Stable value stored in filter state and analytics. */
  value: string
  label: string
  group: ScopeGroup
}

/** The two continent-or-wider scopes. */
const AFRICA = 'africa'
const GLOBAL = 'global'

/**
 * Regions, and the wording that signals each one. Tested against lowercased
 * text, so "Yes — specified Eastern African countries" finds East Africa.
 */
const REGIONS: { value: string; label: string; patterns: RegExp[] }[] = [
  { value: 'east-africa', label: 'East Africa', patterns: [/east(ern)?[\s-]afric/] },
  { value: 'west-africa', label: 'West Africa', patterns: [/west(ern)?[\s-]afric/] },
  { value: 'southern-africa', label: 'Southern Africa', patterns: [/southern[\s-]afric/] },
  { value: 'north-africa', label: 'North Africa', patterns: [/north(ern)?[\s-]afric/, /\bmena\b/, /arab league/] },
  { value: 'francophone-africa', label: 'Francophone Africa', patterns: [/francophone/] },
  { value: 'sub-saharan', label: 'Sub-Saharan Africa', patterns: [/sub[\s-]?saharan/] },
]

/**
 * Countries actually named anywhere in the data, with the adjective forms the
 * funders use ("qualifying Moroccan spend", "Nigerian citizens").
 */
const COUNTRIES: { value: string; label: string; patterns: RegExp[] }[] = [
  { value: 'south-africa', label: 'South Africa', patterns: [/south[\s-]afric(a|an)\b/] },
  { value: 'nigeria', label: 'Nigeria', patterns: [/nigeria/] },
  { value: 'kenya', label: 'Kenya', patterns: [/kenya/] },
  { value: 'ghana', label: 'Ghana', patterns: [/ghana/] },
  { value: 'algeria', label: 'Algeria', patterns: [/algeria/] },
  { value: 'cote-divoire', label: 'Côte d’Ivoire', patterns: [/c[oô]te[\s-]?d[’'`]?ivoire/, /ivory coast/] },
  { value: 'morocco', label: 'Morocco', patterns: [/morocc/] },
  { value: 'namibia', label: 'Namibia', patterns: [/namibia/] },
  { value: 'senegal', label: 'Senegal', patterns: [/s[ée]n[ée]gal/] },
  { value: 'tanzania', label: 'Tanzania', patterns: [/tanzania/] },
  { value: 'uganda', label: 'Uganda', patterns: [/uganda/] },
  { value: 'zambia', label: 'Zambia', patterns: [/zambia/] },
]

/** Wording that means the fund reaches beyond Africa. */
const GLOBAL_PATTERNS = [
  /\bglobal\b/,
  /\binternational\b/,
  /\bworldwide\b/,
  /latin america/,
  /southeast asia/,
  /caribbean/,
  /\beurope(an)?\b/,
  /\buk\b|united kingdom/,
  /\bus\b|united states/,
]

/** The dropdown, in the order it is shown. */
export const SCOPE_OPTIONS: ScopeOption[] = [
  // Kept short: these two carry a count in the dropdown.
  { value: AFRICA, label: 'All of Africa', group: 'scope' },
  { value: GLOBAL, label: 'Worldwide', group: 'scope' },
  ...REGIONS.map((r) => ({ value: r.value, label: r.label, group: 'region' as const })),
  ...COUNTRIES.map((c) => ({ value: c.value, label: c.label, group: 'country' as const })),
]

export const SCOPE_GROUP_LABELS: Record<ScopeGroup, string> = {
  scope: 'Open to everyone',
  region: 'By region',
  country: 'By country',
}

/**
 * Read one grant's eligibility wording and return the scopes it covers.
 *
 * A bare "Yes" comes from a source column asking whether African applicants are
 * eligible, so it means Africa-wide — not "unknown".
 */
export function scopesFor(raw: string[] | null | undefined): Set<string> {
  const scopes = new Set<string>()
  if (!raw?.length) return scopes

  const text = raw.join(' · ').toLowerCase().replace(/\s+/g, ' ')

  // Countries and regions first, so what's left tells us whether the fund also
  // reaches the whole continent.
  let residue = text
  for (const c of COUNTRIES) {
    for (const p of c.patterns) {
      if (p.test(text)) {
        scopes.add(c.value)
        residue = residue.replace(new RegExp(p.source, 'g'), ' ')
        break
      }
    }
  }
  for (const r of REGIONS) {
    for (const p of r.patterns) {
      if (p.test(text)) {
        scopes.add(r.value)
        residue = residue.replace(new RegExp(p.source, 'g'), ' ')
        break
      }
    }
  }

  const global = GLOBAL_PATTERNS.some((p) => p.test(text))
  if (global) scopes.add(GLOBAL)

  // Africa-wide if Africa is still mentioned once the named countries and
  // regions are taken out.
  let africaWide = /afric|diaspora|all 54/.test(residue)

  // The wording comes from a column asking whether African applicants are
  // eligible, so an answer that starts "Yes" and names no particular place
  // ("Yes", "Yes — programme-country list applies") means the continent is in
  // scope. Not applied to worldwide funds, which keep their own scope so the
  // two options stay meaningfully different.
  if (!africaWide && !global && scopes.size === 0 && /^yes\b/.test(text)) africaWide = true

  if (africaWide) scopes.add(AFRICA)

  return scopes
}

/**
 * Does a grant with these scopes belong under the chosen filter?
 *
 * Choosing a country or region includes continent-wide and global funds,
 * because someone in that place is eligible for those too. Choosing "All of
 * Africa" or "Worldwide" is literal — it returns only funds of that reach.
 */
export function matchesScope(selected: string, scopes: Set<string>): boolean {
  if (selected === 'all') return true
  if (selected === AFRICA || selected === GLOBAL) return scopes.has(selected)
  return scopes.has(selected) || scopes.has(AFRICA) || scopes.has(GLOBAL)
}

/**
 * 0 for a grant that names the chosen place, 1 for one that merely includes it.
 * Used to sort the specific results above the continent-wide ones.
 */
export function scopeRank(selected: string, scopes: Set<string>): number {
  if (selected === 'all' || selected === AFRICA || selected === GLOBAL) return 0
  return scopes.has(selected) ? 0 : 1
}
