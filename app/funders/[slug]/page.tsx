import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/media'
import type { Funder } from '@/lib/types'
import { isPublishableInstitution } from '@/lib/quality'
import TrackedLink from '@/app/components/TrackedLink'
import BackLink from '@/app/components/BackLink'
import GrantList, { type GrantListItem } from '@/app/components/GrantList'
import { isPublishableGrant } from '@/lib/quality'
import { OG_IMAGE } from '@/lib/site'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A titled block. Renders nothing at all when it has no content. */
function Section({
  title,
  children,
  empty,
}: {
  title: string
  children: React.ReactNode
  empty?: boolean
}) {
  if (empty) return null
  return (
    <section className="border-t border-[var(--line)] py-8">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-soft)]">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

/** Blank-line separated paragraphs. */
function Prose({ text }: { text: string }) {
  return (
    <div className="space-y-4 text-[17px] leading-relaxed text-[var(--ink-2)]">
      {text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i}>{p}</p>
        ))}
    </div>
  )
}

function Pills({ items, tone }: { items: string[]; tone: 'forest' | 'ochre' }) {
  const cls =
    tone === 'forest'
      ? 'border border-[var(--forest)] text-[var(--forest)]'
      : 'bg-[var(--ochre-soft)] text-[var(--ink)]'
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <span
          key={i}
          className={`${cls} px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]`}
        >
          {i}
        </span>
      ))}
    </div>
  )
}

/** Per-profile title, description and canonical URL for search and sharing. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const q = supabase.from('funders').select('name, slug, description')
  const { data } = UUID.test(slug)
    ? await q.eq('id', slug).maybeSingle()
    : await q.eq('slug', slug).maybeSingle()
  if (!data || !isPublishableInstitution(data as Funder)) return { title: 'Funder not found' }
  const desc = (data.description ?? '').slice(0, 155).replace(/\s+\S*$/, '') + '…'
  return {
    title: data.name,
    description: desc,
    alternates: { canonical: `/funders/${data.slug ?? slug}` },
    openGraph: { title: `${data.name} · Ona Funds`, description: desc, url: `/funders/${data.slug ?? slug}`, type: 'profile', images: [OG_IMAGE] },
  }
}

export default async function FunderProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // Accept either a readable slug or a legacy UUID, so older links keep working.
  const query = supabase.from('funders').select('*')
  const { data, error } = UUID.test(slug)
    ? await query.eq('id', slug).maybeSingle()
    : await query.eq('slug', slug).maybeSingle()

  if (error) throw new Error(error.message)
  if (!data || !isPublishableInstitution(data as Funder)) notFound()

  const f = data as Funder

  // This funder's own opportunities — the most useful thing on the page, and
  // until now the one thing it never showed. Open and working calls first.
  const { data: oppData } = await supabase
    .from('opportunities')
    .select('id,name,slug,funding_type,cci_sector,deadline,deadline_type,description,link_state')
    .eq('institution_id', f.id)
    .not('description', 'is', null)
  type OppRow = GrantListItem & { id: string; description: string | null; link_state: string | null }
  const now = Date.now()
  const opportunities = ((oppData as unknown as OppRow[]) ?? [])
    .filter((o) => isPublishableGrant(o as { name: string; description?: string | null }))
    .map((o) => {
      const d = o.deadline ? new Date(o.deadline) : null
      const days = d && !isNaN(d.getTime()) ? Math.ceil((d.getTime() - now) / 86_400_000) : null
      return { ...o, _closed: days !== null && days < 0, _days: days }
    })
    // Open calls first, then by soonest deadline; closed ones sink to the end.
    .sort((a, b) => Number(a._closed) - Number(b._closed) || (a._days ?? 1e9) - (b._days ?? 1e9))

  const regions = f.regions_of_focus ?? []
  const sectors = f.cci_sectors ?? []
  const fundingTypes = f.funding_types ?? []
  const grantees = f.notable_grantees ?? []

  const links = [
    { label: 'Official website', href: f.website, kind: 'website' as const },
    { label: 'Grants / opportunities page', href: f.grants_page_url, kind: 'grants_page' as const },
  ].filter((l) => l.href)

  const hasContact = f.contact_person || f.contact_email
  const hasCycle = f.application_cycle || f.deadline_notes
  // Where to send an applicant when we have no written steps: the funder's own
  // opportunities page, or failing that their site.
  const applyUrl = f.grants_page_url || f.website

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <BackLink
        href="/funders"
        className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--terracotta)] underline-offset-4 hover:text-[var(--accent)] hover:underline"
      >
        ← All funders
      </BackLink>

      {/* Header */}
      <header className="mt-6 border-b-2 border-[var(--ink)] pb-8">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--ink-soft)]">
              {f.funder_type ?? 'Funder'}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-[34px] leading-[1.1] sm:text-[48px]">
              {f.name}
            </h1>
            {f.acronym && (
              <p className="mt-2 text-sm font-medium text-[var(--ink-soft)]">{f.acronym}</p>
            )}
          </div>
          {f.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={f.logo_url}
              alt=""
              width={72}
              height={72}
              className="shrink-0 border border-[var(--line)] bg-white object-contain p-2"
            />
          )}
        </div>

        {/* At-a-glance facts */}
        {(f.typical_amount_range || f.headquarters_country) && (
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
            {f.typical_amount_range && (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
                  Typical amount
                </dt>
                <dd className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--forest)]">
                  {f.typical_amount_range}
                </dd>
              </div>
            )}
            {f.headquarters_country && (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
                  Headquarters
                </dt>
                <dd className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold">
                  {f.headquarters_country}
                </dd>
              </div>
            )}
          </dl>
        )}
      </header>

      {/* Opportunities from this funder */}
      <Section
        title={`Opportunities${opportunities.length ? ` · ${opportunities.length}` : ''}`}
        empty={opportunities.length === 0}
      >
        <GrantList items={opportunities} />
      </Section>

      {/* 1. Overview */}
      <Section title="Overview" empty={!f.description}>
        <Prose text={f.description ?? ''} />
      </Section>

      {/* 2. What they fund */}
      <Section title="What they fund" empty={!f.what_they_fund && fundingTypes.length === 0}>
        {f.what_they_fund && <Prose text={f.what_they_fund} />}
        {fundingTypes.length > 0 && (
          <div className={f.what_they_fund ? 'mt-4' : ''}>
            <Pills items={fundingTypes} tone="ochre" />
          </div>
        )}
      </Section>

      {/* 3. Application cycle / deadlines */}
      <Section title="Application cycle & deadlines" empty={!hasCycle}>
        {f.application_cycle && (
          <p className="font-[family-name:var(--font-display)] text-xl font-semibold">
            {f.application_cycle}
          </p>
        )}
        {f.deadline_notes && (
          <div className={f.application_cycle ? 'mt-3' : ''}>
            <Prose text={f.deadline_notes} />
          </div>
        )}
      </Section>

      {/* 4. Sectors and regions */}
      <Section title="Sectors & regions" empty={sectors.length === 0 && regions.length === 0}>
        <div className="space-y-4">
          {sectors.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--ink-soft)]">Sectors supported</p>
              <Pills items={sectors} tone="ochre" />
            </div>
          )}
          {regions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-[var(--ink-soft)]">Regions of focus</p>
              <Pills items={regions} tone="forest" />
            </div>
          )}
        </div>
      </Section>

      {/* 5. Notable past grantees */}
      <Section title="Notable past grantees" empty={grantees.length === 0}>
        <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {grantees.map((g) => (
            <li key={g} className="flex gap-2 text-[15px]">
              <span aria-hidden className="text-[var(--ink-3)]">›</span>
              {g}
            </li>
          ))}
        </ul>
      </Section>

      {/* 6. How to apply — real steps when we have them, otherwise a friendly
          pointer to the funder's own application page (never a blank or a
          robotic "not available"). */}
      <Section title="How to apply" empty={!f.how_to_apply && !applyUrl}>
        {f.how_to_apply ? (
          <Prose text={f.how_to_apply} />
        ) : (
          applyUrl && (
            <div className="text-[16px] leading-relaxed text-[var(--ink-2)]">
              <p>Applications are made on {f.name}&rsquo;s own site.</p>
              <TrackedLink
                event={{ name: 'funder_link_click', funder: f.name, link: 'grants_page' }}
                href={applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-xs font-bold uppercase tracking-[0.12em] text-[var(--terracotta)] underline-offset-4 hover:text-[var(--accent)] hover:underline"
              >
                Go to the application page ↗
              </TrackedLink>
            </div>
          )
        )}
      </Section>

      {/* 7. Official links & contact */}
      <Section title="Official links" empty={links.length === 0 && !hasContact}>
        <ul className="space-y-2">
          {links.map((l) => (
            <li key={l.href}>
              <TrackedLink
                event={{ name: 'funder_link_click', funder: f.name, link: l.kind }}
                href={l.href!}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-baseline gap-2 text-[15px]"
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--ink-soft)]">
                  {l.label}
                </span>
                <span className="underline decoration-[var(--ink)] decoration-2 underline-offset-4 group-hover:text-[var(--accent)]">
                  {l.href!.replace(/^https?:\/\//, '').replace(/\/$/, '')} ↗
                </span>
              </TrackedLink>
            </li>
          ))}
          {f.contact_person && (
            <li className="text-[15px]">
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--ink-soft)]">
                Contact
              </span>{' '}
              {f.contact_person}
            </li>
          )}
          {f.contact_email && (
            <li className="text-[15px]">
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--ink-soft)]">
                Email
              </span>{' '}
              <TrackedLink
                event={{ name: 'funder_link_click', funder: f.name, link: 'email' }}
                href={`mailto:${f.contact_email}`}
                className="underline decoration-[var(--ink)] decoration-2 underline-offset-4 hover:text-[var(--accent)]"
              >
                {f.contact_email}
              </TrackedLink>
            </li>
          )}
        </ul>
      </Section>

      {/* 8. Notes */}
      <Section title="Notes" empty={!f.notes}>
        <p className="border-l-4 border-[var(--ochre)] bg-[var(--ochre-soft)] p-4 text-sm leading-relaxed">
          {f.notes}
        </p>
      </Section>

      {/* 9. Provenance */}
      {f.last_verified && (
        <p className="mt-10 border-t border-[var(--line)] pt-5 text-xs text-[var(--ink-soft)]">
          Last verified {formatDate(f.last_verified) ?? f.last_verified}
          {f.source_url && (
            <>
              {' · '}
              <a
                href={f.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-[var(--accent)]"
              >
                source ↗
              </a>
            </>
          )}
        </p>
      )}
    </main>
  )
}
