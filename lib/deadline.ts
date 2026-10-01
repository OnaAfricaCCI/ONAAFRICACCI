/**
 * One definition of what "expired" means, used everywhere (the grants list, the
 * grant page, the funder page, the sitemap and the homepage) so the rule never
 * drifts between them.
 *
 * The key idea: only a one-time ("fixed") call can expire on its date. A
 * recurring programme or a rolling fund with a date in the past is NOT expired
 * — it recurs or stays open — so it must keep showing. Treating a recurring
 * grant's last-round date as an expiry was the misleading behaviour this fixes.
 *
 * A genuinely-closed one-time call lingers for GRACE_DAYS (so someone who just
 * missed it still sees it was real), then drops out of the listings. The row is
 * never deleted — the grant page stays reachable (marked closed, kept out of
 * search), so old links don't break and the record survives.
 */
export const GRACE_DAYS = 7

/** Whole days until the deadline; negative once it has passed; null if undated. */
export function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000)
}

export type ClosedState = 'open' | 'recently-closed' | 'gone'

/**
 *   open            – still applicable: a future date, no date, or any
 *                     recurring / rolling / unknown opportunity (never expires on a date)
 *   recently-closed – a one-time call closed within the last GRACE_DAYS days
 *   gone            – a one-time call closed more than GRACE_DAYS days ago
 */
export function closedState(deadline: string | null, deadlineType: string | null): ClosedState {
  if (deadlineType !== 'fixed') return 'open'
  const dl = daysLeft(deadline)
  if (dl === null || dl >= 0) return 'open'
  return dl >= -GRACE_DAYS ? 'recently-closed' : 'gone'
}

/** Still an opportunity you can act on — the test for sitemap, indexing, featured. */
export const isOpenListing = (deadline: string | null, deadlineType: string | null) =>
  closedState(deadline, deadlineType) === 'open'

/** A one-time call that closed over a week ago — hide it from the listings. */
export const isGone = (deadline: string | null, deadlineType: string | null) =>
  closedState(deadline, deadlineType) === 'gone'

/** Show the "this call has closed" treatment (recently-closed or gone). */
export const isClosed = (deadline: string | null, deadlineType: string | null) =>
  closedState(deadline, deadlineType) !== 'open'
