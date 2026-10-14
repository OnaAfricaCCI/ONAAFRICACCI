/**
 * Server-side validation of a grant-seeker profile payload.
 *
 * Everything the browser sends is checked here against the known vocabulary
 * (lib/profileTaxonomy.ts, lib/countries.ts), so a hand-crafted request can
 * never store a value outside the taxonomy. Unanswered fields stay NULL / empty
 * — never a guessed value. Selection limits and mutually-exclusive answers are
 * enforced HERE as well as in the UI. Pure and testable.
 */
import {
  APPLICANT_TYPE_IDS,
  DISCIPLINE_IDS,
  STAGE_IDS,
  SUPPORT_TYPE_IDS,
  LANGUAGE_IDS,
  GOAL_IDS, GOALS_EXCLUSIVE,
  TIMEFRAME_IDS,
  WILLING_LOCATION_IDS, WILLING_LOCATIONS_EXCLUSIVE,
  APPLICATIONS_COUNT_IDS,
  PRIOR_SUPPORT_IDS, PRIOR_SUPPORT_EXCLUSIVE,
  BARRIER_IDS, BARRIERS_EXCLUSIVE,
  TYPICAL_AMOUNT_IDS,
  FIT_RATING_IDS,
  ACTION_IDS, ACTIONS_TAKEN_EXCLUSIVE,
} from './profileTaxonomy'
import { isValidCountryCode } from './countries'

export type CleanProfile = {
  // Phase 1
  country_code: string | null
  applicant_type: string | null
  organisation_name: string | null
  organisation_country: string | null
  disciplines: string[]
  disciplines_other: string | null
  taxonomy_review: boolean
  stage: string | null
  support_types: string[]
  open_to_all: boolean
  languages: string[]
  // Phase 2 — Batch 1 (goals)
  goals: string[]
  timeframe: string | null
  willing_locations: string[]
  // Phase 2 — Batch 2 (funding experience)
  applications_count: string | null
  prior_support: string[]
  barriers: string[]
  barriers_other: string | null
  // Phase 2 — Batch 3 (matching & outcomes)
  citizenship: string[]
  citizenship_prefer_not: boolean
  registered_in: string[]
  members_based_in: string[]
  typical_amount: string | null
  fit_rating: string | null
  fit_note: string | null
  actions_taken: string[]
}

const str = (v: unknown, max = 200): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t === '' || t.length > max ? null : t
}
const bool = (v: unknown): boolean => v === true

/** Keep only allowed ids, de-duplicated, capped. */
const pickSet = (v: unknown, allowed: Set<string>, max = 20): string[] => {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  for (const item of v) {
    if (typeof item === 'string' && allowed.has(item) && !out.includes(item)) out.push(item)
    if (out.length >= max) break
  }
  return out
}

/** Valid, de-duplicated country codes, capped. */
const pickCountries = (v: unknown, max = 15): string[] => {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  for (const item of v) {
    if (typeof item === 'string' && isValidCountryCode(item) && !out.includes(item)) out.push(item)
    if (out.length >= max) break
  }
  return out
}

/**
 * Enforce mutual exclusivity: if any exclusive id is selected, collapse to the
 * first exclusive id alone. Otherwise cap the list at `max`.
 */
const applyExclusive = (ids: string[], exclusive: Set<string>, max: number): string[] => {
  const ex = ids.find((id) => exclusive.has(id))
  if (ex) return [ex]
  return ids.slice(0, max)
}

export function cleanProfile(raw: Record<string, unknown>): CleanProfile {
  const country = str(raw.country_code, 2)
  const orgCountry = str(raw.organisation_country, 2)

  const openToAll = bool(raw.open_to_all)
  // "Open to anything" is mutually exclusive with specific support selections.
  const support = openToAll ? [] : pickSet(raw.support_types, SUPPORT_TYPE_IDS)

  const disciplinesOther = str(raw.disciplines_other, 160)
  const citizenshipPreferNot = bool(raw.citizenship_prefer_not)

  return {
    // Phase 1
    country_code: country && isValidCountryCode(country) ? country : null,
    applicant_type:
      typeof raw.applicant_type === 'string' && APPLICANT_TYPE_IDS.has(raw.applicant_type)
        ? raw.applicant_type
        : null,
    organisation_name: str(raw.organisation_name, 200),
    organisation_country: orgCountry && isValidCountryCode(orgCountry) ? orgCountry : null,
    disciplines: pickSet(raw.disciplines, DISCIPLINE_IDS),
    disciplines_other: disciplinesOther,
    // Flag free-text "Another area" for human taxonomy review; never auto-mapped.
    taxonomy_review: disciplinesOther !== null,
    stage: typeof raw.stage === 'string' && STAGE_IDS.has(raw.stage) ? raw.stage : null,
    support_types: support,
    open_to_all: openToAll,
    languages: pickSet(raw.languages, LANGUAGE_IDS),

    // Phase 2 — Batch 1
    goals: applyExclusive(pickSet(raw.goals, GOAL_IDS), new Set([GOALS_EXCLUSIVE]), 3),
    timeframe: typeof raw.timeframe === 'string' && TIMEFRAME_IDS.has(raw.timeframe) ? raw.timeframe : null,
    willing_locations: applyExclusive(pickSet(raw.willing_locations, WILLING_LOCATION_IDS), new Set([WILLING_LOCATIONS_EXCLUSIVE]), 4),

    // Phase 2 — Batch 2
    applications_count: typeof raw.applications_count === 'string' && APPLICATIONS_COUNT_IDS.has(raw.applications_count) ? raw.applications_count : null,
    prior_support: applyExclusive(pickSet(raw.prior_support, PRIOR_SUPPORT_IDS), PRIOR_SUPPORT_EXCLUSIVE, 6),
    barriers: applyExclusive(pickSet(raw.barriers, BARRIER_IDS), new Set([BARRIERS_EXCLUSIVE]), 3),
    barriers_other: str(raw.barriers_other, 300),

    // Phase 2 — Batch 3. Residence, citizenship and registration stay distinct.
    citizenship: citizenshipPreferNot ? [] : pickCountries(raw.citizenship),
    citizenship_prefer_not: citizenshipPreferNot,
    registered_in: pickCountries(raw.registered_in),
    members_based_in: pickCountries(raw.members_based_in),
    typical_amount: typeof raw.typical_amount === 'string' && TYPICAL_AMOUNT_IDS.has(raw.typical_amount) ? raw.typical_amount : null,
    fit_rating: typeof raw.fit_rating === 'string' && FIT_RATING_IDS.has(raw.fit_rating) ? raw.fit_rating : null,
    fit_note: str(raw.fit_note, 500),
    actions_taken: applyExclusive(pickSet(raw.actions_taken, ACTION_IDS), ACTIONS_TAKEN_EXCLUSIVE, 8),
  }
}

/**
 * The minimum for a completed basic (Phase 1) profile: residence, applicant
 * type, at least one discipline (or a specified "Another area"), and at least
 * one support type OR "open to anything". Everything else is optional.
 */
export function isCompletable(p: CleanProfile): boolean {
  const hasDiscipline = p.disciplines.length >= 1 || p.disciplines_other !== null
  const hasSupport = p.support_types.length >= 1 || p.open_to_all
  return !!p.country_code && !!p.applicant_type && hasDiscipline && hasSupport
}
