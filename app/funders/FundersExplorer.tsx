'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { track } from '@/lib/analytics'
import { Aperture } from '@/app/components/Motif'
import {
  DEFAULT_FUNDER_FILTERS,
  funderFiltersToQuery,
  type FunderFilters,
} from '@/lib/funderFilters'

/** Just the columns the directory card renders. */
export type FunderCard = {
  id: string
  slug: string | null
  name: string
  description: string | null
  funder_type: string | null
  regions_of_focus: string[] | null
  funding_types: string[] | null
  logo_url: string | null
}

function FunderLogo({ funder, size = 44 }: { funder: FunderCard; size?: number }) {
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

export default function FundersExplorer({
  initialFunders,
  initialFilters = DEFAULT_FUNDER_FILTERS,
  page,
  pageSize,
  total,
  types,
  regions,
  sectors,
  supports,
}: {
  initialFunders: FunderCard[]
  initialFilters?: FunderFilters
  page: number
  pageSize: number
  total: number
  types: string[]
  regions: string[]
  sectors: string[]
  supports: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()

  // The server has already searched, filtered, sorted and paginated; `results`
  // is this page. The controls below navigate (changing the URL) to ask the
  // server for a new page — nothing is filtered in the browser any more.
  const results = initialFunders

  // Control state, seeded from the URL. Changing a control navigates.
  const [search, setSearch] = useState(initialFilters.search)
  const [type, setType] = useState(initialFilters.type)
  const [region, setRegion] = useState(initialFilters.region)
  const [sector, setSector] = useState(initialFilters.sector)
  const [support, setSupport] = useState(initialFilters.support)

  // Keep the controls in step with the URL on navigation (including Back).
  useEffect(() => {
    setSearch(initialFilters.search)
    setType(initialFilters.type)
    setRegion(initialFilters.region)
    setSector(initialFilters.sector)
    setSupport(initialFilters.support)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialFilters.search, initialFilters.type, initialFilters.region,
    initialFilters.sector, initialFilters.support,
  ])

  // Navigate to a view. A filter change resets to page 1; paging keeps filters.
  const go = (next: Partial<FunderFilters>, toPage = 1, replace = false) => {
    const f: FunderFilters = { search, type, region, sector, support, ...next }
    const query = funderFiltersToQuery(f)
    const qs = [query, toPage > 1 ? `page=${toPage}` : ''].filter(Boolean).join('&')
    const url = qs ? `${pathname}?${qs}` : pathname
    if (replace) router.replace(url, { scroll: false })
    else router.push(url, { scroll: false })
  }

  // Search navigates once typing settles (and records the search).
  useEffect(() => {
    if (search === initialFilters.search) return
    const id = setTimeout(() => {
      go({ search }, 1, true)
      if (search.trim()) track({ name: 'funder_search', query: search.trim(), results: total })
    }, 500)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // When a dropdown moves the filters away from the URL, navigate (resetting to
  // page 1). The search box has its own debounced effect above; this watches
  // the dropdowns.
  useEffect(() => {
    const next = funderFiltersToQuery({ search, type, region, sector, support })
    if (next === funderFiltersToQuery(initialFilters)) return
    router.push(next ? `${pathname}?${next}` : pathname, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, region, sector, support])

  const activeFilters = [type, region, sector, support].filter((f) => f !== 'all').length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const selectClass =
    'control-h w-full truncate border-2 border-[var(--border-md)] bg-[var(--bg)] pl-[14px] pr-9 text-sm font-medium ' +
    'cursor-pointer transition-colors hover:border-[var(--accent)] focus:border-[var(--ink)] focus:outline-none'

  return (
    <main className="mx-auto max-w-6xl px-5">
      <section className="grid items-center gap-8 border-b border-[var(--line)] py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div>
        <p className="label text-[var(--sage-deep)]">
          The funders directory
        </p>
        <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-[38px] leading-[1.05] sm:text-[56px]">
          Who funds the culture.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--ink-soft)]">
          These are the organisations putting money into African creative work. Each
          profile tells you what they fund, who can apply, and how to reach them.
        </p>
        </div>
        {/* Aperture: the guidelines give this one to the funder register. */}
        <div aria-hidden="true" className="hidden h-[200px] overflow-hidden lg:block">
          <Aperture className="h-full w-full" />
        </div>
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
          <select className={selectClass} value={type} onChange={(e) => { setType(e.target.value); track({ name: 'funder_filter', filter: 'type', value: e.target.value, results: -1 }) }}>
            <option value="all">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select className={selectClass} value={region} onChange={(e) => { setRegion(e.target.value); track({ name: 'funder_filter', filter: 'region', value: e.target.value, results: -1 }) }}>
            <option value="all">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select className={selectClass} value={sector} onChange={(e) => { setSector(e.target.value); track({ name: 'funder_filter', filter: 'sector', value: e.target.value, results: -1 }) }}>
            <option value="all">All sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className={selectClass} value={support} onChange={(e) => { setSupport(e.target.value); track({ name: 'funder_filter', filter: 'support', value: e.target.value, results: -1 }) }}>
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

      {results.length === 0 && (
        <div className="my-10 border-2 border-dashed border-[var(--line)] p-16 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl">
            No funders match those filters.
          </p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Try clearing one.</p>
        </div>
      )}

      {results.length > 0 && (
        <ul className="my-10 grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">
          {results.map((f, i) => (
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

      {totalPages > 1 && (
        <nav className="mb-12 flex items-center justify-center gap-4" aria-label={`Page ${page}`}>
          <button
            type="button"
            onClick={() => { go({}, page - 1); window.scrollTo({ top: 0 }) }}
            disabled={page <= 1}
            className="border-2 border-[var(--ink)] px-5 py-2 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[var(--ink)]"
          >
            ← Previous
          </button>
          <span className="text-sm font-semibold text-[var(--ink-soft)]">
            Page {page}
          </span>
          <button
            type="button"
            onClick={() => { go({}, page + 1); window.scrollTo({ top: 0 }) }}
            disabled={page >= totalPages}
            className="border-2 border-[var(--ink)] px-5 py-2 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[var(--ink)]"
          >
            Next →
          </button>
        </nav>
      )}

      {/* Foot CTA */}
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
    </main>
  )
}
