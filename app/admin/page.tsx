import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAdminEmail } from '@/lib/admin'
import { getPostHogMetrics } from '@/lib/posthog'
import AdminTabs from './AdminTabs'

export const dynamic = 'force-dynamic'

// Hidden from search engines as well as from the UI. The real protection is the
// server-side admin check below; this is belt-and-braces.
export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false, nocache: true },
}

type Row = Record<string, unknown>

function fmtDate(v: unknown): string {
  if (!v) return '—'
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function tally(rows: Row[], key: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) { const k = String(r[key] ?? '—'); out[k] = (out[k] ?? 0) + 1 }
  return out
}

// ---- Database-tab helpers --------------------------------------------------
const STATUS_LABEL: Record<string, string> = {
  open: 'Open for applications',
  opens_on: 'Opens on a date',
  awaiting_next_call: 'Awaiting next call',
  closed_uncertain: 'Closed — uncertain',
  invitation_only: 'By invitation only',
  unconfirmed: 'Window not confirmed',
}
const statusLabel = (s: unknown) => STATUS_LABEL[String(s ?? '')] ?? '—'
const isListed = (g: Row) => !!g.description // every grant has a name; listing needs a description
/** The single most useful next step for this grant, or '—' when it's fine. */
function grantAction(g: Row): string {
  if (!isListed(g)) return 'Add description to list'
  if (g.link_state === 'dead') return 'Fix broken link'
  if (g.application_status === 'unconfirmed') return 'Confirm status'
  if (g.link_state === 'unverified') return 'Verify link'
  if (g.application_status === 'opens_on') return 'Opens soon — watch date'
  if (g.application_status === 'awaiting_next_call') return 'Watch for next call'
  if (g.application_status === 'closed_uncertain') return 'Review / archive'
  return '—' // open + working + listed, or invitation-only — nothing to do
}
const isActionable = (a: string) => a !== '—'
const normName = (s: unknown) => String(s ?? '').trim().toLowerCase()

export default async function AdminPage() {
  // --- The gate. Not signed in, or not an admin → 404 (page "doesn't exist"). ---
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) notFound()

  // Everything below runs with the service role (sees all rows), only ever
  // reached after the admin check above.
  const sel = (t: string) =>
    supabaseAdmin.from(t).select('*').order('created_at', { ascending: false }).limit(500) as unknown as Promise<{ data: Row[] | null }>

  const [subsR, profsR, savedR, msgsR, subsmR, emailsR, oppsR, fundersR, usersR, ph] = await Promise.all([
    sel('subscribers'),
    supabaseAdmin.from('grant_seeker_profiles').select('*').order('completed_at', { ascending: false }).limit(500) as unknown as Promise<{ data: Row[] | null }>,
    sel('saved_opportunities'),
    sel('contact_messages'),
    sel('opportunity_submissions'),
    sel('profile_confirmation_emails'),
    supabaseAdmin.from('opportunities').select('id,name,slug,funder,application_status,funding_type,link_state,source,description').limit(2000) as unknown as Promise<{ data: Row[] | null }>,
    supabaseAdmin.from('funders').select('id,name,funder_type,headquarters_country,is_active,grants_page_url,last_verified,slug').limit(2000) as unknown as Promise<{ data: Row[] | null }>,
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    getPostHogMetrics(),
  ])

  const subs = subsR.data ?? []
  const profs = profsR.data ?? []
  const saved = savedR.data ?? []
  const msgs = msgsR.data ?? []
  const subms = subsmR.data ?? []
  const emails = emailsR.data ?? []
  const opps = oppsR.data ?? []
  const funders = fundersR.data ?? []
  const emailByUser = new Map((usersR.data?.users ?? []).map((u) => [u.id, u.email ?? '—']))
  // Auto-discovered finds from the twice-monthly provider sweep land in
  // opportunity_submissions with status 'sweep' — kept apart from real user submissions.
  const sweepFinds = subms.filter((s) => s.status === 'sweep')
  const userSubms = subms.filter((s) => s.status !== 'sweep')

  const activeSubs = subs.filter((s) => s.is_active).length
  const completed = profs.filter((p) => p.status === 'completed')
  const drafts = profs.filter((p) => p.status === 'draft')
  const pendingSubms = subms.filter((s) => String(s.status ?? '').toLowerCase() === 'pending' || !s.status).length
  const b1 = profs.filter((p) => p.batch1_completed).length
  const b2 = profs.filter((p) => p.batch2_completed).length
  const b3 = profs.filter((p) => p.batch3_completed).length
  const emailSent = emails.filter((e) => e.status === 'sent').length
  const emailFailed = emails.filter((e) => e.status === 'failed')

  // Unfinished profiles: those started-but-not-completed (drafts), and accounts
  // that signed up but never began a profile at all (admins excluded).
  const authUsers = usersR.data?.users ?? []
  const profileUserIds = new Set(profs.map((p) => String(p.user_id)))
  const isTestAccount = (email: string | undefined) => !email || /@(example\.com|onatest\.invalid)$/i.test(email)
  const noProfile = authUsers.filter((u) => !profileUserIds.has(u.id) && !isAdminEmail(u.email ?? null) && !isTestAccount(u.email))

  // ---- Database tab: reconcile providers (funders) with grants (opportunities)
  // Grants link to funders by NAME only (funder_id is unset), so match on name.
  const grantsByFunder = new Map<string, Row[]>()
  for (const g of opps) { const k = normName(g.funder); if (!grantsByFunder.has(k)) grantsByFunder.set(k, []); grantsByFunder.get(k)!.push(g) }
  const funderNameSet = new Set(funders.map((f) => normName(f.name)))

  const providerRows = funders
    .map((f) => {
      const gs = grantsByFunder.get(normName(f.name)) ?? []
      return { f, grants: gs, listed: gs.filter(isListed).length, need: gs.filter((g) => isActionable(grantAction(g))).length }
    })
    .sort((a, b) => b.need - a.need || b.grants.length - a.grants.length || String(a.f.name).localeCompare(String(b.f.name)))

  const grantsSorted = [...opps].sort((a, b) =>
    normName(a.funder).localeCompare(normName(b.funder)) || String(a.application_status).localeCompare(String(b.application_status)))

  const orphanGrants = opps.filter((g) => !funderNameSet.has(normName(g.funder)))
  const listedCount = opps.filter(isListed).length
  const needActionCount = opps.filter((g) => isActionable(grantAction(g))).length
  const deadLinks = opps.filter((g) => g.link_state === 'dead').length

  // ---- TAB 1: Admin (operational dashboard) --------------------------------
  const adminTab = (
    <>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Digest subscribers" value={activeSubs} sub={`${subs.length} total`} />
        <Tile label="Profiles completed" value={completed.length} sub={`${drafts.length} draft`} />
        <Tile label="Saved opportunities" value={saved.length} />
        <Tile label="Contact messages" value={msgs.length} />
        <Tile label="Submissions pending" value={pendingSubms} sub={`${subms.length} total`} />
        <Tile label="Live opportunities" value={opps.length} />
      </div>

      <Section title="Behaviour · last 30 days" note="from PostHog">
        {ph.configured && ph.ok ? (
          <>
            <p className="mb-3 text-[12px]" style={{ color: 'var(--graphite)' }}>Change shown is vs the previous 30 days.</p>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile label="Visitors" value={ph.visitors30 ?? '—'} sub={<DeltaLine pct={ph.visitorsDeltaPct} />} />
              <Tile label="Page views" value={ph.pageviews30 ?? '—'} sub={<DeltaLine pct={ph.pageviewsDeltaPct} />} />
              {ph.events.slice(0, 2).map((e) => <Tile key={e.event} label={prettyEvent(e.event)} value={e.count} sub={<DeltaLine pct={e.deltaPct} />} />)}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <MiniTable head={['Top pages', 'Views']} rows={ph.topPages.map((p) => [p.path, String(p.count)])} />
              <MiniTable head={['Key action', 'Count', 'vs prior 30d']} rows={ph.events.map((e) => [prettyEvent(e.event), String(e.count), deltaText(e.deltaPct)])} />
            </div>
          </>
        ) : (
          <div className="p-5 text-[14px]" style={{ border: '1px dashed var(--line)', color: 'var(--graphite)' }}>
            {ph.configured
              ? 'PostHog is configured but returned no data — the API key may need the Read scopes, or there’s no data in the last 30 days.'
              : 'PostHog not connected yet.'}
          </div>
        )}
      </Section>

      <Section title="Digest subscribers" note={`${activeSubs} active`}>
        <MiniTable head={['Email', 'Sectors', 'Countries', 'Joined', 'Status']}
          rows={subs.slice(0, 25).map((s) => [String(s.email ?? '—'), arr(s.sectors), arr(s.countries), fmtDate(s.created_at), s.is_active ? 'active' : 'unsubscribed'])} />
      </Section>

      <Section title="Grant-seeker profiles" note={`${completed.length} completed · ${drafts.length} draft`}>
        <div className="mb-4 flex flex-wrap gap-2 text-[12px]">
          {Object.entries(tally(completed, 'applicant_type')).map(([k, v]) => <Pill key={k} text={`${k}: ${v}`} />)}
          <Pill text={`Phase 2 — batch 1: ${b1} · 2: ${b2} · 3: ${b3}`} accent />
        </div>
        <MiniTable head={['Who', 'Applying as', 'Based', 'Completed']}
          rows={completed.slice(0, 25).map((p) => [emailByUser.get(String(p.user_id)) ?? '—', String(p.applicant_type ?? '—'), String(p.country_code ?? '—'), fmtDate(p.completed_at ?? p.created_at)])} />
      </Section>

      <Section title="Unfinished profiles" note={`${drafts.length} started · ${noProfile.length} not started`}>
        <p className="mb-3 text-[13px]" style={{ color: 'var(--graphite)' }}>People who haven’t completed a profile yet — a prompt or follow-up could nudge them over the line.</p>
        {drafts.length > 0 && (
          <div className="mb-5">
            <span className="mf-lbl" style={{ color: 'var(--accent-deep)' }}>Started but not finished ({drafts.length})</span>
            <div className="mt-2">
              <MiniTable head={['Who', 'Applying as', 'Based', 'Started']}
                rows={drafts.slice(0, 25).map((p) => [emailByUser.get(String(p.user_id)) ?? '—', String(p.applicant_type ?? '—'), String(p.country_code ?? '—'), fmtDate(p.created_at)])} />
            </div>
          </div>
        )}
        <span className="mf-lbl">Signed up, no profile started ({noProfile.length})</span>
        <div className="mt-2">
          <MiniTable head={['Email', 'Signed up']} rows={noProfile.slice(0, 25).map((u) => [u.email ?? '—', fmtDate(u.created_at)])} />
        </div>
      </Section>

      <Section title="Contact messages" note={`${msgs.length} total`}>
        <div className="flex flex-col gap-3">
          {msgs.slice(0, 15).map((m) => (
            <div key={String(m.id)} className="p-4" style={{ border: '1px solid var(--line)' }}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[15px] font-bold">{String(m.name ?? '—')} <span className="font-normal" style={{ color: 'var(--graphite)' }}>· {String(m.email ?? '—')}</span></span>
                <span className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{fmtDate(m.created_at)}</span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed" style={{ color: 'var(--ink)' }}>{String(m.message ?? '')}</p>
            </div>
          ))}
          {msgs.length === 0 && <Empty />}
        </div>
      </Section>

      <Section title="Opportunity submissions" note={`${pendingSubms} pending`}>
        <MiniTable head={['Name', 'Organisation', 'Link', 'Contact', 'Status', 'When']}
          rows={userSubms.slice(0, 25).map((s) => [String(s.name ?? '—'), String(s.organization ?? '—'), String(s.link ?? '—'), String(s.contact_email ?? '—'), String(s.status ?? 'pending'), fmtDate(s.created_at)])} />
      </Section>

      <div className="grid gap-5 sm:grid-cols-2">
        <Section title="Profile emails" note={`${emailSent} sent · ${emailFailed.length} failed`}>
          {emailFailed.length > 0 ? (
            <MiniTable head={['User', 'Error', 'When']} rows={emailFailed.slice(0, 10).map((e) => [emailByUser.get(String(e.user_id)) ?? String(e.user_id), String(e.last_error ?? '—').slice(0, 60), fmtDate(e.updated_at ?? e.created_at)])} />
          ) : <p className="text-[14px]" style={{ color: 'var(--graphite)' }}>All confirmation emails sent cleanly.</p>}
        </Section>
        <Section title="Opportunities" note={`${opps.length} total`}>
          <div className="flex flex-wrap gap-2 text-[12px]">
            {Object.entries(tally(opps, 'application_status')).map(([k, v]) => <Pill key={k} text={`${statusLabel(k)}: ${v}`} />)}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
            {Object.entries(tally(opps, 'funding_type')).map(([k, v]) => <Pill key={k} text={`${k}: ${v}`} accent />)}
          </div>
        </Section>
      </div>

      <p className="mt-10 text-[12px]" style={{ color: 'var(--ink-soft)' }}>
        Read-only internal view. Personal data shown here is for Ona Funds administration only — never export or share it.
      </p>
    </>
  )

  // ---- TAB 2: Database (providers + grants + listed/action) ----------------
  const databaseTab = (
    <>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="New finds (sweep)" value={sweepFinds.length} sub="to review" />
        <Tile label="Grants providers" value={funders.length} />
        <Tile label="Grants (total)" value={opps.length} />
        <Tile label="Listed on site" value={listedCount} sub={`${opps.length - listedCount} not listed`} />
        <Tile label="Need action" value={needActionCount} />
        <Tile label="Dead links" value={deadLinks} />
      </div>

      {sweepFinds.length > 0 && (
        <Section title="New finds from sweeps" note={`${sweepFinds.length} to review`}>
          <p className="mb-3 text-[13px]" style={{ color: 'var(--graphite)' }}>Auto-discovered by the twice-monthly provider sweep (1st &amp; 15th). Review these and publish the good ones — nothing here is ever auto-published to the site.</p>
          <MiniTable
            head={['Provider', 'Opportunity', 'Deadline / status', 'Link', 'Found']}
            rows={sweepFinds.slice(0, 100).map((s) => [String(s.organization ?? '—'), String(s.name ?? '—'), String(s.deadline ?? '—'), String(s.link ?? '—'), fmtDate(s.created_at)])}
          />
        </Section>
      )}

      <Section title="Grants providers" note={`${funders.length} in the funders directory`}>
        <p className="mb-3 text-[13px]" style={{ color: 'var(--graphite)' }}>The full list of fund providers, with how many of their grants are on the site and how many need attention. Sorted by most to action.</p>
        <MiniTable
          head={['Provider', 'Type', 'Country', 'Active', 'Grants', 'Listed', 'Need action', 'Last verified']}
          rows={providerRows.map(({ f, grants, listed, need }) => [
            String(f.name ?? '—'),
            String(f.funder_type ?? '—'),
            String(f.headquarters_country ?? '—'),
            f.is_active ? 'yes' : 'no',
            String(grants.length),
            String(listed),
            need > 0 ? String(need) : '—',
            fmtDate(f.last_verified),
          ])}
        />
      </Section>

      <Section title="Grants under each provider" note={`${opps.length} grants`}>
        <p className="mb-3 text-[13px]" style={{ color: 'var(--graphite)' }}>Every grant, grouped under its provider, showing whether it’s listed on the site and the next step to take.</p>
        <MiniTable
          head={['Provider', 'Grant', 'Status', 'Listed', 'Link', 'Action']}
          rows={grantsSorted.map((g) => [
            String(g.funder ?? '—'),
            String(g.name ?? '—'),
            statusLabel(g.application_status),
            isListed(g) ? 'listed' : 'not listed',
            String(g.link_state ?? '—'),
            grantAction(g),
          ])}
        />
      </Section>

      {orphanGrants.length > 0 && (
        <Section title="Provider name not in the directory" note={`${orphanGrants.length} grants`}>
          <p className="mb-3 text-[13px]" style={{ color: 'var(--graphite)' }}>These grants have a provider name that doesn’t exactly match a row in the funders directory — reconcile the name or add the provider.</p>
          <MiniTable head={['Grant', 'Provider name on grant', 'Status', 'Listed']}
            rows={orphanGrants.map((g) => [String(g.name ?? '—'), String(g.funder ?? '—'), statusLabel(g.application_status), isListed(g) ? 'listed' : 'not listed'])} />
        </Section>
      )}
    </>
  )

  return (
    <main className="mx-auto max-w-[1100px] px-5 py-10 sm:py-12">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <span className="mf-lbl">Ona Funds · internal</span>
          <h1 className="mf-d mt-2 text-[32px] sm:text-[40px]">Admin.</h1>
        </div>
        <p className="text-[13px]" style={{ color: 'var(--ink-soft)' }}>Signed in as {user.email} · read-only</p>
      </div>
      <AdminTabs adminTab={adminTab} databaseTab={databaseTab} />
    </main>
  )
}

// ---- small presentational helpers (local to this page) ---------------------
function deltaText(pct: number | null): string { return pct === null ? 'new' : pct === 0 ? '—' : `${pct > 0 ? '+' : ''}${pct}%` }
function DeltaLine({ pct }: { pct: number | null }) {
  if (pct === null) return <span style={{ color: 'var(--sage-deep)' }}>new (no prior data)</span>
  if (pct === 0) return <span style={{ color: 'var(--graphite)' }}>no change vs prior 30d</span>
  const up = pct > 0
  return (
    <span style={{ color: up ? 'var(--sage-deep)' : 'var(--accent-deep)', fontWeight: 700 }}>
      {up ? '▲' : '▼'} {up ? '+' : ''}{pct}% <span style={{ color: 'var(--graphite)', fontWeight: 400 }}>vs prior 30d</span>
    </span>
  )
}
function Tile({ label, value, sub }: { label: string; value: number | string; sub?: React.ReactNode }) {
  return (
    <div className="p-4" style={{ border: '1px solid var(--ink)' }}>
      <div className="mf-lbl">{label}</div>
      <div className="mf-d mt-1 text-[28px] leading-none tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-[12px]" style={{ color: 'var(--graphite)' }}>{sub}</div>}
    </div>
  )
}
function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2" style={{ borderBottom: '2px solid var(--ink)', paddingBottom: 6 }}>
        <h2 className="mf-d text-[20px]">{title}</h2>
        {note && <span className="mf-lbl" style={{ color: 'var(--sage-deep)' }}>{note}</span>}
      </div>
      {children}
    </section>
  )
}
function MiniTable({ head, rows }: { head: string[]; rows: string[][] }) {
  if (rows.length === 0) return <Empty />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr>{head.map((h) => <th key={h} className="mf-lbl px-2 py-2 text-left" style={{ borderBottom: '1px solid var(--sage-mist)' }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} className="px-2 py-2 align-top" style={{ borderBottom: '1px solid var(--sage-mist)', color: j === 0 ? 'var(--ink)' : 'var(--graphite)' }}>{c || '—'}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
function Pill({ text, accent }: { text: string; accent?: boolean }) {
  return <span className="px-2.5 py-1" style={{ border: '1px solid var(--line)', background: accent ? 'var(--sage-mist)' : 'transparent', color: 'var(--ink)' }}>{text}</span>
}
function Empty() { return <p className="text-[14px]" style={{ color: 'var(--graphite)' }}>Nothing yet.</p> }
function arr(v: unknown): string { return Array.isArray(v) && v.length ? v.join(', ') : '—' }
function prettyEvent(e: string): string { return e.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }
