import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/media'
import type { Funder } from '@/lib/types'
import { isPublishableInstitution } from '@/lib/quality'

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
    <div className="space-y-4 text-[17px] leading-relaxed text-[var(--ink)]/90">
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

  const regions = f.regions_of_focus ?? []
  const sectors = f.cci_sectors ?? []
  const fundingTypes = f.funding_types ?? []
  const grantees = f.notable_grantees ?? []

  const links = [
    { label: 'Official website', href: f.website },
    { label: 'Grants / opportunities page', href: f.grants_page_url },
  ].filter((l) => l.href)

  const hasContact = f.contact_person || f.contact_email
  const hasCycle = f.application_cycle || f.deadline_notes

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <Link
        href="/funders"
        className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--terracotta)] underline-offset-4 hover:underline"
      >
        ← All funders
      </Link>

      {/* Header */}
      <header className="mt-6 border-b-2 border-[var(--ink)] pb-8">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--ink-soft)]">
              {f.funder_type ?? 'Funder'}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold leading-tight sm:text-5xl">
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
              <span className="text-[var(--terracotta)]">—</span>
              {g}
            </li>
          ))}
        </ul>
      </Section>

      {/* 6. How to apply */}
      <Section title="How to apply" empty={!f.how_to_apply}>
        <Prose text={f.how_to_apply ?? ''} />
      </Section>

      {/* 7. Official links & contact */}
      <Section title="Official links" empty={links.length === 0 && !hasContact}>
        <ul className="space-y-2">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href!}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-baseline gap-2 text-[15px]"
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--ink-soft)]">
                  {l.label}
                </span>
                <span className="underline decoration-[var(--terracotta)] decoration-2 underline-offset-4 group-hover:text-[var(--terracotta)]">
                  {l.href!.replace(/^https?:\/\//, '').replace(/\/$/, '')} ↗
                </span>
              </a>
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
              <a
                href={`mailto:${f.contact_email}`}
                className="underline decoration-[var(--terracotta)] decoration-2 underline-offset-4 hover:text-[var(--terracotta)]"
              >
                {f.contact_email}
              </a>
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
                className="underline underline-offset-4 hover:text-[var(--terracotta)]"
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
