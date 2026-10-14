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
 * `support_types` reuse the real `funding_type` vocabulary directly, with two
 * additions that are PREFERENCES ONLY and never filter results: `mobility`
 * (no funding_type exists for it yet) and the exclusive "open to anything"
 * choice (stored as `open_to_all`, which BROADENS matching, never narrows it).
 *
 * `stage`, `languages` and all Phase 2 answers are stored as context only:
 * there is no stage/language/goal field on opportunities, so (per the brief)
 * they do NOT drive recommendations.
 *
 * REVISION NOTE (profile v2): labels were revised to match the handoff design.
 * The stable `id`s are UNCHANGED so existing profiles and matching keep working;
 * only the human-facing `label`s changed. New ids were added additively, and
 * legacy ids stay valid for back-compat (see *_LEGACY sets below).
 */

export type Option = { id: string; label: string; desc?: string }

// ---------------------------------------------------------------------------
// Q2 — applicant type (the capacity in which someone usually seeks funding)
// ---------------------------------------------------------------------------
export const APPLICANT_TYPES: Option[] = [
  { id: 'individual', label: 'Me, as an individual.' },
  { id: 'collective', label: 'An informal group or creative collective.' },
  { id: 'nonprofit', label: 'A registered organisation or nonprofit.' },
  { id: 'business', label: 'A registered business.' },
  { id: 'exploring', label: 'I’m exploring opportunities for someone else.' },
]
/** Applicant types for which an organisation name/country is worth asking. */
export const ORG_APPLICANT_TYPES = new Set(['business', 'nonprofit'])
/** Only an individual answering for themselves is asked the career-stage question. */
export const CAREER_STAGE_APPLICANT_TYPES = new Set(['individual'])
/** Legacy applicant type kept valid for profiles created before the v2 revision. */
const APPLICANT_TYPE_LEGACY = new Set(['other'])

// ---------------------------------------------------------------------------
// Q3 — creative disciplines (canonical), with the wording each maps to.
// A discipline matches an opportunity when ANY of its patterns appears in that
// opportunity's cci_sector, OR the opportunity is broad/multi-sector.
// Ids are stable; only labels were revised. `arts-management` is new.
// ---------------------------------------------------------------------------
export type Discipline = Option & { patterns: RegExp[] }

export const DISCIPLINES: Discipline[] = [
  { id: 'visual-arts', label: 'Visual arts', patterns: [/visual art|painting|fine art|contemporary (visual )?art/] },
  { id: 'film', label: 'Film, television and animation', patterns: [/film|cinema|audiovisual|documentary|\btv\b|television|feature|moving image|\bvideo\b|animation/] },
  { id: 'photography', label: 'Photography', patterns: [/photograph/] },
  { id: 'music', label: 'Music', patterns: [/music|\bsound\b/] },
  { id: 'performing-arts', label: 'Theatre, dance and performance', patterns: [/performing|performance|theatre|theater|\bdance\b|\bstage\b/] },
  { id: 'writing', label: 'Writing and publishing', patterns: [/writ|poet|fiction|\bbooks?\b|manuscript|narrative|\bprose\b|publish|literatur/] },
  { id: 'fashion', label: 'Fashion and textiles', patterns: [/fashion|textile/] },
  { id: 'design', label: 'Design and architecture', patterns: [/\bdesign\b|architecture/] },
  { id: 'games', label: 'Games and digital creativity', patterns: [/\bgames?\b|game development|interactive|entertainment tech|creative tech|digital (creative|storytelling|platform)/] },
  { id: 'heritage', label: 'Culture and heritage', patterns: [/heritage|archaeolog|archive|monument|conservation|\bcraft/] },
  { id: 'arts-management', label: 'Arts management and cultural programming', patterns: [/arts? management|cultural (programming|programme|management)|curat|festival management/] },
]

export const DISCIPLINE_BY_ID = new Map(DISCIPLINES.map((d) => [d.id, d]))

/**
 * Legacy discipline ids that are no longer offered as options but stay VALID so
 * existing profiles keep their answers and matches. `media` (journalism/media)
 * was folded out of the offered list in v2; new users describe it via
 * "Another area".
 */
const DISCIPLINE_LEGACY: Discipline[] = [
  { id: 'media', label: 'Journalism and media', patterns: [/journalism|\bmedia\b|podcast|broadcast|storytelling/] },
]
const ALL_DISCIPLINES = [...DISCIPLINES, ...DISCIPLINE_LEGACY]
const ALL_DISCIPLINE_BY_ID = new Map(ALL_DISCIPLINES.map((d) => [d.id, d]))

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
  const d = ALL_DISCIPLINE_BY_ID.get(disciplineId)
  if (!d) return false
  return d.patterns.some((p) => p.test(sector))
}

// ---------------------------------------------------------------------------
// Q4 — career stage (individuals only; context, not used for matching)
// ---------------------------------------------------------------------------
export const STAGES: Option[] = [
  { id: 'getting-started', label: 'I’m getting started.' },
  { id: 'developing', label: 'I’m developing my practice and building experience.' },
  { id: 'established', label: 'I have an established body of work or track record.' },
  { id: 'returning', label: 'I’m returning to creative work or moving into a new field.' },
  { id: 'not-sure', label: 'I’m not sure.' },
]
/** Stage ids from before v2, kept valid so existing profiles aren't rewritten. */
const STAGE_LEGACY = new Set(['student', 'emerging', 'organisation'])

// ---------------------------------------------------------------------------
// Q5 — opportunity interests. The first eight are PREFERENCES; `grant`,
// `prize`, `residency`, `fellowship`, `scholarship`, `loan`, `investment` are
// the real `funding_type` values and match straight onto the data. `mobility`
// has no funding_type yet, so it is recorded but never filters results. The
// exclusive "open to anything" option is handled as the `open_to_all` flag.
// ---------------------------------------------------------------------------
export const SUPPORT_TYPES: Option[] = [
  { id: 'grant', label: 'Grants', desc: 'Funding that generally does not need to be repaid.' },
  { id: 'prize', label: 'Prizes and awards', desc: 'Recognition, funding or other support through a competition.' },
  { id: 'residency', label: 'Residencies', desc: 'Time, space and support to develop your work; funding arrangements vary.' },
  { id: 'fellowship', label: 'Fellowships', desc: 'Structured creative or professional development.' },
  { id: 'scholarship', label: 'Scholarships and training', desc: 'Support for learning or study.' },
  { id: 'mobility', label: 'Travel and mobility support', desc: 'Help to travel, collaborate or present work.' },
  { id: 'loan', label: 'Loans', desc: 'Funding that must be repaid.' },
  { id: 'investment', label: 'Investment', desc: 'Funding that may involve ownership or another financial return.' },
]
export const SUPPORT_TYPE_IDS = new Set(SUPPORT_TYPES.map((s) => s.id))
/** The subset that maps onto a real opportunity funding_type (so can match). */
const MATCHABLE_SUPPORT = new Set(['grant', 'prize', 'residency', 'fellowship', 'scholarship', 'loan', 'investment'])

/** Does an opportunity's funding_type satisfy a chosen support-type id? */
export function supportMatchesFundingType(supportId: string, fundingType: string | null | undefined): boolean {
  if (!MATCHABLE_SUPPORT.has(supportId)) return false // mobility etc. never hard-match
  return (fundingType ?? '').toLowerCase().trim() === supportId
}

// ---------------------------------------------------------------------------
// Preferred languages (context only; not used for matching). Unchanged in v2.
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
// Phase 2 vocabularies (all optional; context only — never affect matching).
// ---------------------------------------------------------------------------
export const GOALS: Option[] = [
  { id: 'create', label: 'Create or complete new work.' },
  { id: 'skills', label: 'Learn new skills or receive mentoring.' },
  { id: 'facilities', label: 'Access equipment, workspace or production facilities.' },
  { id: 'travel', label: 'Travel, collaborate or take part in a residency.' },
  { id: 'publish', label: 'Publish, exhibit, perform or distribute my work.' },
  { id: 'audiences', label: 'Reach new audiences or markets.' },
  { id: 'business', label: 'Start or grow a creative business.' },
  { id: 'sustain', label: 'Sustain my creative practice or organisation.' },
  { id: 'project', label: 'Deliver a cultural, heritage or community project.' },
  { id: 'exploring', label: 'I’m still exploring.' }, // exclusive
]
export const GOALS_EXCLUSIVE = 'exploring'

export const TIMEFRAMES: Option[] = [
  { id: '3m', label: 'Within the next three months.' },
  { id: '3-6m', label: 'Within three to six months.' },
  { id: '6-12m', label: 'Within six to twelve months.' },
  { id: 'ahead', label: 'I’m planning further ahead.' },
  { id: 'browse', label: 'I browse whenever something relevant comes up.' },
]

export const WILLING_LOCATIONS: Option[] = [
  { id: 'home', label: 'In the country where I’m based.' },
  { id: 'africa', label: 'Elsewhere in Africa.' },
  { id: 'outside', label: 'Outside Africa.' },
  { id: 'online', label: 'Online or remotely.' },
  { id: 'unsure', label: 'I’m not sure yet.' }, // exclusive
]
export const WILLING_LOCATIONS_EXCLUSIVE = 'unsure'

export const APPLICATIONS_COUNTS: Option[] = [
  { id: 'none', label: 'None.' },
  { id: '1-2', label: '1–2.' },
  { id: '3-5', label: '3–5.' },
  { id: '6-10', label: '6–10.' },
  { id: '10+', label: 'More than 10.' },
  { id: 'unsure', label: 'I’m not sure.' },
]

export const PRIOR_SUPPORT: Option[] = [
  { id: 'grant', label: 'A grant.' },
  { id: 'prize', label: 'A prize or award.' },
  { id: 'residency', label: 'A funded residency.' },
  { id: 'fellowship', label: 'A fellowship.' },
  { id: 'scholarship', label: 'A scholarship, training place or travel support.' },
  { id: 'loan-investment', label: 'A loan or investment.' },
  { id: 'applied-none', label: 'I have applied but have not received support.' }, // exclusive
  { id: 'never-applied', label: 'I have not applied before.' }, // exclusive
  { id: 'prefer-not', label: 'Prefer not to say.' }, // exclusive
]
export const PRIOR_SUPPORT_EXCLUSIVE = new Set(['applied-none', 'never-applied', 'prefer-not'])

export const BARRIERS: Option[] = [
  { id: 'late', label: 'I hear about it too late.' },
  { id: 'relevance', label: 'I struggle to find opportunities relevant to my work.' },
  { id: 'eligibility', label: 'Eligibility requirements are unclear.' },
  { id: 'country', label: 'Too few opportunities accept applicants from my country.' },
  { id: 'time', label: 'Applications take more time than I can manage.' },
  { id: 'help', label: 'I need help with proposals, budgets or supporting documents.' },
  { id: 'language', label: 'Application language is a barrier.' }, // research answer only
  { id: 'cost', label: 'Application fees, travel costs or other expenses are a barrier.' },
  { id: 'requirements', label: 'I lack a required partner, registration or track record.' },
  { id: 'feedback', label: 'I apply but rarely receive feedback or support.' },
  { id: 'none', label: 'I haven’t experienced a major difficulty.' }, // exclusive
  { id: 'other', label: 'Something else — please specify.' },
]
export const BARRIERS_EXCLUSIVE = 'none'

export const TYPICAL_AMOUNTS: Option[] = [
  { id: 'lt1k', label: 'Less than US$1,000.' },
  { id: '1k-5k', label: 'US$1,000–4,999.' },
  { id: '5k-10k', label: 'US$5,000–9,999.' },
  { id: '10k-25k', label: 'US$10,000–24,999.' },
  { id: '25k-50k', label: 'US$25,000–49,999.' },
  { id: '50k+', label: 'US$50,000 or more.' },
  { id: 'varies', label: 'It varies too much to give a typical amount.' },
  { id: 'non-financial', label: 'I’m mainly looking for non-financial support.' },
  { id: 'unsure', label: 'I’m not sure yet.' },
]

export const FIT_RATINGS: Option[] = [
  { id: 'very-well', label: 'Very well.' },
  { id: 'quite-well', label: 'Quite well.' },
  { id: 'a-little', label: 'Only a little.' },
  { id: 'not-at-all', label: 'Not at all.' },
  { id: 'not-enough', label: 'I haven’t seen enough to judge.' },
]

export const ACTIONS_TAKEN: Option[] = [
  { id: 'visited', label: 'Visited the funder’s website to learn more.' },
  { id: 'saved', label: 'Saved an opportunity for later.' },
  { id: 'preparing', label: 'Started preparing an application.' },
  { id: 'submitted', label: 'Submitted an application.' },
  { id: 'shared', label: 'Shared an opportunity with someone else.' },
  { id: 'received', label: 'Received funding or support.' },
  { id: 'none', label: 'None of these yet.' }, // exclusive
  { id: 'unsure', label: 'I’m not sure.' }, // exclusive
]
export const ACTIONS_TAKEN_EXCLUSIVE = new Set(['none', 'unsure'])

// ---------------------------------------------------------------------------
// Validation helpers (used server-side so a hand-crafted request can't store
// values outside the vocabulary). Legacy ids are included so older profiles
// round-trip without losing answers.
// ---------------------------------------------------------------------------
export const DISCIPLINE_IDS = new Set([...DISCIPLINES, ...DISCIPLINE_LEGACY].map((d) => d.id))
export const APPLICANT_TYPE_IDS = new Set([...APPLICANT_TYPES.map((a) => a.id), ...APPLICANT_TYPE_LEGACY])
export const STAGE_IDS = new Set([...STAGES.map((s) => s.id), ...STAGE_LEGACY])
export const LANGUAGE_IDS = new Set(LANGUAGES.map((l) => l.id))
export const GOAL_IDS = new Set(GOALS.map((g) => g.id))
export const TIMEFRAME_IDS = new Set(TIMEFRAMES.map((t) => t.id))
export const WILLING_LOCATION_IDS = new Set(WILLING_LOCATIONS.map((w) => w.id))
export const APPLICATIONS_COUNT_IDS = new Set(APPLICATIONS_COUNTS.map((a) => a.id))
export const PRIOR_SUPPORT_IDS = new Set(PRIOR_SUPPORT.map((p) => p.id))
export const BARRIER_IDS = new Set(BARRIERS.map((b) => b.id))
export const TYPICAL_AMOUNT_IDS = new Set(TYPICAL_AMOUNTS.map((t) => t.id))
export const FIT_RATING_IDS = new Set(FIT_RATINGS.map((f) => f.id))
export const ACTION_IDS = new Set(ACTIONS_TAKEN.map((a) => a.id))

export const labelFor = (options: Option[], id: string): string =>
  options.find((o) => o.id === id)?.label ?? id
