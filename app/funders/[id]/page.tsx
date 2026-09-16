import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Funder } from '@/lib/types'

export const dynamic = 'force-dynamic'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[var(--line)] py-4">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
        {label}
      </dt>
      <dd className="mt-1 text-[15px] leading-relaxed">{children}</dd>
    </div>
  )
}

export default async function FunderProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data, error } = await supabase
    .from('funders')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) notFound()

  const funder = data as Funder

  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <Link
        href="/funders"
        className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--terracotta)] hover:underline underline-offset-4"
      >
        ← All funders
      </Link>

      <header className="mt-6 border-b-2 border-[var(--ink)] pb-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--ink-soft)]">
              {funder.funder_type ?? 'Funder'}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold leading-tight sm:text-5xl">
              {funder.name}
            </h1>
          </div>
          {funder.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={funder.logo_url}
              alt=""
              width={72}
              height={72}
              className="shrink-0 border border-[var(--line)] bg-white object-contain p-2"
            />
          )}
        </div>
        {funder.acronym && (
          <p className="mt-2 text-sm font-medium text-[var(--ink-soft)]">{funder.acronym}</p>
        )}
      </header>

      {funder.description && (
        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[var(--ink)]/85">
          {funder.description}
        </p>
      )}

      <dl className="mt-10 grid gap-x-10 sm:grid-cols-2">
        {funder.headquarters_country && (
          <Field label="Headquarters">{funder.headquarters_country}</Field>
        )}
        {(funder.regions_of_focus ?? []).length > 0 && (
          <Field label="Regions of focus">{funder.regions_of_focus.join(', ')}</Field>
        )}
        {(funder.cci_sectors ?? []).length > 0 && (
          <Field label="CCI sectors">{funder.cci_sectors.join(', ')}</Field>
        )}
        {(funder.funding_types ?? []).length > 0 && (
          <Field label="Funding types">{funder.funding_types.join(', ')}</Field>
        )}
        {funder.typical_amount_range && (
          <Field label="Typical amount">
            <span className="font-[family-name:var(--font-display)] font-semibold text-[var(--forest)]">
              {funder.typical_amount_range}
            </span>
          </Field>
        )}
        {funder.application_cycle && (
          <Field label="Application cycle">{funder.application_cycle}</Field>
        )}
        {funder.website && (
          <Field label="Website">
            <a
              href={funder.website}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-[var(--terracotta)] decoration-2 underline-offset-4 hover:text-[var(--terracotta)]"
            >
              {funder.website}
            </a>
          </Field>
        )}
        {funder.contact_person && <Field label="Contact person">{funder.contact_person}</Field>}
        {funder.contact_email && (
          <Field label="Contact email">
            <a
              href={`mailto:${funder.contact_email}`}
              className="underline decoration-[var(--terracotta)] decoration-2 underline-offset-4 hover:text-[var(--terracotta)]"
            >
              {funder.contact_email}
            </a>
          </Field>
        )}
      </dl>

      {funder.notes && (
        <div className="mt-10 border-l-4 border-[var(--ochre)] bg-[var(--ochre-soft)] p-5 text-sm leading-relaxed">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
            Notes
          </p>
          <p className="mt-1">{funder.notes}</p>
        </div>
      )}
    </main>
  )
}
