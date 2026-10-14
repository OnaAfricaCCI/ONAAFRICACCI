/**
 * Phase 2 invitation timing — pure, deterministic rules so they can be tested
 * without a database or a browser.
 *
 * A "return visit" is a distinct active authenticated session: at least 30
 * minutes after the last activity. The account-creation session is excluded by
 * seeding `last_visit_at` when the profile is first completed, so the first
 * genuine return (>= 30 min later) becomes visit 1.
 *
 * Batches are offered one at a time, in order, from their earliest visit — and
 * these are earliest points, not deadlines. At most one invitation per visit.
 * After a dismissal, hold for at least three more return visits. After two
 * dismissals of a batch, stop offering it (and, because batches are sequential,
 * later batches) automatically — a manual entry point remains in the profile.
 */

export const BATCH_EARLIEST: Record<1 | 2 | 3, number> = { 1: 5, 2: 8, 3: 10 }
export const DISMISS_WAIT = 3
export const MAX_DISMISSALS = 2
export const VISIT_GAP_MS = 30 * 60 * 1000

export type VisitState = { visit_count: number; last_visit_at: string | null }

/**
 * Decide whether `now` starts a new return visit, and the resulting count.
 * Reloads, navigation and re-renders within 30 minutes do NOT count.
 */
export function registerVisit(state: VisitState, nowMs: number): { isNewVisit: boolean; visit_count: number; last_visit_at: string } {
  const last = state.last_visit_at ? Date.parse(state.last_visit_at) : null
  const isNewVisit = last === null || Number.isNaN(last) || nowMs - last >= VISIT_GAP_MS
  return {
    isNewVisit,
    visit_count: isNewVisit ? state.visit_count + 1 : state.visit_count,
    // Advance the activity clock on every genuine visit; otherwise keep it.
    last_visit_at: new Date(isNewVisit ? nowMs : (last ?? nowMs)).toISOString(),
  }
}

export type Phase2State = {
  visit_count: number
  batch1_completed: boolean
  batch2_completed: boolean
  batch3_completed: boolean
  batch1_dismissals: number
  batch2_dismissals: number
  batch3_dismissals: number
  batch1_dismissed_visit: number | null
  batch2_dismissed_visit: number | null
  batch3_dismissed_visit: number | null
  last_invited_visit: number | null
}

type BatchView = { n: 1 | 2 | 3; completed: boolean; dismissals: number; dismissedVisit: number | null }

function batches(s: Phase2State): BatchView[] {
  return [
    { n: 1, completed: s.batch1_completed, dismissals: s.batch1_dismissals, dismissedVisit: s.batch1_dismissed_visit },
    { n: 2, completed: s.batch2_completed, dismissals: s.batch2_dismissals, dismissedVisit: s.batch2_dismissed_visit },
    { n: 3, completed: s.batch3_completed, dismissals: s.batch3_dismissals, dismissedVisit: s.batch3_dismissed_visit },
  ]
}

/**
 * The batch to invite on this visit, or null. Only the first not-yet-completed
 * batch is ever a candidate (they are sequential), so completing one is what
 * unlocks the next — distinct from dismissing an invitation.
 */
export function eligibleBatch(s: Phase2State): 1 | 2 | 3 | null {
  const next = batches(s).find((b) => !b.completed)
  if (!next) return null // all three completed
  if (s.last_invited_visit === s.visit_count) return null // at most one invite per visit
  if (next.dismissals >= MAX_DISMISSALS) return null // stop automatic invitations
  if (s.visit_count < BATCH_EARLIEST[next.n]) return null // earliest point not reached
  if (next.dismissedVisit != null && s.visit_count < next.dismissedVisit + DISMISS_WAIT) return null // holding after a dismissal
  return next.n
}

/** Whether a manual "continue" entry point should appear in the profile. */
export function hasOpenBatch(s: Phase2State): boolean {
  return batches(s).some((b) => !b.completed)
}

/** The full thank-you is shown once, only after the final batch completes with real answers. */
export function shouldShowThankYou(args: { batch3_completed: boolean; thankyou_shown: boolean; anyPhase2Answer: boolean }): 'full' | 'neutral' | null {
  if (!args.batch3_completed || args.thankyou_shown) return null
  return args.anyPhase2Answer ? 'full' : 'neutral'
}
