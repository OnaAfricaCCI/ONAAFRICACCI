'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Funder } from '@/lib/types'

function FunderLogo({ funder, size = 44 }: { funder: Funder; size?: number }) {
  const [failed, setFailed] = useState(false)
  if (!funder.logo_url || failed) {
    return (
      <span
        className="flex shrink-0 items-center justify-center border-2 border-[var(--ink)] bg-[var(--ochre-soft)] font-[family-name:var(--font-display)] text-lg font-bold"
        style={{ width: size, height: size }}
      >
        {funder.name.charAt(0)}
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={funder.logo_url}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="shrink-0 border border-[var(--line)] bg-white object-contain p-1"
      style={{ width: size, height: size }}
    />
  )
}

export default function FundersPage() {
  const [funders, setFunders] = useState<Funder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [region, setRegion] = useState('all')
  const [sector, setSector] = useState('all')
  const [support, setSupport] = useState('all')

  useEffect(() => {
    supabase
      .from('funders')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setFunders((data as Funder[]) ?? [])
        setLoading(false)
      })
  }, [])

  const types = useMemo(
    () => [...new Set(funders.map((f) => f.funder_type).filter(Boolean))].sort() as string[],
    [funders],
  )
  const regions = useMemo(
    () => [...new Set(funders.flatMap((f) => f.regions_of_focus ?? []))].sort(),
    [funders],
  )
  const sectors = useMemo(
    () => [...new Set(funders.flatMap((f) => f.cci_sectors ?? []))].sort(),
    [funders],
  )
  const supports = useMemo(
    () => [...new Set(funders.flatMap((f) => f.funding_types ?? []))].sort(),
    [funders],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return funders.filter((f) => {
      if (type !== 'all' && f.funder_type !== type) return false
      if (region !== 'all' && !(f.regions_of_focus ?? []).includes(region)) return false
      if (sector !== 'all' && !(f.cci_sectors ?? []).includes(sector)) return false
      if (support !== 'all' && !(f.funding_types ?? []).includes(support)) return false
      if (q) {
        const hay = `${f.name} ${f.description ?? ''} ${f.notes ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [funders, search, type, region, sector, support])

  const activeFilters = [type, region, sector, support].filter((f) => f !== 'all').length

  const selectClass =
    'control-h w-full truncate border-2 border-[var(--ink)] bg-[var(--paper)] pl-4 pr-9 text-sm font-medium ' +
    'cursor-pointer transition-colors hover:bg-[var(--paper-deep)] focus:outline-none ' +
    'focus:bg-[var(--paper-deep)]'

  return (
    <main className="mx-auto max-w-6xl px-5">
      <section className="border-b border-[var(--line)] py-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--terracotta)]">
          The Funders Directory
        </p>
        <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-4xl font-semibold leading-[1.05] sm:text-6xl">
          Who funds the culture.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--ink-soft)]">
          {funders.length > 0 ? `${funders.length} organizations backing` : 'Organizations backing'}{' '}
          Africa&rsquo;s cultural and creative industries — from pan-African funds to
          bilateral institutes.
        </p>
      </section>

      {/* Filter bar */}
      <section className="sticky top-[66px] z-10 -mx-5 border-b border-[var(--line)] bg-[var(--paper)]/95 px-5 py-4 backdrop-blur-sm">
        {/* Row 1: search across the full track */}
        <div className="relative mb-3">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-soft)]"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="M14 14l4 4" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Search funders by name, focus or region…"
            aria-label="Search funders"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="control-h w-full border-2 border-[var(--ink)] bg-[var(--paper)] pl-11 pr-10 text-sm font-medium placeholder:font-normal placeholder:text-[var(--ink-soft)] focus:bg-white focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none text-[var(--ink-soft)] hover:text-[var(--terracotta)]"
            >
              ×
            </button>
          )}
        </div>

        {/* Row 2: four equal-width selects */}
        <div
          role="group"
          aria-label="Filter funders"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <select className={selectClass} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select className={selectClass} value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="all">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select className={selectClass} value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="all">All sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className={selectClass} value={support} onChange={(e) => setSupport(e.target.value)}>
            <option value="all">All support types</option>
            {supports.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Row 3: clear + count */}
        <div className="mt-3 flex items-center gap-5">
          {(activeFilters > 0 || search) && (
            <button
              onClick={() => {
                setType('all'); setRegion('all'); setSector('all'); setSupport('all'); setSearch('')
              }}
              className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--terracotta)] underline underline-offset-4 hover:no-underline"
            >
              Clear all{activeFilters > 0 ? ` (${activeFilters})` : ''}
            </button>
          )}
          <span className="ml-auto font-[family-name:var(--font-display)] text-sm text-[var(--ink-soft)]">
            {loading ? '…' : `Showing ${filtered.length} of ${funders.length}`}
          </span>
        </div>
      </section>

      {error && (
        <p className="mt-8 border-2 border-[var(--terracotta)] bg-[var(--terracotta-soft)] p-5 text-sm">
          Failed to load funders: {error}
        </p>
      )}
      {loading && (
        <p className="py-16 text-center text-sm uppercase tracking-[0.2em] text-[var(--ink-soft)]">
          Loading funders…
        </p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="my-10 border-2 border-dashed border-[var(--line)] p-16 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl">
            {funders.length === 0 ? 'No funders yet.' : 'No funders match.'}
          </p>
          {funders.length > 0 && (
            <p className="mt-2 text-sm text-[var(--ink-soft)]">Try clearing some filters.</p>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <ul className="my-10 grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f, i) => (
            <li key={f.id} className="rise-in bg-[var(--paper)]" style={{ animationDelay: `${Math.min(i, 11) * 40}ms` }}>
              <Link
                href={`/funders/${f.id}`}
                className="group flex h-full flex-col p-6 transition-colors hover:bg-[var(--paper-deep)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <FunderLogo funder={f} />
                  <span className="text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                    {f.funder_type}
                  </span>
                </div>
                <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-semibold leading-snug decoration-[var(--terracotta)] decoration-2 underline-offset-4 group-hover:underline">
                  {f.name}
                </h2>
                {f.description && (
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--ink)]/75">
                    {f.description}
                  </p>
                )}
                <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                  {(f.regions_of_focus ?? []).slice(0, 2).map((r) => (
                    <span key={r} className="border border-[var(--forest)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--forest)]">
                      {r}
                    </span>
                  ))}
                  {(f.funding_types ?? []).slice(0, 3).map((t) => (
                    <span key={t} className="bg-[var(--ochre-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]">
                      {t}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
