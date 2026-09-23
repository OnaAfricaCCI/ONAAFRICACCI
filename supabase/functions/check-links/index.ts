// Supabase Edge Function: check-links
//
// Visits every opportunity's application_link and records whether it works.
// The homepage only features grants with link_ok = true, so a dead link can
// never be put in front of a visitor. Run daily via cron; safe to run by hand.
//
// Invoke with header:  x-digest-secret: <DIGEST_SECRET>
// Add ?limit=N to check only N rows (least-recently-checked first).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { checkLink } from '../_shared/check-link.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DIGEST_SECRET = Deno.env.get('DIGEST_SECRET')
const CONCURRENCY = 6

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++
        out[idx] = await fn(items[idx])
      }
    }),
  )
  return out
}

Deno.serve(async (req) => {
  try {
    if (DIGEST_SECRET && req.headers.get('x-digest-secret') !== DIGEST_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    }

    const limit = Number(new URL(req.url).searchParams.get('limit') ?? 0) || 500

    const { data, error } = await supabase
      .from('opportunities')
      .select('id, name, application_link, link_fail_streak')
      .not('application_link', 'is', null)
      .order('link_checked_at', { ascending: true, nullsFirst: true })
      .limit(limit)

    if (error) throw new Error(error.message)
    const rows = (data ?? []).filter((r) => (r.application_link ?? '').trim() !== '')

    const checkedAt = new Date().toISOString()

    const results = await mapLimit(rows, CONCURRENCY, async (r) => {
      const res = await checkLink(r.application_link!.trim())
      const previousStreak = Number(r.link_fail_streak ?? 0)

      /*
       * Two strikes before anything is called dead.
       *
       * A single sweep is one machine's opinion on one night. Servers hiccup,
       * CDNs serve transient 404s, our own network has bad moments. Requiring
       * two consecutive failures costs a day of delay and buys us not telling
       * a visitor that a live fund is broken.
       *
       * 'unreachable' and 'blocked' never become 'dead' however often they
       * repeat: we still have no evidence about the page, only about our own
       * access to it. Those stay 'unverified' — shown plainly, flagged to
       * nobody — and land in the report below for a human to look at.
       */
      const streak = res.verdict === 'ok' ? 0 : previousStreak + 1
      const state =
        res.verdict === 'ok' ? 'ok' : res.verdict === 'gone' && streak >= 2 ? 'dead' : 'unverified'

      const { error: upErr } = await supabase
        .from('opportunities')
        .update({
          link_state: state,
          link_fail_streak: streak,
          link_ok: state === 'ok',
          link_status: res.status,
          link_error: res.error,
          link_checked_at: checkedAt,
        })
        .eq('id', r.id)
      if (upErr) console.error('update failed', r.id, upErr.message)
      return { name: r.name, state, streak, ...res }
    })

    const by = (s: string) => results.filter((r) => r.state === s)
    const summary = {
      checked: results.length,
      ok: by('ok').length,
      dead: by('dead').length,
      unverified: by('unverified').length,
      // Confirmed broken — worth chasing a replacement URL for.
      deadLinks: by('dead').map((d) => ({ name: d.name, status: d.status, error: d.error })),
      // We could not reach these. Not necessarily broken — often a site that
      // refuses automated traffic. Listed so they can be eyeballed, not flagged.
      unverifiedLinks: by('unverified').map((d) => ({
        name: d.name,
        status: d.status,
        error: d.error,
        failedSweeps: d.streak,
      })),
    }
    console.log(
      'check-links:',
      JSON.stringify({
        checked: summary.checked,
        ok: summary.ok,
        dead: summary.dead,
        unverified: summary.unverified,
      }),
    )

    return new Response(JSON.stringify(summary, null, 2), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    console.error('check-links error:', err)
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    )
  }
})
