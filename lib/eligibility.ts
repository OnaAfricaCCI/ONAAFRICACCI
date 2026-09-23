/**
 * Turning messy eligibility text into a usable "where you're based" filter.
 *
 * `opportunities.eligible_countries` holds the funders' own wording, collected
 * from their sites and spreadsheets. It is not a clean country list — it holds
 * things like "Yes — many African countries", "Pan-African (continent-based)"
 * and "Rotating country list (Kenya, Nigeria, South Africa, Tanzania and
 * others)". Left as-is it produced 95 dropdown options, 83 of them used exactly
 * once, and it hid pan-African funding from anyone who picked a country.
 *
 * This module reads that text and derives scope tags. Nothing is written back
 * to the database and nothing shown on a grant card changes — the cards still
 * display the funder's own words. This is only about what the filter offers and
 * which grants it returns.
 *
 * Two rules matter:
 *
 *   1. All 54 African countries are listed, whether or not a grant names them.
 *      Someone in Djibouti should find their country and see what they can
 *      apply for, not conclude the site has nothing for them.
 *
 *   2. Choosing a country returns grants naming that country, then grants for
 *      its region, then continent-wide and global ones — in that order. A
 *      Kenyan creative is eligible for all of them; the most specific come
 *      first. Picking "Kenya" used to return 4 grants and now returns every
 *      grant they can actually apply to.
 */

export type ScopeGroup = 'region' | 'country'

export type ScopeOption = {
  /** Stable value stored in filter state and analytics. */
  value: string
  label: string
  group: ScopeGroup
}

/** The two continent-or-wider scopes. */
const AFRICA = 'africa'
const GLOBAL = 'global'

/** Cross-cutting groupings that funders use but that aren't places as such. */
const SUB_SAHARAN = 'sub-saharan'
const FRANCOPHONE = 'francophone-africa'

/**
 * Regions, and the wording that signals each one. Tested against lowercased
 * text, so "Yes — specified Eastern African countries" finds East Africa.
 */
const REGIONS: { value: string; label: string; patterns: RegExp[] }[] = [
  { value: 'north-africa', label: 'North Africa', patterns: [/north(ern)?[\s-]afric/, /\bmena\b/, /arab league/] },
  { value: 'west-africa', label: 'West Africa', patterns: [/west(ern)?[\s-]afric/, /\becowas\b/] },
  { value: 'central-africa', label: 'Central Africa', patterns: [/central[\s-]afric/] },
  { value: 'east-africa', label: 'East Africa', patterns: [/east(ern)?[\s-]afric/] },
  { value: 'southern-africa', label: 'Southern Africa', patterns: [/southern[\s-]afric/, /\bsadc\b/] },
  { value: SUB_SAHARAN, label: 'Sub-Saharan Africa', patterns: [/sub[\s-]?saharan/] },
  { value: FRANCOPHONE, label: 'Francophone Africa', patterns: [/francophone/] },
]

type CountryDef = {
  value: string
  label: string
  /** Geographic region, used to rank results and to widen a country's matches. */
  region: string
  /** Eligible for calls aimed at Francophone Africa. */
  francophone?: true
  /** Wording that names this country, including the adjective forms funders use. */
  patterns: RegExp[]
}

/**
 * All 54 African countries, listed alphabetically as shown in the dropdown.
 *
 * Most are named by no grant in the database today. They are here so that
 * someone in Lesotho or Djibouti finds their country and sees the funding open
 * to them, rather than an absence. Regions follow everyday usage rather than
 * the UN's, so Zambia and Malawi sit with Southern Africa.
 */
const COUNTRIES: CountryDef[] = [
  { value: 'algeria', label: 'Algeria', region: 'north-africa', francophone: true, patterns: [/algeria/] },
  { value: 'angola', label: 'Angola', region: 'southern-africa', patterns: [/angola/] },
  { value: 'benin', label: 'Benin', region: 'west-africa', francophone: true, patterns: [/\bbenin\b/] },
  { value: 'botswana', label: 'Botswana', region: 'southern-africa', patterns: [/botswana/] },
  { value: 'burkina-faso', label: 'Burkina Faso', region: 'west-africa', francophone: true, patterns: [/burkina/] },
  { value: 'burundi', label: 'Burundi', region: 'east-africa', francophone: true, patterns: [/burundi/] },
  { value: 'cabo-verde', label: 'Cabo Verde', region: 'west-africa', patterns: [/ca[bp]o?[\s-]verde/] },
  { value: 'cameroon', label: 'Cameroon', region: 'central-africa', francophone: true, patterns: [/cameroo?n/] },
  { value: 'car', label: 'Central African Rep.', region: 'central-africa', francophone: true, patterns: [/central african republic/] },
  { value: 'chad', label: 'Chad', region: 'central-africa', francophone: true, patterns: [/\bchad\b/] },
  { value: 'comoros', label: 'Comoros', region: 'east-africa', francophone: true, patterns: [/comoros/] },
  { value: 'drc', label: 'Congo (DRC)', region: 'central-africa', francophone: true, patterns: [/democratic republic of (the )?congo/, /\bdrc\b/, /\bdr congo\b/] },
  { value: 'congo', label: 'Congo (Rep.)', region: 'central-africa', francophone: true, patterns: [/congo[\s-]brazzaville/, /\bcongo\b/] },
  { value: 'cote-divoire', label: 'Côte d’Ivoire', region: 'west-africa', francophone: true, patterns: [/c[oô]te[\s-]?d[’'`]?ivoire/, /ivory coast/] },
  { value: 'djibouti', label: 'Djibouti', region: 'east-africa', francophone: true, patterns: [/djibouti/] },
  { value: 'egypt', label: 'Egypt', region: 'north-africa', patterns: [/egypt/] },
  { value: 'equatorial-guinea', label: 'Equatorial Guinea', region: 'central-africa', patterns: [/equatorial guinea/] },
  { value: 'eritrea', label: 'Eritrea', region: 'east-africa', patterns: [/eritrea/] },
  { value: 'eswatini', label: 'Eswatini', region: 'southern-africa', patterns: [/eswatini/, /swaziland/] },
  { value: 'ethiopia', label: 'Ethiopia', region: 'east-africa', patterns: [/ethiopia/] },
  { value: 'gabon', label: 'Gabon', region: 'central-africa', francophone: true, patterns: [/gabon/] },
  { value: 'gambia', label: 'Gambia', region: 'west-africa', patterns: [/gambia/] },
  { value: 'ghana', label: 'Ghana', region: 'west-africa', patterns: [/ghana/] },
  { value: 'guinea', label: 'Guinea', region: 'west-africa', francophone: true, patterns: [/\bguinea\b/] },
  { value: 'guinea-bissau', label: 'Guinea-Bissau', region: 'west-africa', patterns: [/guinea[\s-]bissau/] },
  { value: 'kenya', label: 'Kenya', region: 'east-africa', patterns: [/kenya/] },
  { value: 'lesotho', label: 'Lesotho', region: 'southern-africa', patterns: [/lesotho/] },
  { value: 'liberia', label: 'Liberia', region: 'west-africa', patterns: [/liberia/] },
  { value: 'libya', label: 'Libya', region: 'north-africa', patterns: [/libya/] },
  { value: 'madagascar', label: 'Madagascar', region: 'east-africa', francophone: true, patterns: [/madagascar/, /malagasy/] },
  { value: 'malawi', label: 'Malawi', region: 'southern-africa', patterns: [/malawi/] },
  { value: 'mali', label: 'Mali', region: 'west-africa', francophone: true, patterns: [/\bmali\b/, /\bmalian\b/] },
  { value: 'mauritania', label: 'Mauritania', region: 'west-africa', francophone: true, patterns: [/mauritania/] },
  { value: 'mauritius', label: 'Mauritius', region: 'east-africa', francophone: true, patterns: [/mauriti/] },
  { value: 'morocco', label: 'Morocco', region: 'north-africa', francophone: true, patterns: [/morocc/] },
  { value: 'mozambique', label: 'Mozambique', region: 'southern-africa', patterns: [/mozambi/] },
  { value: 'namibia', label: 'Namibia', region: 'southern-africa', patterns: [/namibia/] },
  { value: 'niger', label: 'Niger', region: 'west-africa', francophone: true, patterns: [/\bniger\b/] },
  { value: 'nigeria', label: 'Nigeria', region: 'west-africa', patterns: [/nigeria/] },
  { value: 'rwanda', label: 'Rwanda', region: 'east-africa', francophone: true, patterns: [/rwanda/] },
  { value: 'sao-tome', label: 'São Tomé & Príncipe', region: 'central-africa', patterns: [/s[ãa]o tom[ée]/] },
  { value: 'senegal', label: 'Senegal', region: 'west-africa', francophone: true, patterns: [/s[ée]n[ée]gal/] },
  { value: 'seychelles', label: 'Seychelles', region: 'east-africa', francophone: true, patterns: [/seychell/] },
  { value: 'sierra-leone', label: 'Sierra Leone', region: 'west-africa', patterns: [/sierra leone/] },
  { value: 'somalia', label: 'Somalia', region: 'east-africa', patterns: [/somalia?n?\b/] },
  { value: 'south-africa', label: 'South Africa', region: 'southern-africa', patterns: [/south[\s-]afric(a|an)\b/] },
  { value: 'south-sudan', label: 'South Sudan', region: 'east-africa', patterns: [/south sudan/] },
  { value: 'sudan', label: 'Sudan', region: 'north-africa', patterns: [/\bsudan\b/] },
  { value: 'tanzania', label: 'Tanzania', region: 'east-africa', patterns: [/tanzania/] },
  { value: 'togo', label: 'Togo', region: 'west-africa', francophone: true, patterns: [/\btogo\b/] },
  { value: 'tunisia', label: 'Tunisia', region: 'north-africa', francophone: true, patterns: [/tunisia/] },
  { value: 'uganda', label: 'Uganda', region: 'east-africa', patterns: [/uganda/] },
  { value: 'zambia', label: 'Zambia', region: 'southern-africa', patterns: [/zambia/] },
  { value: 'zimbabwe', label: 'Zimbabwe', region: 'southern-africa', patterns: [/zimbabwe/] },
]

const COUNTRY_BY_VALUE = new Map(COUNTRIES.map((c) => [c.value, c]))

/**
 * Match order: the most specific wording first, so "Equatorial Guinea" is found
 * and taken out of the text before plain "Guinea" is looked for — likewise
 * South Sudan before Sudan, and the DRC before Congo.
 */
const longestPattern = (c: CountryDef) => Math.max(...c.patterns.map((p) => p.source.length))
const COUNTRIES_BY_SPECIFICITY = [...COUNTRIES].sort((a, b) => longestPattern(b) - longestPattern(a))

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
/**
 * The dropdown, in the order it is shown: two groups only. The two
 * continent-or-wider scopes head the region list, since that is how someone
 * reads them — the widest reach first, then narrowing.
 */
export const SCOPE_OPTIONS: ScopeOption[] = [
  { value: AFRICA, label: 'All of Africa', group: 'region' },
  { value: GLOBAL, label: 'Worldwide', group: 'region' },
  ...REGIONS.map((r) => ({ value: r.value, label: r.label, group: 'region' as const })),
  ...COUNTRIES.map((c) => ({ value: c.value, label: c.label, group: 'country' as const })),
]

export const SCOPE_GROUP_LABELS: Record<ScopeGroup, string> = {
  region: 'By region',
  country: 'By country',
}

/**
 * The wider groupings a country belongs to. A grant for East Africa, for
 * Sub-Saharan Africa or for Francophone Africa is open to someone in Djibouti,
 * so all three count as relevant to them.
 */
function broaderThan(country: CountryDef): string[] {
  const tags = [country.region]
  if (country.region !== 'north-africa') tags.push(SUB_SAHARAN)
  if (country.francophone) tags.push(FRANCOPHONE)
  return tags
}

/**
 * True when a grant's wider reach takes in this country. Francophone calls are
 * the exception worth handling: "Sub-Saharan Francophone Africa" is tagged both
 * ways, and Lesotho is sub-Saharan but not Francophone, so the language
 * requirement has to be honoured or the fund would rank as local to them.
 */
function reaches(country: CountryDef, scopes: Set<string>): boolean {
  if (scopes.has(FRANCOPHONE) && !country.francophone) return false
  return broaderThan(country).some((t) => scopes.has(t))
}

/**
 * Read one grant's eligibility wording and return the scopes it covers.
 */
export function scopesFor(raw: string[] | null | undefined): Set<string> {
  const scopes = new Set<string>()
  if (!raw?.length) return scopes

  const text = raw.join(' · ').toLowerCase().replace(/\s+/g, ' ')

  // Work through a copy, taking out each name as it is found: what's left at
  // the end tells us whether the fund also reaches the whole continent.
  let residue = text

  for (const c of COUNTRIES_BY_SPECIFICITY) {
    for (const p of c.patterns) {
      if (p.test(residue)) {
        scopes.add(c.value)
        residue = residue.replace(new RegExp(p.source, 'g'), ' ')
        break
      }
    }
  }
  for (const r of REGIONS) {
    for (const p of r.patterns) {
      if (p.test(residue)) {
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
 * Does a grant with these scopes belong under the chosen place?
 *
 * Choosing a country or region includes the wider funds that reach it, because
 * someone there is eligible for those too. Choosing "All of Africa" or
 * "Worldwide" is literal — it returns only funds of that reach.
 */
export function matchesScope(selected: string, scopes: Set<string>): boolean {
  if (selected === 'all') return true
  if (selected === AFRICA || selected === GLOBAL) return scopes.has(selected)
  if (scopes.has(selected)) return true

  const country = COUNTRY_BY_VALUE.get(selected)
  if (country && reaches(country, scopes)) return true

  return scopes.has(AFRICA) || scopes.has(GLOBAL)
}

/**
 * How closely a grant speaks to the chosen place: 0 when it names it, 1 when it
 * covers the surrounding region, 2 when it is simply continent-wide or global.
 * Used to sort the most specific results to the top.
 */
export function scopeRank(selected: string, scopes: Set<string>): number {
  if (selected === 'all' || selected === AFRICA || selected === GLOBAL) return 0
  if (scopes.has(selected)) return 0

  const country = COUNTRY_BY_VALUE.get(selected)
  if (country && reaches(country, scopes)) return 1

  return 2
}
