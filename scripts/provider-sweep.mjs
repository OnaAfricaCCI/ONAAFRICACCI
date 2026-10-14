#!/usr/bin/env node
/**
 * Twice-monthly provider sweep (runs via .github/workflows/provider-sweep.yml on
 * the 1st and 15th). For every funder that has a grants page, it:
 *   1. scrapes the page via Firecrawl and extracts the opportunities listed,
 *   2. refreshes that funder's `last_verified` (folds the verification pass in),
 *   3. diffs the extracted opportunities against what's already in the database,
 *   4. queues genuinely-new ones into `opportunity_submissions` (status 'sweep')
 *      so they appear in the admin Database tab for review — never auto-published,
 *   5. emails a digest to SWEEP_DIGEST_TO.
 *
 * Env (set as GitHub Actions secrets): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * FIRECRAWL_API_KEY, RESEND_API_KEY. Optional: SWEEP_DIGEST_TO, SWEEP_FROM,
 * SWEEP_LIMIT (cap providers, for testing), SWEEP_DRY ("1" = no writes/email).
 */

const BASE = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY
const FIRE = process.env.FIRECRAWL_API_KEY
const RESEND = process.env.RESEND_API_KEY
const TO = process.env.SWEEP_DIGEST_TO || 'ona.africacci@gmail.com'
const FROM = process.env.SWEEP_FROM || 'Ona Funds <hello@onafunds.com>'
const LIMIT = process.env.SWEEP_LIMIT ? parseInt(process.env.SWEEP_LIMIT, 10) : 0
const DRY = process.env.SWEEP_DRY === '1'
const CONCURRENCY = 4

for (const [k, v] of Object.entries({ SUPABASE_URL: BASE, SUPABASE_SERVICE_ROLE_KEY: SRK, FIRECRAWL_API_KEY: FIRE, RESEND_API_KEY: RESEND }))
  if (!v) { console.error(`Missing env ${k}`); process.exit(1) }

const H = { apikey: SRK, authorization: 'Bearer ' + SRK, 'content-type': 'application/json' }
const norm = (s) => String(s || '').toLowerCase().replace(/\b(19|20)\d{2}\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function sb(path, opts = {}) {
  const r = await fetch(BASE + '/rest/v1/' + path, { ...opts, headers: { ...H, ...(opts.headers || {}) } })
  if (!r.ok) throw new Error(`supabase ${r.status} ${await r.text()}`)
  return r.status === 204 ? null : r.json()
}

const SCHEMA = {
  type: 'object',
  properties: {
    opportunities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          status_or_deadline: { type: 'string' },
          apply_or_info_url: { type: 'string' },
          one_line_summary: { type: 'string' },
        },
      },
    },
  },
}

async function firecrawl(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + FIRE, 'content-type': 'application/json' },
      body: JSON.stringify({
        url, formats: ['json'], maxAge: 0, timeout: 45000,
        jsonOptions: { schema: SCHEMA, prompt: 'List the funding opportunities, grants, awards, residencies, fellowships or open calls actually shown on this page. Only those genuinely present.' },
      }),
    })
    if (res.status === 429) { await sleep(5000 * (attempt + 1)); continue }
    if (!res.ok) throw new Error(`firecrawl ${res.status}`)
    const d = await res.json()
    const extracted = d?.data?.json ?? d?.data?.extract ?? {}
    return Array.isArray(extracted.opportunities) ? extracted.opportunities : []
  }
  throw new Error('firecrawl rate-limited')
}

async function mapLimit(items, limit, fn) {
  const out = []; let i = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx) }
  })
  await Promise.all(workers)
  return out
}

;(async () => {
  const today = new Date().toISOString().slice(0, 10)
  // Prefer the specific grants page; fall back to the provider's main website
  // when no grants page is recorded, so no provider is silently skipped.
  const httpOrNull = (u) => (u && String(u).startsWith('http') ? String(u) : null)
  let funders = await sb('funders?select=id,name,grants_page_url,website&order=name')
  funders = funders
    .map((f) => ({ ...f, crawl_url: httpOrNull(f.grants_page_url) || httpOrNull(f.website) }))
    .filter((f) => f.crawl_url)
  if (LIMIT) funders = funders.slice(0, LIMIT)

  // What we already know, to diff against: existing opportunity names, and
  // already-queued sweep finds (so re-runs don't re-queue the same thing).
  const existing = await sb('opportunities?select=name,funder')
  const existingNorms = existing.map((o) => norm(o.name)).filter(Boolean)
  const queued = await sb("opportunity_submissions?select=name&status=eq.sweep")
  const queuedNorms = new Set(queued.map((q) => norm(q.name)))

  const isKnown = (title) => {
    const n = norm(title)
    if (!n || n.length < 4) return true // too generic to trust as "new"
    if (queuedNorms.has(n)) return true
    return existingNorms.some((e) => e === n || e.includes(n) || n.includes(e))
  }

  const newFinds = []       // {provider, title, url, deadline, summary}
  const failures = []       // {provider, url, error}
  let scanned = 0

  await mapLimit(funders, CONCURRENCY, async (f) => {
    try {
      const opps = await firecrawl(f.crawl_url)
      scanned++
      if (!DRY) await sb(`funders?id=eq.${f.id}`, { method: 'PATCH', body: JSON.stringify({ last_verified: today }) }).catch(() => {})
      for (const o of opps) {
        if (!o?.title || isKnown(o.title)) continue
        const n = norm(o.title)
        if (queuedNorms.has(n)) continue
        queuedNorms.add(n)
        newFinds.push({ provider: f.name, title: o.title, url: o.apply_or_info_url || f.crawl_url, deadline: o.status_or_deadline || '', summary: o.one_line_summary || '' })
      }
    } catch (e) {
      failures.push({ provider: f.name, url: f.grants_page_url, error: String(e.message || e) })
    }
  })

  // Queue new finds for review (status 'sweep').
  if (!DRY && newFinds.length) {
    const rows = newFinds.map((x) => ({
      name: x.title, organization: x.provider, link: x.url, deadline: x.deadline || null,
      notes: `Auto-discovered by sweep ${today} from ${x.provider}. ${x.summary}`.slice(0, 1000),
      status: 'sweep',
    }))
    for (let i = 0; i < rows.length; i += 50) await sb('opportunity_submissions', { method: 'POST', body: JSON.stringify(rows.slice(i, i + 50)) })
  }

  // Email digest.
  const lines = newFinds.map((x) => `• ${x.provider}: ${x.title}${x.deadline ? ` (${x.deadline})` : ''}\n  ${x.url}`).join('\n')
  const subject = `Ona Funds sweep — ${newFinds.length} new find${newFinds.length === 1 ? '' : 's'} (${today})`
  const text = [
    `Provider sweep for ${today}.`,
    `Scanned ${scanned} of ${funders.length} providers. ${failures.length} could not be read.`,
    ``,
    newFinds.length ? `NEW FINDS (${newFinds.length}) — review and publish in the admin Database tab:` : `No new opportunities found this run.`,
    lines,
    failures.length ? `\nCouldn't read (${failures.length}): ${failures.slice(0, 40).map((f) => f.provider).join(', ')}` : '',
    `\nReview at https://onafunds.com/admin (Database tab → New finds).`,
  ].filter(Boolean).join('\n')

  console.log(text)

  if (!DRY) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { authorization: 'Bearer ' + RESEND, 'content-type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [TO], subject, text }),
    })
    console.log('digest email:', r.status)
  }
  console.log(`\nDONE — scanned ${scanned}, new ${newFinds.length}, failed ${failures.length}${DRY ? ' (DRY RUN)' : ''}`)
})().catch((e) => { console.error('sweep failed:', e); process.exit(1) })
