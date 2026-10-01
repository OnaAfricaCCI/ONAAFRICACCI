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
// The same scope logic the grants filter uses, so a subscriber's place
// preference means exactly what it means on the site: pick Kenya and you match
// Kenya, East Africa, pan-African and global calls — not only grants that
// literally say "Kenya". `lib/eligibility.ts` is pure TypeScript (no imports).
import { scopesFor, matchesScope } from '../../../lib/eligibility.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const DIGEST_FROM = Deno.env.get('DIGEST_FROM') ?? 'Ona <onboarding@resend.dev>'
// Where replies land. The digest sends from a dedicated address (digest@), but
// a reader who hits "reply" should reach a monitored inbox.
const REPLY_TO = Deno.env.get('DIGEST_REPLY_TO') ?? 'hello@onafunds.com'
const SITE_URL = (Deno.env.get('SITE_URL') || 'https://onafunds.com').replace(/\/$/, '')
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
  funding_type: string | null
  eligible_countries: string[] | null
  application_link: string | null
  description: string | null
  slug: string | null
  created_at: string
}

/**
 * "One number" — the week's single curated insight, shown in the dark block at
 * the foot of the digest. It MUST be a real, sourced figure (never invented),
 * so it is set by hand here each issue rather than generated. Set to `null` to
 * drop the block for a week when there is nothing solid to say.
 */
const ONE_NUMBER: { number: string; text: string; source: string } | null = {
  number: '11%',
  text:
    "of the Tony Elumelu Foundation's 2025 cohort were creative start-ups. General " +
    'entrepreneurship programmes are a real route to capital for creative businesses.',
  source: 'Source: TEF 2025 Annual Report. Cross-sector programme.',
}

/** The first weekly issue, so each digest can number itself (No. 001, 002 …). */
const DIGEST_EPOCH = new Date('2026-09-22T00:00:00Z')

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

  // Sector: a grant matches if it is in a chosen sector, or is multi-sector
  // (open to everyone), so a "Music" subscriber still gets cross-sector funds.
  if (wantSectors.length) {
    const sec = g.cci_sector ?? ''
    if (!wantSectors.includes(sec) && sec !== 'multi-sector') return false
  }

  // Place: scope-aware, exactly like the grants filter — a chosen country also
  // matches the regions, the continent and global calls that take it in.
  if (wantCountries.length) {
    const scopes = scopesFor(g.eligible_countries)
    if (!wantCountries.some((c) => matchesScope(c, scopes))) return false
  }
  return true
}

// ---- small text helpers -------------------------------------------------------
const FONT = "Arial,'Helvetica Neue',Helvetica,sans-serif"
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const numWord = (n: number) => (n <= 12 ? NUM[n] : String(n))
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** "7 Nov" — day and month, the form the digest uses for deadlines. */
const shortDate = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** Where a grant points: its own page on Ona, falling back to the funder link. */
const grantUrl = (g: Grant) =>
  g.slug ? `${SITE_URL}/grants/${g.slug}` : g.application_link ?? `${SITE_URL}/grants`

/** "Pitch fund · Film", from funding type and sector. */
const kicker = (g: Grant) =>
  [g.funding_type ? cap(g.funding_type) : null, g.cci_sector ? cap(g.cci_sector) : null]
    .filter(Boolean)
    .join(' · ')

const trim = (s: string | null, n = 150) => {
  if (!s) return ''
  const one = s.split(/\n{2,}/)[0].trim()
  return one.length > n ? one.slice(0, n).replace(/\s+\S*$/, '') + '…' : one
}

const deadlineLabel = (g: Grant) =>
  g.deadline ? `Closes ${shortDate(g.deadline)}` : g.deadline_type === 'rolling' ? 'Rolling' : cap(g.deadline_type ?? 'Open')

/** The sectors in play this week, lead first, for the "This week" blurb. */
function sectorSummary(grants: Grant[]): { lead: string; rest: string[] } {
  const counts = new Map<string, number>()
  for (const g of grants) {
    const s = cap(g.cci_sector ?? '')
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1)
  }
  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s)
  return { lead: ordered[0] ?? '', rest: ordered.slice(1) }
}

function thisWeek(fresh: Grant[], closing: Grant[]): { heading: string; blurb: string } {
  const c = closing.length
  const f = fresh.length
  const parts: string[] = []
  if (c) parts.push(`${cap(numWord(c))} ${c === 1 ? 'call closes' : 'calls close'} soon`)
  if (f) parts.push(`${c ? numWord(f) : cap(numWord(f))} new ${f === 1 ? 'one' : 'ones'} opened this week`)
  const heading = parts.join(', and ') + '.'

  const { lead, rest } = sectorSummary([...closing, ...fresh])
  const restText =
    rest.length === 0
      ? ''
      : rest.length === 1
        ? `, with ${rest[0].toLowerCase()} alongside it`
        : `, with ${rest.slice(0, -1).map((r) => r.toLowerCase()).join(', ')} and ${rest[rest.length - 1].toLowerCase()} alongside it`
  const lead_s = lead ? `${lead} leads this week${restText}. ` : ''
  const blurb = `${lead_s}Every listing below has been checked, with the deadline up front.`
  return { heading, blurb }
}

// ---- email sections -----------------------------------------------------------
function sectionHeading(label: string): string {
  return `<tr><td style="padding:24px 28px 0;">
    <div style="border-top:2px solid #121412;padding-top:14px;font:bold 11px/1 ${FONT};letter-spacing:.2em;text-transform:uppercase;color:#5F7359;">${esc(label)}</div>
  </td></tr>`
}

function closingCard(g: Grant): string {
  return `<tr><td style="padding:12px 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #DCE3D5;background:#FFFFFF;"><tr><td style="padding:18px;">
      ${kicker(g) ? `<div style="font:11px/1.2 ${FONT};letter-spacing:.1em;text-transform:uppercase;color:#5F7359;">${esc(kicker(g))}</div>` : ''}
      <div style="margin-top:7px;font:bold 18px/1.3 ${FONT};color:#121412;"><a href="${esc(grantUrl(g))}" style="color:#121412;text-decoration:none;">${esc(g.name)}</a></div>
      ${g.description ? `<div style="margin-top:7px;font:14px/1.5 ${FONT};color:#4A5249;">${esc(trim(g.description))}</div>` : ''}
      <div style="margin-top:12px;font:bold 12px/1 ${FONT};letter-spacing:.08em;text-transform:uppercase;color:#C23A22;">${esc(deadlineLabel(g))}</div>
    </td></tr></table>
  </td></tr>`
}

function freshRow(g: Grant): string {
  const meta = [g.funder ? esc(g.funder) : null, esc(deadlineLabel(g))].filter(Boolean).join(' · ')
  return `<tr><td style="padding:14px 0;border-bottom:1px solid #DCE3D5;">
    ${g.cci_sector ? `<div style="font:11px/1.2 ${FONT};letter-spacing:.1em;text-transform:uppercase;color:#5F7359;">${esc(cap(g.cci_sector))}</div>` : ''}
    <div style="margin-top:4px;font:bold 16px/1.3 ${FONT};color:#121412;"><a href="${esc(grantUrl(g))}" style="color:#121412;text-decoration:none;">${esc(g.name)}</a></div>
    ${meta ? `<div style="margin-top:3px;font:13px/1.4 ${FONT};color:#4A5249;">${meta}</div>` : ''}
  </td></tr>`
}

type OneNumber = { number: string; text: string; source: string }

/**
 * The "One number" content. If a sourced figure is set in ONE_NUMBER it wins;
 * otherwise we derive an honest one from the catalogue — the number of
 * opportunities open on Ona right now. Never an invented figure either way.
 */
function deriveOneNumber(openCount: number): OneNumber {
  return {
    number: String(openCount),
    text:
      'funding opportunities are open on Ona Funds right now — the running record of funding ' +
      "for Africa's creative and cultural industries.",
    source: `Ona Funds, ${fmtDate(new Date().toISOString())}.`,
  }
}

function oneNumberBlock(one: OneNumber | null): string {
  if (!one) return ''
  return `<tr><td style="padding:28px 28px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#121412;"><tr><td style="padding:28px;">
      <div style="font:bold 11px/1 ${FONT};letter-spacing:.2em;text-transform:uppercase;color:#8FA487;">One number</div>
      <div style="margin-top:10px;font:bold 52px/1 ${FONT};color:#FF6A4D;">${esc(one.number)}</div>
      <div style="margin-top:14px;font:15px/1.6 ${FONT};color:#F6F4EC;">${esc(one.text)}</div>
      <div style="margin-top:12px;font:11px/1.5 ${FONT};color:#8FA487;">${esc(one.source)}</div>
    </td></tr></table>
  </td></tr>`
}

/** New grants to show in full before the "+ more" link. */
const FRESH_SHOWN = 6

function buildEmail(sub: Subscriber, fresh: Grant[], closing: Grant[], one: OneNumber | null): string {
  const unsubscribe = `${SITE_URL}/unsubscribe?token=${encodeURIComponent(sub.unsubscribe_token)}`
  const issue = Math.max(1, Math.floor((Date.now() - DIGEST_EPOCH.getTime()) / (7 * 864e5)) + 1)
  const issueNo = String(issue).padStart(3, '0')
  const dateStr = fmtDate(new Date().toISOString())
  const { heading, blurb } = thisWeek(fresh, closing)
  const preheader = `${cap(numWord(closing.length))} ${closing.length === 1 ? 'call closes' : 'calls close'} soon, ${numWord(fresh.length)} new this week${ONE_NUMBER ? ', and one number worth knowing' : ''}.`

  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#E4E8DE;">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;color:#E4E8DE;">${esc(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E4E8DE;"><tr><td align="center" style="padding:24px 10px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#F6F4EC;">

        <!-- Header -->
        <tr><td style="background:#121412;padding:22px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td align="left" valign="middle"><a href="${SITE_URL}" style="text-decoration:none;"><img src="${SITE_URL}/assets/email/ona-funds-logo-ivory.png" width="150" alt="Ona Funds" style="display:block;border:0;width:150px;max-width:150px;height:auto;"></a></td>
            <td align="right" valign="middle" style="font:bold 11px/1 ${FONT};letter-spacing:.2em;text-transform:uppercase;color:#8FA487;">Weekly digest</td>
          </tr></table>
          <div style="margin-top:10px;font:11px/1 ${FONT};letter-spacing:.14em;text-transform:uppercase;color:#8FA487;">No. ${issueNo} &nbsp;·&nbsp; ${esc(dateStr ?? '')}</div>
        </td></tr>

        <!-- This week -->
        <tr><td style="padding:28px 28px 4px;">
          <div style="font:bold 11px/1 ${FONT};letter-spacing:.2em;text-transform:uppercase;color:#5F7359;">This week</div>
          <div style="margin-top:12px;font:bold 24px/1.25 ${FONT};color:#121412;">${esc(heading)}</div>
          <div style="margin-top:12px;font:15px/1.6 ${FONT};color:#4A5249;">${esc(blurb)}</div>
        </td></tr>

        <!-- Motif -->
        <tr><td style="padding:24px 28px 0;"><img src="${SITE_URL}/assets/email/ona-funds-find-strip.png" width="544" alt="" style="display:block;border:0;width:100%;max-width:544px;height:auto;"></td></tr>

        ${closing.length ? sectionHeading('Closing soon') + closing.map(closingCard).join('') : ''}

        ${
          fresh.length
            ? sectionHeading('New this week') +
              `<tr><td style="padding:4px 28px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${fresh.slice(0, FRESH_SHOWN).map(freshRow).join('')}</table>
                <div style="margin-top:18px;"><a href="${SITE_URL}/grants" style="font:bold 13px/1 ${FONT};letter-spacing:.06em;text-transform:uppercase;color:#C23A22;text-decoration:none;">${fresh.length > FRESH_SHOWN ? `+ ${fresh.length - FRESH_SHOWN} more · Browse all open grants →` : 'Browse all open grants →'}</a></div>
              </td></tr>`
            : ''
        }

        ${oneNumberBlock(one)}

        <!-- Footer -->
        <tr><td style="padding:28px;border-top:1px solid #DCE3D5;">
          <div style="font:13px/1.6 ${FONT};color:#4A5249;">Know a call we missed? Reply to this email or write to <a href="mailto:hello@onafunds.com" style="color:#C23A22;">hello@onafunds.com</a>.</div>
          <div style="margin-top:14px;font:11px/1.6 ${FONT};color:#8a8f84;">You&rsquo;re receiving this because you signed up at onafunds.com. We list opportunities; we don&rsquo;t award funding. Always confirm details with the funder before applying.</div>
          <div style="margin-top:10px;font:11px/1.6 ${FONT};color:#8a8f84;"><a href="${unsubscribe}" style="color:#5F7359;">Unsubscribe</a> &nbsp;·&nbsp; <a href="${SITE_URL}/privacy" style="color:#5F7359;">Privacy</a></div>
        </td></tr>

      </table>
    </td></tr></table>
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
      reply_to: REPLY_TO,
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

    const subjBits = [
      closing.length ? `${closing.length} closing soon` : null,
      fresh.length ? `${fresh.length} new this week` : null,
    ].filter(Boolean)
    const subject = `Ona Funds weekly · ${subjBits.join(' · ')}`

    // "One number": the curated figure if one is set, otherwise derived from the
    // catalogue (count of opportunities currently open). Resolved once for all.
    let oneNumber: OneNumber | null = ONE_NUMBER
    if (!oneNumber) {
      const { count } = await supabase
        .from('opportunities')
        .select('id', { count: 'exact', head: true })
        .not('description', 'is', null)
        .neq('link_state', 'dead')
        .or(`deadline.is.null,deadline.gte.${today}`)
      oneNumber = deriveOneNumber(count ?? 0)
    }

    const summary = { sent: 0, skippedNoMatch: 0, failed: [] as string[] }

    for (const sub of subs) {
      const myFresh = fresh.filter((g) => matches(g, sub))
      const myClosing = closing.filter((g) => matches(g, sub))
      if (myFresh.length === 0 && myClosing.length === 0) {
        summary.skippedNoMatch++
        continue
      }

      const html = buildEmail(sub, myFresh, myClosing, oneNumber)
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
