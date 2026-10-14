/**
 * Opportunity status taxonomy — the single source of truth for how a listing's
 * status, cadence and verification are shown.
 *
 * Three independent facts (see supabase/migrations/20261008_opportunity_status.sql):
 *   - programme_frequency: how often it runs (cadence)
 *   - application_status:  whether you can apply now (the badge), derived from
 *                          evidence — never claimed open/closed without proof
 *   - verification:        what we confirmed and when, kept separate from the
 *                          automated link check
 *
 * The display status is DERIVED, not read raw: a stored "open" whose deadline
 * has passed, or an "opens_on" whose date has arrived, decays to a safe state
 * so the badge can never silently lie as time passes.
 */

export type StatusSlug =
  | 'open'
  | 'opens_on'
  | 'awaiting_next_call'
  | 'closed_uncertain'
  | 'invitation_only'
  | 'unconfirmed'

export type FrequencySlug =
  | 'rolling' | 'quarterly' | 'annual' | 'biennial' | 'periodic' | 'one-off' | 'unknown'

/** Tone drives colour in the UI: go = open, soon = forward-looking, rest = muted. */
export type StatusTone = 'open' | 'soon' | 'muted' | 'closed'

export type StatusView = {
  slug: StatusSlug
  /** The badge text. For opens_on, carries the date when known. */
  label: string
  /** One-line supporting text under the badge, or null. */
  supporting: string | null
  tone: StatusTone
}

const SUPPORTING: Record<StatusSlug, string | null> = {
  open: null,
  opens_on: null,
  awaiting_next_call:
    'The previous application round has closed. Dates for the next call have not yet been announced.',
  closed_uncertain:
    'The previous round has closed, and it is not yet confirmed whether this funder will run it again.',
  invitation_only:
    'This funder selects by invitation or nomination; there is no open application.',
  unconfirmed:
    "This programme is listed for funding research and planning. Check the funder's website for current application availability.",
}

const TONE: Record<StatusSlug, StatusTone> = {
  open: 'open',
  opens_on: 'soon',
  awaiting_next_call: 'muted',
  closed_uncertain: 'closed',
  invitation_only: 'muted',
  unconfirmed: 'muted',
}

const FREQUENCY_LABEL: Record<FrequencySlug, string> = {
  rolling: 'Rolling', quarterly: 'Quarterly', annual: 'Annual',
  biennial: 'Biennial', periodic: 'Periodic', 'one-off': 'One-off', unknown: '',
}

const ISO = /^\d{4}-\d{2}-\d{2}/
const isFuture = (d: string | null, today: string) => !!d && ISO.test(d) && d.slice(0, 10) > today
const isPast = (d: string | null, today: string) => !!d && ISO.test(d) && d.slice(0, 10) < today

function fmtDate(d: string): string {
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export type StatusInput = {
  application_status: string | null
  programme_frequency?: string | null
  deadline?: string | null
  deadline_type?: string | null
  next_open_date?: string | null
}

/**
 * Derive the status to display, applying the time overlay so a stale value
 * never lies. `today` is an ISO date (YYYY-MM-DD) for testability.
 */
export function deriveStatus(o: StatusInput, today: string): StatusView {
  let slug = (o.application_status as StatusSlug) || null

  // Fallback for rows not yet migrated: infer a conservative status from the
  // old deadline fields rather than showing nothing.
  if (!slug) {
    if (isFuture(o.deadline ?? null, today)) slug = 'open'
    else if (o.deadline_type === 'rolling') slug = 'unconfirmed'
    else slug = 'unconfirmed'
  }

  // Decay rules — objective, date-driven, so the badge self-corrects.
  if (slug === 'open' && isPast(o.deadline ?? null, today) && o.deadline_type !== 'recurring' && o.deadline_type !== 'rolling') {
    slug = 'unconfirmed' // a stated window that has passed is no longer "open"
  }
  if (slug === 'opens_on' && !isFuture(o.next_open_date ?? null, today)) {
    // the announced opening date has arrived (or is unknown) → needs a recheck
    slug = 'unconfirmed'
  }

  let label: string
  if (slug === 'opens_on') {
    label = o.next_open_date ? `Opens on ${fmtDate(o.next_open_date)}` : 'Opening soon'
  } else {
    label = LABEL[slug]
  }
  return { slug, label, supporting: SUPPORTING[slug], tone: TONE[slug] }
}

const LABEL: Record<StatusSlug, string> = {
  open: 'Open for applications',
  opens_on: 'Opens on [date]',
  awaiting_next_call: 'Awaiting next call',
  closed_uncertain: 'Closed — future calls unconfirmed',
  invitation_only: 'By invitation / nomination only',
  unconfirmed: 'Current window not confirmed',
}

/** The cadence line, e.g. "Annual" or "Periodic · 4 sessions a year". Empty if nothing to say. */
export function frequencyText(
  frequency?: string | null,
  detail?: string | null,
): string {
  const base = frequency ? (FREQUENCY_LABEL[frequency as FrequencySlug] ?? '') : ''
  const d = (detail ?? '').trim()
  if (base && d) return `${base} · ${d}`
  return base || d
}

/**
 * The two honest verification lines. A working link is never conflated with an
 * open application window, so they are always separate statements.
 *   - "Application status: <label>"            (what we determined)
 *   - "Status confirmed on the funder's page: <date>"  (human/source check), and/or
 *   - "Source link checked: <date>"            (automated link test only)
 */
export function verificationLines(args: {
  statusLabel: string
  statusVerifiedAt?: string | null
  linkCheckedAt?: string | null
}): string[] {
  const lines = [`Application status: ${args.statusLabel}`]
  if (args.statusVerifiedAt && ISO.test(args.statusVerifiedAt))
    lines.push(`Status confirmed on the funder's page: ${fmtDate(args.statusVerifiedAt)}`)
  if (args.linkCheckedAt && ISO.test(args.linkCheckedAt))
    lines.push(`Source link checked: ${fmtDate(args.linkCheckedAt)}`)
  return lines
}

/** True when the listing is genuinely open to apply now (for the homepage carousel and the "open" filter). */
export function isOpenNow(view: StatusView): boolean {
  return view.slug === 'open'
}
