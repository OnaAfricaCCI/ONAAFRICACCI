import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Funder } from '@/lib/types'

export const dynamic = 'force-dynamic'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-gray-800">{children}</dd>
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
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/funders" className="text-sm text-indigo-600 hover:text-indigo-800">
        ← All funders
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {funder.name}
            {funder.acronym && (
              <span className="ml-3 text-xl font-normal text-gray-400">({funder.acronym})</span>
            )}
          </h1>
          {funder.funder_type && (
            <span className="mt-2 inline-block rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-700">
              {funder.funder_type}
            </span>
          )}
        </div>
      </div>

      {funder.description && <p className="mt-4 text-gray-600">{funder.description}</p>}

      <dl className="mt-8 grid gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-2">
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
          <Field label="Typical amount">{funder.typical_amount_range}</Field>
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
              className="text-indigo-600 hover:text-indigo-800"
            >
              {funder.website}
            </a>
          </Field>
        )}
        {funder.contact_person && <Field label="Contact person">{funder.contact_person}</Field>}
        {funder.contact_email && (
          <Field label="Contact email">
            <a href={`mailto:${funder.contact_email}`} className="text-indigo-600 hover:text-indigo-800">
              {funder.contact_email}
            </a>
          </Field>
        )}
      </dl>

      {funder.notes && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Notes</p>
          <p className="mt-1">{funder.notes}</p>
        </div>
      )}
    </main>
  )
}
