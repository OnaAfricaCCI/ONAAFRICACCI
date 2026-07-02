'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Opportunity = {
  id: string
  name: string
  funder: string | null
  deadline: string | null
  amount: string | null
  eligible_countries: string[]
  cci_sector: string | null
  funding_type: string | null
  deadline_type: string | null
  application_link: string | null
  description: string | null
  created_at: string
}

type AmountBand = 'all' | 'under-10k' | '10k-50k' | '50k-250k' | 'over-250k'

const AMOUNT_BANDS: { value: AmountBand; label: string; min: number; max: number }[] = [
  { value: 'under-10k', label: 'Under $10k', min: 0, max: 10_000 },
  { value: '10k-50k', label: '$10k – $50k', min: 10_000, max: 50_000 },
  { value: '50k-250k', label: '$50k – $250k', min: 50_000, max: 250_000 },
  { value: 'over-250k', label: 'Over $250k', min: 250_000, max: Infinity },
]

/** Pull the largest number out of a free-text amount like "€10,000 – €50,000". */
function parseAmount(amount: string | null): number | null {
  if (!amount) return null
  const matches = amount.replace(/,/g, '').match(/\d+(?:\.\d+)?\s*[kKmM]?/g)
  if (!matches) return null
  const values = matches.map((m) => {
    const suffix = m.trim().slice(-1).toLowerCase()
    const num = parseFloat(m)
    if (suffix === 'k') return num * 1_000
    if (suffix === 'm') return num * 1_000_000
    return num
  })
  return Math.max(...values)
}

export default function GrantsPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sector, setSector] = useState('all')
  const [country, setCountry] = useState('all')
  const [fundingType, setFundingType] = useState('all')
  const [deadlineType, setDeadlineType] = useState('all')
  const [amountBand, setAmountBand] = useState<AmountBand>('all')

  useEffect(() => {
    supabase
      .from('opportunities')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setOpportunities((data as Opportunity[]) ?? [])
        setLoading(false)
      })
  }, [])

  // Filter options derived from the actual data
  const sectors = useMemo(
    () => [...new Set(opportunities.map((o) => o.cci_sector).filter(Boolean))].sort() as string[],
    [opportunities],
  )
  const countries = useMemo(
    () => [...new Set(opportunities.flatMap((o) => o.eligible_countries ?? []))].sort(),
    [opportunities],
  )
  const fundingTypes = useMemo(
    () => [...new Set(opportunities.map((o) => o.funding_type).filter(Boolean))].sort() as string[],
    [opportunities],
  )
  const deadlineTypes = useMemo(
    () => [...new Set(opportunities.map((o) => o.deadline_type).filter(Boolean))].sort() as string[],
    [opportunities],
  )

  const filtered = useMemo(() => {
    return opportunities.filter((o) => {
      if (sector !== 'all' && o.cci_sector !== sector) return false
      if (country !== 'all' && !(o.eligible_countries ?? []).includes(country)) return false
      if (fundingType !== 'all' && o.funding_type !== fundingType) return false
      if (deadlineType !== 'all' && o.deadline_type !== deadlineType) return false
      if (amountBand !== 'all') {
        const band = AMOUNT_BANDS.find((b) => b.value === amountBand)!
        const value = parseAmount(o.amount)
        if (value === null || value < band.min || value >= band.max) return false
      }
      return true
    })
  }, [opportunities, sector, country, fundingType, deadlineType, amountBand])

  const selectClass =
    'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none'

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900">Grants Database</h1>
      <p className="mt-1 text-gray-500">
        Funding opportunities for the cultural and creative industries.
      </p>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-3">
        <select className={selectClass} value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="all">All sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select className={selectClass} value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="all">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select className={selectClass} value={fundingType} onChange={(e) => setFundingType(e.target.value)}>
          <option value="all">All funding types</option>
          {fundingTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select className={selectClass} value={deadlineType} onChange={(e) => setDeadlineType(e.target.value)}>
          <option value="all">All deadline types</option>
          {deadlineTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          className={selectClass}
          value={amountBand}
          onChange={(e) => setAmountBand(e.target.value as AmountBand)}
        >
          <option value="all">Any amount</option>
          {AMOUNT_BANDS.map((b) => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
      </div>

      {/* Results */}
      <div className="mt-6">
        {loading && <p className="text-gray-500">Loading opportunities…</p>}
        {error && <p className="text-red-600">Failed to load: {error}</p>}
        {!loading && !error && (
          <>
            <p className="mb-4 text-sm text-gray-500">
              {filtered.length} of {opportunities.length} opportunities
            </p>
            <ul className="space-y-4">
              {filtered.map((o) => (
                <li key={o.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{o.name}</h2>
                      {o.funder && <p className="text-sm text-gray-500">{o.funder}</p>}
                    </div>
                    {o.amount && (
                      <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
                        {o.amount}
                      </span>
                    )}
                  </div>

                  {o.description && <p className="mt-2 text-sm text-gray-600">{o.description}</p>}

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {o.cci_sector && (
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">{o.cci_sector}</span>
                    )}
                    {o.funding_type && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">{o.funding_type}</span>
                    )}
                    {o.deadline && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                        Deadline: {o.deadline}
                        {o.deadline_type && o.deadline_type !== 'unknown' ? ` (${o.deadline_type})` : ''}
                      </span>
                    )}
                    {(o.eligible_countries ?? []).slice(0, 4).map((c) => (
                      <span key={c} className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">{c}</span>
                    ))}
                    {(o.eligible_countries ?? []).length > 4 && (
                      <span className="px-1 py-1 text-gray-400">
                        +{(o.eligible_countries ?? []).length - 4} more
                      </span>
                    )}
                  </div>

                  {o.application_link && (
                    <a
                      href={o.application_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      Apply / Learn more →
                    </a>
                  )}
                </li>
              ))}
            </ul>
            {filtered.length === 0 && (
              <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
                No opportunities match these filters.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  )
}
