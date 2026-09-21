'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Funder } from '@/lib/types'
import { isPublishableInstitution } from '@/lib/quality'

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
      .not('description', 'is', null)
      .order('name')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setFunders(((data as Funder[]) ?? []).filter(isPublishableInstitution))
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
    'control-h w-full truncate border-2 border-[var(--border-md)] bg-[var(--bg)] pl-[14px] pr-9 text-sm font-medium ' +
    'cursor-pointer transition-colors hover:border-[var(--accent)] focus:border-[var(--ink)] focus:outline-none'

  return (
    <main className="mx-auto max-w-6xl px-5">
      <section className="border-b border-[var(--line)] py-12 sm:py-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">
          The funders directory
        </p>
        <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-[38px] leading-[1.05] sm:text-[56px]">
          Who funds the culture.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--ink-soft)]">
          These are the organisations putting money into African creative work. Each
          profile tells you what they fund, who can apply, and how to reach them.
        </p>
      </section>

      {/* Filter bar */}
      <section className="sticky top-[92px] sm:top-[66px] z-10 -mx-5 border-b border-[var(--line)] bg-[var(--paper)]/95 px-5 py-4 backdrop-blur-sm">
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
            className="control-h w-full border-2 border-[var(--border-md)] bg-[var(--bg)] pl-11 pr-10 text-sm font-medium placeholder:font-normal placeholder:text-[var(--ink-3)] focus:border-[var(--ink)] focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none text-[var(--ink-soft)] hover:text-[var(--accent)]"
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

        {/* Row 3: clear — only rendered when there is something to clear */}
        {(activeFilters > 0 || search) && (
          <div className="mt-3 flex items-center gap-5">
            <button
              onClick={() => {
                setType('all'); setRegion('all'); setSector('all'); setSupport('all'); setSearch('')
              }}
              className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--terracotta)] underline underline-offset-4 hover:text-[var(--accent)]"
            >
              Clear all{activeFilters > 0 ? ` (${activeFilters})` : ''}
            </button>
          </div>
        )}
      </section>

      {error && (
        <p className="mt-8 border-2 border-[var(--error)] bg-[var(--error-soft)] p-5 text-sm">
          Failed to load funders: {error}
        </p>
      )}
      {loading && (
        <p className="py-16 text-center text-sm uppercase tracking-[0.2em] text-[var(--ink-soft)]">
          Finding funders…
        </p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="my-10 border-2 border-dashed border-[var(--line)] p-16 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl">
            No funders match those filters.
          </p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Try clearing one.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <ul className="my-10 grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f, i) => (
            <li key={f.id} className="rise-in bg-[var(--paper)]" style={{ animationDelay: `${Math.min(i, 11) * 40}ms` }}>
              <Link
                href={`/funders/${f.slug ?? f.id}`}
                className="group flex h-full flex-col p-6 transition-colors hover:border-[var(--accent)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <FunderLogo funder={f} />
                  <span className="text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                    {f.funder_type}
                  </span>
                </div>
                <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-semibold leading-snug transition-colors group-hover:text-[var(--accent)]">
                  {f.name}
                </h2>
                {f.description && (
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--ink-2)]">
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

      {/* Foot CTA */}
      {!loading && (
        <section className="mb-8 border-t border-[var(--line)] py-10">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <p className="font-[family-name:var(--font-display)] text-2xl leading-snug">
              Fund this work?
            </p>
            <Link
              href="/contact/submit"
              className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--terracotta)] underline underline-offset-4 hover:text-[var(--accent)]"
            >
              List your opportunity →
            </Link>
          </div>
        </section>
      )}
    </main>
  )
}
