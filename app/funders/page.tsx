import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Funder } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function FundersPage() {
  const { data, error } = await supabase
    .from('funders')
    .select('*')
    .eq('is_active', true)
    .order('name')

  const funders = (data as Funder[]) ?? []

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900">Funders Directory</h1>
      <p className="mt-1 text-gray-500">
        Organizations funding the cultural and creative industries.
      </p>

      {error && <p className="mt-6 text-red-600">Failed to load funders: {error.message}</p>}

      {!error && funders.length === 0 && (
        <p className="mt-8 rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
          No funders yet.
        </p>
      )}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {funders.map((f) => (
          <li key={f.id}>
            <Link
              href={`/funders/${f.id}`}
              className="block h-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  {f.name}
                  {f.acronym && <span className="ml-2 text-sm font-normal text-gray-400">({f.acronym})</span>}
                </h2>
                {f.funder_type && (
                  <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700">
                    {f.funder_type}
                  </span>
                )}
              </div>

              {f.description && (
                <p className="mt-2 line-clamp-2 text-sm text-gray-600">{f.description}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                {f.headquarters_country && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1">{f.headquarters_country}</span>
                )}
                {f.typical_amount_range && (
                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-700">
                    {f.typical_amount_range}
                  </span>
                )}
                {(f.cci_sectors ?? []).slice(0, 3).map((s) => (
                  <span key={s} className="rounded-full bg-gray-100 px-2.5 py-1">{s}</span>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
