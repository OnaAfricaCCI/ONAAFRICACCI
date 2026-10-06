/**
 * The vocabulary the grant-seeker profile is built from, and the deterministic
 * mapping from a profile answer to the opportunity data we actually hold.
 *
 * The opportunity `cci_sector` column is free text written by many sources
 * ("film", "multi-sector", "kiswahili fiction", "rotating genres: prose"…), so
 * the onboarding offers a small, stable set of CANONICAL disciplines and this
 * file maps each to the wording that appears in the data. Nothing here invents
 * a category that can't be matched against real opportunities.
 *
 * `support_types` reuse the real `funding_type` vocabulary directly.
 * `stage` and `languages` are stored as context only: there is no stage or
 * language field on opportunities, so (per the brief) they do NOT drive
 * recommendations. If reliable opportunity-language data is added later, wire
 * languages into lib/recommend.ts then — not before.
 */

export type Option = { id: string; label: string }

// ---------------------------------------------------------------------------
// Step 1 — applicant type (the capacity in which someone usually seeks funding)
// ---------------------------------------------------------------------------
export const APPLICANT_TYPES: Option[] = [
  { id: 'individual', label: 'An individual' },
  { id: 'collective', label: 'An informal group or collective' },
  { id: 'business', label: 'A registered business' },
  { id: 'nonprofit', label: 'A nonprofit or NGO' },
  { id: 'other', label: 'Something else' },
]
/** Applicant types for which an organisation name/country is worth asking. */
export const ORG_APPLICANT_TYPES = new Set(['business', 'nonprofit'])

// ---------------------------------------------------------------------------
// Step 2 — creative disciplines (canonical), with the wording each maps to.
// A discipline matches an opportunity when ANY of its patterns appears in that
// opportunity's cci_sector, OR the opportunity is broad/multi-sector.
// ---------------------------------------------------------------------------
export type Discipline = Option & { patterns: RegExp[] }

export const DISCIPLINES: Discipline[] = [
  { id: 'film', label: 'Film and audiovisual', patterns: [/film|cinema|audiovisual|documentary|\btv\b|feature|moving image|\bvideo\b/] },
  { id: 'music', label: 'Music', patterns: [/music|\bsound\b/] },
  { id: 'visual-arts', label: 'Visual arts', patterns: [/visual art|painting|fine art|contemporary (visual )?art/] },
  { id: 'photography', label: 'Photography', patterns: [/photograph/] },
  { id: 'performing-arts', label: 'Performing arts', patterns: [/performing|theatre|theater|\bdance\b|\bstage\b/] },
  { id: 'fashion', label: 'Fashion', patterns: [/fashion/] },
  { id: 'design', label: 'Design and architecture', patterns: [/\bdesign\b|architecture/] },
  { id: 'writing', label: 'Writing and publishing', patterns: [/writ|poet|fiction|\bbooks?\b|manuscript|narrative|\bprose\b|publish|literatur/] },
  { id: 'games', label: 'Games and interactive', patterns: [/\bgames?\b|game development|interactive|entertainment tech|creative tech|digital (creative|storytelling|platform)/] },
  { id: 'heritage', label: 'Heritage and craft', patterns: [/heritage|archaeolog|archive|monument|conservation|\bcraft/] },
  { id: 'media', label: 'Journalism and media', patterns: [/journalism|\bmedia\b|podcast|broadcast|storytelling/] },
]

export const DISCIPLINE_BY_ID = new Map(DISCIPLINES.map((d) => [d.id, d]))

/**
 * Wording that marks an opportunity as broad / cross-disciplinary. These match
 * ANY chosen discipline, the same way the weekly digest lets a `multi-sector`
 * grant through for any sector preference.
 */
const BROAD_SECTOR = /multi[-\s]?sector|cross[-\s]?sector|\barts\b|\bculture\b|creative (practice|economy|enterprise)|community culture|artistic freedom|narrative change/

/** Does an opportunity's cci_sector satisfy a chosen discipline id? */
export function disciplineMatchesSector(disciplineId: string, cciSector: string | null | undefined): boolean {
  const sector = (cciSector ?? '').toLowerCase().trim()
  if (!sector) return false
  if (BROAD_SECTOR.test(sector)) return true
  const d = DISCIPLINE_BY_ID.get(disciplineId)
  if (!d) return false
  return d.patterns.some((p) => p.test(sector))
}

// ---------------------------------------------------------------------------
// Step 2 — optional stage (context only; not used for matching)
// ---------------------------------------------------------------------------
export const STAGES: Option[] = [
  { id: 'student', label: 'Student or just starting out' },
  { id: 'emerging', label: 'Emerging' },
  { id: 'established', label: 'Established' },
  { id: 'organisation', label: 'An organisation rather than an individual' },
  { id: 'not-sure', label: 'Not sure' },
]

// ---------------------------------------------------------------------------
// Step 3 — support types. These ARE the opportunity `funding_type` values, so
// a preference maps straight onto the data.
// ---------------------------------------------------------------------------
export const SUPPORT_TYPES: Option[] = [
  { id: 'grant', label: 'Grants' },
  { id: 'prize', label: 'Prizes and awards' },
  { id: 'residency', label: 'Residencies' },
  { id: 'fellowship', label: 'Fellowships' },
  { id: 'scholarship', label: 'Scholarships' },
  { id: 'loan', label: 'Loans' },
  { id: 'investment', label: 'Investment' },
]
export const SUPPORT_TYPE_IDS = new Set(SUPPORT_TYPES.map((s) => s.id))

/** Does an opportunity's funding_type satisfy a chosen support-type id? */
export function supportMatchesFundingType(supportId: string, fundingType: string | null | undefined): boolean {
  return (fundingType ?? '').toLowerCase().trim() === supportId
}

// ---------------------------------------------------------------------------
// Step 3 — optional preferred languages (context only; not used for matching)
// ---------------------------------------------------------------------------
export const LANGUAGES: Option[] = [
  { id: 'en', label: 'English' },
  { id: 'fr', label: 'French' },
  { id: 'ar', label: 'Arabic' },
  { id: 'pt', label: 'Portuguese' },
  { id: 'sw', label: 'Swahili' },
  { id: 'other', label: 'Another language' },
]

// ---------------------------------------------------------------------------
// Validation helpers (used server-side so a hand-crafted request can't store
// values outside the vocabulary).
// ---------------------------------------------------------------------------
export const DISCIPLINE_IDS = new Set(DISCIPLINES.map((d) => d.id))
export const APPLICANT_TYPE_IDS = new Set(APPLICANT_TYPES.map((a) => a.id))
export const STAGE_IDS = new Set(STAGES.map((s) => s.id))
export const LANGUAGE_IDS = new Set(LANGUAGES.map((l) => l.id))

export const labelFor = (options: Option[], id: string): string =>
  options.find((o) => o.id === id)?.label ?? id
