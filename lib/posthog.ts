/**
 * Read a few headline behavioural metrics from PostHog for the admin dashboard.
 *
 * Server-only: it uses a PostHog *personal* API key (read scope) kept in
 * POSTHOG_PERSONAL_API_KEY — never the public ingestion key, never shipped to
 * the browser. If the key or project id isn't set, every function returns a
 * "not configured" shape so the dashboard shows a tidy "Connect PostHog" slot
 * instead of breaking. Any PostHog error (down, rate-limited, missing scope) is
 * swallowed and reported as unavailable — the admin page must never 500 on it.
 */
const HOST = (process.env.POSTHOG_HOST ?? 'https://eu.posthog.com').replace(/\/$/, '')
const KEY = process.env.POSTHOG_PERSONAL_API_KEY
const PROJECT = process.env.POSTHOG_PROJECT_ID

export type PostHogMetrics =
  | { configured: false }
  | {
      configured: true
      ok: boolean
      // deltaPct is the % change vs the PRIOR 30 days: a number, or null when
      // there was no prior-period baseline (so it reads as "new" not "+∞").
      visitors30: number | null
      visitorsDeltaPct: number | null
      pageviews30: number | null
      pageviewsDeltaPct: number | null
      topPages: { path: string; count: number }[]
      events: { event: string; count: number; deltaPct: number | null }[]
      topGrants: { grant: string; funder: string; clicks: number }[]
      topFunders: { funder: string; clicks: number }[]
      sectorFilters: { sector: string; count: number }[]
    }

/** % change of current vs previous; null when there's no baseline to compare to. */
function deltaPct(cur: number, prev: number): number | null {
  if (prev <= 0) return null
  return Math.round(((cur - prev) / prev) * 100)
}

/** Run one HogQL query, returning its result rows (or null on any failure). */
async function hogql(query: string): Promise<unknown[][] | null> {
  if (!KEY || !PROJECT) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(`${HOST}/api/projects/${PROJECT}/query/`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = (await res.json()) as { results?: unknown[][] }
    return json.results ?? []
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// The funnel events worth watching, in display order.
const TRACKED_EVENTS = [
  'grant_apply_click', 'profile_completed', 'profile_setup_started',
  'subscribe', 'recommendation_opened', 'opportunity_saved', 'opportunity_submitted',
]

export async function getPostHogMetrics(): Promise<PostHogMetrics> {
  if (!KEY || !PROJECT) return { configured: false }

  // Each query returns BOTH windows: current = last 30 days, prev = the 30 days
  // before that, so we can show a percentage change.
  const CUR = `timestamp > now() - interval 30 day`
  const PREV = `timestamp > now() - interval 60 day and timestamp <= now() - interval 30 day`
  const WINDOW = `timestamp > now() - interval 60 day`

  const [pv, vis, top, evs, grants, fundersClicks, sectors] = await Promise.all([
    hogql(`select countIf(${CUR}) as cur, countIf(${PREV}) as prev from events where event = '$pageview' and ${WINDOW}`),
    hogql(`select uniqIf(person_id, ${CUR}) as cur, uniqIf(person_id, ${PREV}) as prev from events where event = '$pageview' and ${WINDOW}`),
    hogql(`select properties.$pathname as path, count() as c from events where event = '$pageview' and ${CUR} group by path order by c desc limit 8`),
    hogql(`select event, countIf(${CUR}) as cur, countIf(${PREV}) as prev from events where event in (${TRACKED_EVENTS.map((e) => `'${e}'`).join(',')}) and ${WINDOW} group by event order by cur desc`),
    // most-clicked grants (Apply clicks), with their funder
    hogql(`select properties.grant as g, properties.funder as f, count() as c from events where event = 'grant_apply_click' and ${CUR} group by g, f order by c desc limit 12`),
    // most-clicked funders (apply + card + profile views)
    hogql(`select properties.funder as f, count() as c from events where event in ('grant_apply_click','grant_card_click','funder_profile_view') and properties.funder is not null and ${CUR} group by f order by c desc limit 12`),
    // sectors people browse for (filter/search), 90-day window since these are sparser
    hogql(`select properties.value as s, count() as c from events where event = 'grant_filter' and properties.filter = 'sector' and timestamp > now() - interval 90 day group by s order by c desc limit 12`),
  ])

  const pair = (rows: unknown[][] | null): { cur: number | null; delta: number | null } => {
    if (!rows || !rows[0]) return { cur: null, delta: null }
    const cur = Number(rows[0][0] ?? 0)
    const prev = Number(rows[0][1] ?? 0)
    return { cur, delta: deltaPct(cur, prev) }
  }

  const anyOk = [pv, vis, top, evs].some((r) => r !== null)
  const pvP = pair(pv), visP = pair(vis)

  return {
    configured: true,
    ok: anyOk,
    pageviews30: pvP.cur,
    pageviewsDeltaPct: pvP.delta,
    visitors30: visP.cur,
    visitorsDeltaPct: visP.delta,
    topPages: (top ?? []).map((r) => ({ path: String(r[0] ?? '—'), count: Number(r[1] ?? 0) })),
    events: (evs ?? []).map((r) => ({ event: String(r[0] ?? ''), count: Number(r[1] ?? 0), deltaPct: deltaPct(Number(r[1] ?? 0), Number(r[2] ?? 0)) })),
    topGrants: (grants ?? []).map((r) => ({ grant: String(r[0] ?? '—'), funder: String(r[1] ?? '—'), clicks: Number(r[2] ?? 0) })),
    topFunders: (fundersClicks ?? []).map((r) => ({ funder: String(r[0] ?? '—'), clicks: Number(r[1] ?? 0) })),
    sectorFilters: (sectors ?? []).map((r) => ({ sector: String(r[0] ?? '—'), count: Number(r[1] ?? 0) })),
  }
}
