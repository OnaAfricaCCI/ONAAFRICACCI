// Supabase Edge Function: weekly-digest
//
// Emails active subscribers a weekly round-up:
//   • grants added in the last 7 days
//   • grants closing in the next 14 days
//
// Sends via Resend. Every email carries a one-click unsubscribe link.
//
// Secrets required (supabase secrets set ...):
//   RESEND_API_KEY   - from resend.com
//   DIGEST_FROM      - e.g. "Ona <digest@yourdomain.com>" (domain must be verified in Resend)
//   SITE_URL         - e.g. "https://ona-africa-cci.vercel.app"
//   DIGEST_SECRET    - any long random string; callers must send it (see below)
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// Invoke with header:  x-digest-secret: <DIGEST_SECRET>
// Add ?dry=1 to build the email and report counts without sending.
// Add ?to=you@example.com to send only to yourself (a live test).

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const DIGEST_FROM = Deno.env.get('DIGEST_FROM') ?? 'Ona <onboarding@resend.dev>'
const SITE_URL = (Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '')
const DIGEST_SECRET = Deno.env.get('DIGEST_SECRET')

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

type Grant = {
  id: string
  name: string
  funder: string | null
  amount: string | null
  deadline: string | null
  deadline_type: string | null
  cci_sector: string | null
  eligible_countries: string[] | null
  application_link: string | null
  description: string | null
  created_at: string
}

type Subscriber = {
  email: string
  sectors: string[] | null
  countries: string[] | null
  unsubscribe_token: string
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const fmtDate = (iso: string | null) => {
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Keep a grant only if it matches the subscriber's stated preferences. */
function matches(g: Grant, sub: Subscriber): boolean {
  const wantSectors = (sub.sectors ?? []).filter(Boolean)
  const wantCountries = (sub.countries ?? []).filter(Boolean)
  if (wantSectors.length && !wantSectors.includes(g.cci_sector ?? '')) return false
  if (wantCountries.length) {
    const eligible = g.eligible_countries ?? []
    if (!wantCountries.some((c) => eligible.includes(c))) return false
  }
  return true
}

function grantRow(g: Grant): string {
  const bits = [
    g.funder ? esc(g.funder) : null,
    g.amount ? esc(g.amount) : null,
    g.deadline
      ? `Closes ${esc(fmtDate(g.deadline)!)}`
      : g.deadline_type === 'rolling'
        ? 'Rolling deadline'
        : null,
  ].filter(Boolean)

  const title = g.application_link
    ? `<a href="${esc(g.application_link)}" style="color:#c14a1b;text-decoration:none;">${esc(g.name)}</a>`
    : esc(g.name)

  return `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #d8cdb9;">
        <div style="font-size:17px;font-weight:600;line-height:1.35;color:#211a12;">${title}</div>
        ${bits.length ? `<div style="margin-top:4px;font-size:13px;color:#6f6455;">${bits.join(' &nbsp;·&nbsp; ')}</div>` : ''}
      </td>
    </tr>`
}

function section(title: string, grants: Grant[]): string {
  if (!grants.length) return ''
  return `
    <h2 style="margin:32px 0 4px;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#6f6455;font-weight:600;">
      ${esc(title)}
    </h2>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      ${grants.map(grantRow).join('')}
    </table>`
}

function buildEmail(sub: Subscriber, fresh: Grant[], closing: Grant[]): string {
  const unsubscribe = `${SITE_URL}/unsubscribe?token=${encodeURIComponent(sub.unsubscribe_token)}`
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#faf5ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#211a12;">
    <div style="max-width:560px;margin:0 auto;">
      <div style="padding-bottom:16px;border-bottom:2px solid #211a12;">
        <span style="font-size:22px;font-weight:700;">Ona<span style="color:#c14a1b;">.</span></span>
        <span style="margin-left:8px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#6f6455;">Weekly digest</span>
      </div>

      ${section('New this week', fresh)}
      ${section('Closing in the next 14 days', closing)}

      <p style="margin:32px 0 0;font-size:14px;line-height:1.6;color:#6f6455;">
        See everything in the
        <a href="${SITE_URL}/grants" style="color:#c14a1b;">grants database</a>.
      </p>

      <p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #d8cdb9;font-size:12px;line-height:1.6;color:#6f6455;">
        You're receiving this because you subscribed at Ona.
        <a href="${unsubscribe}" style="color:#6f6455;">Unsubscribe</a>.
      </p>
    </div>
  </body>
</html>`
}

async function sendEmail(to: string, subject: string, html: string, unsubscribeUrl: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: DIGEST_FROM,
      to: [to],
      subject,
      html,
      // Lets mail clients show a native unsubscribe button
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

Deno.serve(async (req) => {
  try {
    // Simple shared-secret guard so the endpoint can't be triggered by anyone.
    if (DIGEST_SECRET && req.headers.get('x-digest-secret') !== DIGEST_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    }

    // Retention, as promised in the privacy policy: messages and submissions
    // are kept no longer than 24 months. Runs alongside the weekly send.
    const cutoff = new Date(Date.now() - 24 * 30.44 * 864e5).toISOString()
    for (const table of ['contact_messages', 'opportunity_submissions']) {
      const { error } = await supabase.from(table).delete().lt('created_at', cutoff)
      if (error) console.error(`retention sweep failed for ${table}:`, error.message)
    }

    const url = new URL(req.url)
    const dryRun = url.searchParams.get('dry') === '1'
    const onlyTo = url.searchParams.get('to')

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 864e5).toISOString()
    const today = now.toISOString().slice(0, 10)
    const inTwoWeeks = new Date(now.getTime() + 14 * 864e5).toISOString().slice(0, 10)

    const [freshRes, closingRes] = await Promise.all([
      supabase
        .from('opportunities')
        .select('*')
        .gte('created_at', weekAgo)
        .order('created_at', { ascending: false })
        .limit(40),
      supabase
        .from('opportunities')
        .select('*')
        .gte('deadline', today)
        .lte('deadline', inTwoWeeks)
        .order('deadline', { ascending: true })
        .limit(40),
    ])

    if (freshRes.error) throw new Error(`fresh: ${freshRes.error.message}`)
    if (closingRes.error) throw new Error(`closing: ${closingRes.error.message}`)

    const fresh = (freshRes.data ?? []) as Grant[]
    const closing = (closingRes.data ?? []) as Grant[]

    // Nothing to say this week — don't send an empty email.
    if (fresh.length === 0 && closing.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, skipped: 'no grants to report', sent: 0 }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    }

    let subs: Subscriber[] = []
    if (onlyTo) {
      const { data } = await supabase
        .from('subscribers')
        .select('email, sectors, countries, unsubscribe_token')
        .eq('email', onlyTo.toLowerCase())
        .maybeSingle()
      subs = data
        ? [data as Subscriber]
        : [{ email: onlyTo, sectors: [], countries: [], unsubscribe_token: 'preview' }]
    } else {
      const { data, error } = await supabase
        .from('subscribers')
        .select('email, sectors, countries, unsubscribe_token')
        .eq('is_active', true)
      if (error) throw new Error(`subscribers: ${error.message}`)
      subs = (data ?? []) as Subscriber[]
    }

    if (!dryRun && !RESEND_API_KEY) throw new Error('RESEND_API_KEY secret is not set')

    const subject =
      fresh.length > 0
        ? `${fresh.length} new funding ${fresh.length === 1 ? 'opportunity' : 'opportunities'}${closing.length ? ` · ${closing.length} closing soon` : ''}`
        : `${closing.length} funding ${closing.length === 1 ? 'opportunity' : 'opportunities'} closing soon`

    const summary = { sent: 0, skippedNoMatch: 0, failed: [] as string[] }

    for (const sub of subs) {
      const myFresh = fresh.filter((g) => matches(g, sub))
      const myClosing = closing.filter((g) => matches(g, sub))
      if (myFresh.length === 0 && myClosing.length === 0) {
        summary.skippedNoMatch++
        continue
      }

      const html = buildEmail(sub, myFresh, myClosing)
      if (dryRun) {
        summary.sent++
        continue
      }

      try {
        await sendEmail(
          sub.email,
          subject,
          html,
          `${SITE_URL}/unsubscribe?token=${encodeURIComponent(sub.unsubscribe_token)}`,
        )
        summary.sent++
        // Stay under Resend's rate limit (2 requests/second on the free tier)
        await new Promise((r) => setTimeout(r, 600))
      } catch (err) {
        summary.failed.push(`${sub.email}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    console.log('weekly-digest:', JSON.stringify({ dryRun, subscribers: subs.length, ...summary }))

    return new Response(
      JSON.stringify({
        ok: true,
        dryRun,
        subscribers: subs.length,
        newGrants: fresh.length,
        closingGrants: closing.length,
        ...summary,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )
  } catch (err) {
    console.error('weekly-digest error:', err)
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    )
  }
})
