/**
 * Deterministic, explainable recommendations.
 *
 * This is NOT an eligibility engine and NOT an AI score. It matches a profile's
 * stated PREFERENCES against the opportunity fields we actually hold, and says
 * in plain words why something is relevant. It never says "you are eligible".
 *
 * What counts as a match (all three must hold for a positive match):
 *   1. Discipline — a chosen discipline maps to the opportunity's cci_sector
 *      (or the opportunity is broad/multi-sector). lib/profileTaxonomy.ts.
 *   2. Support type — a chosen support type equals the opportunity's
 *      funding_type (grant, prize, residency, …).
 *   3. No known LOCATION CONTRADICTION. Location is handled carefully:
 *        - African resident + opportunity that reaches them (country / region /
 *          Africa-wide / worldwide) → positive, no contradiction.
 *        - African resident + opportunity scoped only to OTHER places → a known
 *          contradiction → excluded.
 *        - Non-African resident + worldwide opportunity → positive.
 *        - Non-African resident + Africa-oriented opportunity → UNKNOWN (it may
 *          turn on nationality, which residence can't tell us) → not excluded,
 *          not claimed as a location match.
 *        - No scope data → UNKNOWN.
 *
 * Preferences are never treated as facts: residence is not nationality, a
 * creative interest is not experience, an org type is not legal status, a
 * language is not proficiency. Every recommendation carries the caveat
 * `CHECK_REQUIREMENTS` so a visitor confirms the funder's real rules.
 */
import { disciplineMatchesSector, supportMatchesFundingType, DISCIPLINE_BY_ID } from './profileTaxonomy'
import { scopeForResidence, COUNTRY_NAME_BY_CODE } from './countries'
import { matchesScope, scopesFor } from './eligibility'

export const CHECK_REQUIREMENTS = "Check the funder's full requirements before applying."

export type RecProfile = {
  country_code: string | null
  disciplines: string[]
  support_types: string[]
}

export type RecOpportunity = {
  id: string
  cci_sector: string | null
  funding_type: string | null
  /** Precomputed scope tags (opportunities.scopes); falls back to eligible_countries. */
  scopes?: string[] | null
  eligible_countries?: string[] | null
}

export type RecResult = {
  relevant: boolean
  score: number
  /** Short, human explanations of why this is relevant. Empty when not relevant. */
  reasons: string[]
  /** True when a known location contradiction excluded it (for tests/telemetry). */
  locationContradiction: boolean
}

/** The noun used in "Matches your interest in … and <support> funding." */
const SUPPORT_NOUN: Record<string, string> = {
  grant: 'grant funding',
  prize: 'prizes',
  residency: 'residencies',
  fellowship: 'fellowships',
  scholarship: 'scholarships',
  loan: 'loan funding',
  investment: 'investment',
}

function oppScopeSet(opp: RecOpportunity): Set<string> {
  if (opp.scopes && opp.scopes.length) return new Set(opp.scopes)
  return scopesFor(opp.eligible_countries)
}

type LocationEval = { match: boolean; contradiction: boolean; note: string | null }

function evalLocation(countryCode: string | null, scopes: Set<string>): LocationEval {
  if (scopes.size === 0) return { match: false, contradiction: false, note: null } // unknown
  const userScope = scopeForResidence(countryCode) // African slug, or null (non-African / unknown)
  if (userScope) {
    if (matchesScope(userScope, scopes)) {
      const name = countryCode ? COUNTRY_NAME_BY_CODE.get(countryCode) ?? null : null
      // Only name the place when the opportunity specifically reaches the
      // user's own country (not merely Africa-wide / worldwide).
      const note = name && scopes.has(userScope) ? `Open to applicants in ${name}` : null
      return { match: true, contradiction: false, note }
    }
    // Opportunity is geographically specific and does not reach the user.
    return { match: false, contradiction: true, note: null }
  }
  // Non-African (or unstated) residence.
  if (scopes.has('global')) return { match: true, contradiction: false, note: 'Open worldwide' }
  // Africa-oriented opportunity, resident abroad: nationality unknown → unknown.
  return { match: false, contradiction: false, note: null }
}

export function scoreOpportunity(profile: RecProfile, opp: RecOpportunity): RecResult {
  const none: RecResult = { relevant: false, score: 0, reasons: [], locationContradiction: false }

  const location = evalLocation(profile.country_code, oppScopeSet(opp))
  if (location.contradiction) return { ...none, locationContradiction: true }

  const matchedDisciplines = profile.disciplines.filter((d) =>
    disciplineMatchesSector(d, opp.cci_sector),
  )
  const matchedSupport = profile.support_types.find((s) =>
    supportMatchesFundingType(s, opp.funding_type),
  )

  // A positive match needs both a creative-interest match and a funding-type
  // match. Anything less stays out of "relevant to your preferences".
  if (matchedDisciplines.length === 0 || !matchedSupport) return none

  const discLabels = matchedDisciplines
    .map((d) => DISCIPLINE_BY_ID.get(d)?.label.toLowerCase() ?? d)
    .slice(0, 2)
  const supportNoun = SUPPORT_NOUN[matchedSupport] ?? `${matchedSupport} funding`

  const reasons = [`Matches your interest in ${joinWords(discLabels)} and ${supportNoun}.`]
  if (location.note) reasons.push(`${location.note}.`)

  const score = matchedDisciplines.length * 2 + 1 + (location.match ? 1 : 0)
  return { relevant: true, score, reasons, locationContradiction: false }
}

function joinWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? ''
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}

/**
 * Rank a set of candidate opportunities for a profile. Returns only the
 * relevant ones, best first, each paired with its explanation. Pure: feed it
 * already-fetched, already-open opportunities (closed cycles excluded upstream
 * with lib/deadline.ts).
 */
export function rankRecommendations<T extends RecOpportunity>(
  profile: RecProfile,
  opportunities: T[],
): { opportunity: T; reasons: string[]; score: number }[] {
  return opportunities
    .map((opportunity) => ({ opportunity, ...scoreOpportunity(profile, opportunity) }))
    .filter((r) => r.relevant)
    .sort((a, b) => b.score - a.score)
    .map(({ opportunity, reasons, score }) => ({ opportunity, reasons, score }))
}
