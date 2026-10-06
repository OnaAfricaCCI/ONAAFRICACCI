/**
 * Server-side validation of a grant-seeker profile payload.
 *
 * Everything the browser sends is checked here against the known vocabulary
 * (lib/profileTaxonomy.ts, lib/countries.ts), so a hand-crafted request can
 * never store a value outside the taxonomy. Unanswered fields stay NULL / empty
 * — never a guessed value. Pure and testable.
 */
import {
  APPLICANT_TYPE_IDS,
  DISCIPLINE_IDS,
  STAGE_IDS,
  SUPPORT_TYPE_IDS,
  LANGUAGE_IDS,
} from './profileTaxonomy'
import { isValidCountryCode } from './countries'

export type CleanProfile = {
  country_code: string | null
  applicant_type: string | null
  organisation_name: string | null
  organisation_country: string | null
  disciplines: string[]
  stage: string | null
  support_types: string[]
  languages: string[]
}

const str = (v: unknown, max = 200): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t === '' || t.length > max ? null : t
}

const pickSet = (v: unknown, allowed: Set<string>, max = 20): string[] => {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  for (const item of v) {
    if (typeof item === 'string' && allowed.has(item) && !out.includes(item)) out.push(item)
    if (out.length >= max) break
  }
  return out
}

export function cleanProfile(raw: Record<string, unknown>): CleanProfile {
  const country = str(raw.country_code, 2)
  const orgCountry = str(raw.organisation_country, 2)
  return {
    country_code: country && isValidCountryCode(country) ? country : null,
    applicant_type:
      typeof raw.applicant_type === 'string' && APPLICANT_TYPE_IDS.has(raw.applicant_type)
        ? raw.applicant_type
        : null,
    organisation_name: str(raw.organisation_name, 200),
    organisation_country: orgCountry && isValidCountryCode(orgCountry) ? orgCountry : null,
    disciplines: pickSet(raw.disciplines, DISCIPLINE_IDS),
    stage: typeof raw.stage === 'string' && STAGE_IDS.has(raw.stage) ? raw.stage : null,
    support_types: pickSet(raw.support_types, SUPPORT_TYPE_IDS),
    languages: pickSet(raw.languages, LANGUAGE_IDS),
  }
}

/**
 * The minimum for a completed basic profile: residence, applicant type, and at
 * least one discipline and one support type. (Everything else is optional.)
 */
export function isCompletable(p: CleanProfile): boolean {
  return (
    !!p.country_code &&
    !!p.applicant_type &&
    p.disciplines.length >= 1 &&
    p.support_types.length >= 1
  )
}
