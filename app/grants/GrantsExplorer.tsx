'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import EmailCapture from '@/app/components/EmailCapture'
import { track } from '@/lib/analytics'
import { slugify } from '@/lib/slug'
import { daysLeft } from '@/lib/deadline'
import { FindStrip } from '@/app/components/Motif'
import SaveButton from '@/app/components/SaveButton'
import { useAccount } from '@/app/components/AccountProvider'
import {
  SCOPE_GROUP_LABELS,
  SCOPE_OPTIONS,
  eligibilityLabels,
  type ScopeGroup,
} from '@/lib/eligibility'
import {
  DEFAULT_FILTERS,
  grantFiltersToQuery,
  type AmountBand,
  type GrantFilters,
  type SortKey,
} from '@/lib/grantFilters'

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
  /**
   * 'ok' | 'unverified' | 'dead'. Only 'dead' means the server actually told
   * us the page is gone; 'unverified' means we could not reach it, which is
   * usually a site refusing automated traffic rather than a broken link.
   */
  link_state: string | null
  link_checked_at: string | null
  /** Structured, human-reviewed: 'individual' | 'organisation' | 'either' | 'partnership'. Null until enriched. */
  eligible_who: string | null
  eligible_conditions: string | null
  /** Only when true does the structured eligibility above reach a visitor. */
  eligibility_reviewed: boolean | null
  /** Stable URL slug; the server fills it, the card links to /grants/[slug]. */
  slug: string | null
}

/** The grant's own page. Prefer the stored slug; fall back to the name. */
function grantHref(o: Opportunity): string {
  return `/grants/${o.slug || slugify(o.name)}`
}

export type { Opportunity }

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'az', label: 'Sort: A–Z' },
  { value: 'za', label: 'Sort: Z–A' },
  { value: 'deadline', label: 'Sort: Deadline' },
  { value: 'newest', label: 'Sort: Newest' },
]

const AMOUNT_BANDS: { value: AmountBand; label: string; min: number; max: number }[] = [
  { value: 'under-10k', label: 'Under $10k', min: 0, max: 10_000 },
  { value: '10k-50k', label: '$10k – $50k', min: 10_000, max: 50_000 },
  { value: '50k-250k', label: '$50k – $250k', min: 50_000, max: 250_000 },
  { value: 'over-250k', label: 'Over $250k', min: 250_000, max: Infinity },
]

const SECTOR_COLORS: Record<string, string> = {
  music: 'var(--terracotta)',
  film: 'var(--forest)',
  'visual arts': 'var(--ochre)',
  'performing arts': 'var(--terracotta)',
  design: 'var(--forest)',
  fashion: 'var(--ochre)',
  gaming: 'var(--forest)',
  publishing: 'var(--terracotta)',
  heritage: 'var(--ochre)',
  crafts: 'var(--terracotta)',
}

function sectorColor(sector: string | null): string {
  return SECTOR_COLORS[(sector ?? '').toLowerCase()] ?? 'var(--forest)'
}

function formatDeadline(deadline: string | null, deadlineType: string | null): string | null {
  if (deadlineType === 'rolling') return 'Rolling'
  // No date and not rolling/recurring (mostly 'unknown': pipeline, nomination
  // or between-rounds programmes). Say so plainly instead of showing nothing.
  if (!deadline) return deadlineType === 'recurring' ? 'Recurring' : 'Timing varies'
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return deadline
  // A recurring call's past date is its last round, not an expiry — say
  // "Recurring" rather than show a dead date. A future date is the next round.
  if (deadlineType === 'recurring' && (daysLeft(deadline) ?? 0) < 0) return 'Recurring'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const WHO_LABEL: Record<string, string> = {"individual": "Individuals", "organisation": "Registered organisations", "either": "Individuals or organisations", "partnership": "Applicants with a partner"}

function formatCheckedAt(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function GrantsExplorer({
  initialGrants,
  initialFilters = DEFAULT_FILTERS,
  page,
  pageSize,
  total,
  sectors,
  fundingTypes,
  deadlineTypes,
}: {
  initialGrants: Opportunity[]
  initialFilters?: GrantFilters
  page: number
  pageSize: number
  total: number
  sectors: string[]
  fundingTypes: string[]
  deadlineTypes: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAccount()

  // The server has already searched, filtered, sorted and paginated; `results`
  // is this page. The controls below navigate (changing the URL) to ask the
  // server for a new page — nothing is filtered in the browser any more.
  const results = initialGrants

  // Control state, seeded from the URL. Changing a control navigates.
  const [sector, setSector] = useState(initialFilters.sector)
  const [country, setCountry] = useState(initialFilters.country)
  const [fundingType, setFundingType] = useState(initialFilters.fundingType)
  const [deadlineType, setDeadlineType] = useState(initialFilters.deadlineType)
  const [amountBand, setAmountBand] = useState<AmountBand>(initialFilters.amountBand)
  const [showExpired, setShowExpired] = useState(initialFilters.showExpired)
  const [search, setSearch] = useState(initialFilters.search)
  const [sortBy, setSortBy] = useState<SortKey>(initialFilters.sortBy)

  // On phones the filter controls collapse behind a "Filters" button so the
  // grants are visible straight away; on desktop they are always shown.
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Keep the controls in step with the URL on navigation (including Back).
  useEffect(() => {
    setSector(initialFilters.sector)
    setCountry(initialFilters.country)
    setFundingType(initialFilters.fundingType)
    setDeadlineType(initialFilters.deadlineType)
    setAmountBand(initialFilters.amountBand)
    setShowExpired(initialFilters.showExpired)
    setSortBy(initialFilters.sortBy)
    setSearch(initialFilters.search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialFilters.sector, initialFilters.country, initialFilters.fundingType,
    initialFilters.deadlineType, initialFilters.amountBand, initialFilters.showExpired,
    initialFilters.sortBy, initialFilters.search,
  ])

  // Navigate to a view. A filter change resets to page 1; paging keeps filters.
  const go = (next: Partial<GrantFilters>, toPage = 1, replace = false) => {
    const f: GrantFilters = {
      search, sector, country, fundingType, deadlineType, amountBand, sortBy, showExpired, ...next,
    }
    const query = grantFiltersToQuery(f)
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
      if (search.trim()) track({ name: 'grant_search', query: search.trim(), results: total })
    }, 500)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // When a dropdown or the toggle moves the filters away from the URL, navigate
  // (which resets to page 1 and asks the server for the matching page). The
  // search box has its own debounced effect above; this watches the rest.
  useEffect(() => {
    const next = grantFiltersToQuery({
      search, sector, country, fundingType, deadlineType, amountBand, sortBy, showExpired,
    })
    if (next === grantFiltersToQuery(initialFilters)) return
    router.push(next ? `${pathname}?${next}` : pathname, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector, country, fundingType, deadlineType, amountBand, sortBy, showExpired])

  const activeFilters = [sector, country, fundingType, deadlineType, amountBand].filter(
    (f) => f !== 'all',
  ).length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const selectClass =
    'control-h w-full truncate border-2 border-[var(--border-md)] bg-[var(--bg)] pl-[14px] pr-9 text-sm font-medium ' +
    'cursor-pointer transition-colors hover:border-[var(--accent)] focus:border-[var(--ink)] focus:outline-none'

  return (
    <main className="mx-auto max-w-6xl px-5">
      {/* Masthead */}
      <section className="pt-12 sm:pt-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">
          The grants database
        </p>
        <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-[38px] leading-[1.05] sm:text-[56px]">
          Funding for Africa&rsquo;s creative and cultural industries.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--ink-soft)]">
          Grants, prizes, residencies and fellowships from across the continent. We
          check each one and keep it current, so your time goes into making the work,
          not chasing the money.
        </p>
        {/* The Find as a band. A rule with a single ring on it reads as a
            slider and invites dragging, so the divider is a field of rings
            instead: no track, nothing to grab, and it is the expression that
            says "one of these fits you", which is what this page is for. */}
        <FindStrip className="mt-10 block h-7 w-full" />
      </section>

      {/* Filter bar */}
      <section className="sticky top-[92px] sm:top-[66px] z-10 -mx-5 border-b border-[var(--line)] bg-[var(--paper)]/95 px-5 py-4 backdrop-blur-sm">
        {/* Row 1: search (always) + a Filters button that opens the controls on phones */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search grants by name, funder, sector, country…"
              aria-label="Search grants"
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
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-controls="grant-filters"
            className="control-h flex shrink-0 items-center gap-2 border-2 border-[var(--border-md)] bg-[var(--bg)] px-4 text-sm font-semibold transition-colors hover:border-[var(--accent)] sm:hidden"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M3 5h14M6 10h8M9 15h2" strokeLinecap="round" />
            </svg>
            Filters{activeFilters > 0 ? ` · ${activeFilters}` : ''}
          </button>
        </div>

        {/* The controls: always shown on desktop, collapsible on phones. */}
        <div
          id="grant-filters"
          className={`${filtersOpen ? 'block' : 'hidden'} mt-3 sm:block`}
        >
          <div
            role="group"
            aria-label="Filter grants"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
          >
            <select
              className={selectClass}
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as SortKey); track({ name: 'grant_sort', sort: e.target.value }) }}
              aria-label="Sort grants"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <select className={selectClass} value={sector} onChange={(e) => { setSector(e.target.value); track({ name: 'grant_filter', filter: 'sector', value: e.target.value, results: -1 }) }} aria-label="Sector">
              <option value="all">All sectors</option>
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              className={selectClass}
              value={country}
              onChange={(e) => { setCountry(e.target.value); track({ name: 'grant_filter', filter: 'country', value: e.target.value, results: -1 }) }}
              aria-label="Where you’re based"
            >
              <option value="all">Anywhere</option>
              {(['region', 'country'] as ScopeGroup[]).map((group) => {
                const options = SCOPE_OPTIONS.filter((o) => o.group === group)
                if (!options.length) return null
                return (
                  <optgroup key={group} label={SCOPE_GROUP_LABELS[group]}>
                    {options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
            <select className={selectClass} value={fundingType} onChange={(e) => { setFundingType(e.target.value); track({ name: 'grant_filter', filter: 'funding_type', value: e.target.value, results: -1 }) }} aria-label="Funding type">
              <option value="all">All types</option>
              {fundingTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select className={selectClass} value={deadlineType} onChange={(e) => { setDeadlineType(e.target.value); track({ name: 'grant_filter', filter: 'deadline_type', value: e.target.value, results: -1 }) }} aria-label="Deadline type">
              <option value="all">All deadlines</option>
              {deadlineTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              className={selectClass}
              value={amountBand}
              onChange={(e) => { setAmountBand(e.target.value as AmountBand); track({ name: 'grant_filter', filter: 'amount', value: e.target.value, results: -1 }) }}
              aria-label="Amount"
            >
              <option value="all">Any amount</option>
              {AMOUNT_BANDS.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>

          {/* Toggles */}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-[var(--ink-soft)]">
              <input
                type="checkbox"
                checked={showExpired}
                onChange={(e) => { setShowExpired(e.target.checked); track({ name: 'show_expired_toggle', on: e.target.checked }) }}
                className="h-4 w-4 accent-[var(--terracotta)]"
              />
              Show recently closed
            </label>
            {(activeFilters > 0 || search) && (
              <button
                onClick={() => {
                  setSector('all'); setCountry('all'); setFundingType('all')
                  setDeadlineType('all'); setAmountBand('all'); setSearch('')
                }}
                className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--terracotta)] underline underline-offset-4 hover:text-[var(--accent)]"
              >
                Clear all{activeFilters > 0 ? ` (${activeFilters})` : ''}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Get more relevant opportunities — a quiet invitation (entry point C).
          If filters are set we carry them to setup as suggested answers; the
          wizard asks the user to confirm them. Hidden once signed in. */}
      {!user && (
        <div className="mt-5 flex flex-col gap-2 border-l-2 border-[var(--sage)] bg-[var(--sage-mist)]/30 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[var(--ink-2)]">Want Ona to match funding to your work?</span>
          <Link
            href={(() => {
              const p = new URLSearchParams()
              if (sector !== 'all') p.set('sector', sector)
              if (fundingType !== 'all') p.set('type', fundingType)
              if (country !== 'all') p.set('place', country)
              const qs = p.toString()
              return `/profile/setup${qs ? `?${qs}` : ''}`
            })()}
            onClick={() => track({ name: 'profile_invite_click', entry_point: 'grants_filters' })}
            className="shrink-0 font-semibold text-[var(--terracotta)] underline underline-offset-4 hover:text-[var(--accent)]"
          >
            Get more relevant opportunities →
          </Link>
        </div>
      )}

      {/* Results */}
      <section className="py-8">
        {results.length === 0 && (
          <div className="border-2 border-dashed border-[var(--line)] p-16 text-center">
            {activeFilters > 0 || search ? (
              <>
                <p className="font-[family-name:var(--font-display)] text-2xl">
                  Nothing matches those filters yet.
                </p>
                <p className="mt-2 text-sm text-[var(--ink-soft)]">
                  Try widening your search or clearing a filter.
                </p>
              </>
            ) : (
              <>
                <p className="font-[family-name:var(--font-display)] text-2xl">
                  No open opportunities right now.
                </p>
                <p className="mt-2 text-sm text-[var(--ink-soft)]">
                  Check back soon, or turn on &ldquo;Show recently closed&rdquo; to see calls
                  that closed in the last week.
                </p>
              </>
            )}
          </div>
        )}

        <ul className="divide-y divide-[var(--line)]">
          {results.map((o, i) => {
            const dl = daysLeft(o.deadline)
            const urgent = dl !== null && dl >= 0 && dl <= 30
            return (
              <li
                key={o.id}
                className="rise-in group py-8"
                style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
              >
                <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_15rem]">
                  <div>
                    {/* Kicker row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.18em]">
                      {o.cci_sector && (
                        <span style={{ color: sectorColor(o.cci_sector) }}>{o.cci_sector}</span>
                      )}
                      {o.funding_type && (
                        <>
                          <span className="text-[var(--line)]">/</span>
                          <span className="text-[var(--ink-soft)]">{o.funding_type}</span>
                        </>
                      )}
                    </div>

                    <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold leading-snug sm:text-3xl">
                      <Link
                        href={grantHref(o)}
                        className="transition-colors group-hover:text-[var(--accent)]"
                      >
                        {o.name}
                      </Link>
                    </h2>

                    {o.funder && (
                      <p className="mt-1 text-sm font-medium text-[var(--ink-soft)]">{o.funder}</p>
                    )}

                    {o.description && (
                      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-2)]">
                        {o.description}
                      </p>
                    )}

                    {/*
                      Who can apply. The structured line (individual vs
                      organisation) shows first when a human has reviewed it;
                      the geographic line is the funder's own answer, cleaned
                      for display but never rewritten in the database.
                    */}
                    {(() => {
                      // Structured "who" only when a human has approved it.
                      const who =
                        o.eligibility_reviewed && o.eligible_who
                          ? WHO_LABEL[o.eligible_who] ?? null
                          : null
                      const parts = [who, ...eligibilityLabels(o.eligible_countries).slice(0, 5)].filter(
                        Boolean,
                      )
                      if (parts.length === 0) return null
                      return (
                        <p className="mt-3 text-xs uppercase leading-relaxed tracking-[0.12em] text-[var(--ink-soft)]">
                          <span className="font-semibold">Open to: </span>
                          {parts.join(' · ')}
                          {o.eligibility_reviewed && o.eligible_conditions ? (
                            <span className="normal-case"> — {o.eligible_conditions}</span>
                          ) : null}
                        </p>
                      )
                    })()}
                  </div>

                  {/* Fact block */}
                  <div className="flex flex-wrap gap-6 sm:flex-col sm:flex-nowrap sm:gap-4 sm:border-l-2 sm:border-[var(--ink)] sm:pl-6 sm:text-right">
                    {o.amount && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
                          Award
                        </p>
                        <p
                          className="line-clamp-2 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug text-[var(--forest)]"
                          title={o.amount}
                        >
                          {o.amount}
                        </p>
                      </div>
                    )}
                    {formatDeadline(o.deadline, o.deadline_type) && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
                          Deadline
                        </p>
                        <p
                          className={`font-[family-name:var(--font-display)] text-lg font-semibold ${
                            urgent ? 'text-[var(--accent)]' : ''
                          }`}
                        >
                          {formatDeadline(o.deadline, o.deadline_type)}
                        </p>
                        {urgent && (
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--accent)]">
                            {dl === 0 ? 'Closes today' : dl === 1 ? '1 day left' : `${dl} days left`}
                          </p>
                        )}
                        {dl !== null && dl < 0 && (
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--ink-soft)]">
                            Expired
                          </p>
                        )}
                      </div>
                    )}
                    {/*
                      The site's promise is "we check each one". When the daily
                      link check found the funder's page unreachable, say so
                      instead of sending someone to a 404 — the listing stays,
                      but the click is no longer a silent dead end.
                    */}
                    {o.application_link && o.link_state === 'dead' && (
                      <p className="text-[10px] font-semibold uppercase leading-relaxed tracking-[0.12em] text-[var(--ink-soft)] sm:text-right">
                        ⚠ Link didn&rsquo;t respond
                        {o.link_checked_at ? ` on ${formatCheckedAt(o.link_checked_at)}` : ''}
                      </p>
                    )}
                    {o.application_link && (
                      // "Learn more" keeps the visitor on Ona: it opens this
                      // grant's own profile, where the (unchanged) Apply directive
                      // sends them on to the provider. An internal link is never a
                      // dead end, so the old dead-link button variant is gone.
                      <Link
                        href={grantHref(o)}
                        onClick={() =>
                          track({
                            name: 'grant_card_click',
                            grant: o.name,
                            funder: o.funder,
                            from: 'list',
                          })
                        }
                        className="mt-auto block w-full border-2 border-[var(--ink)] px-4 py-2 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)] sm:w-auto"
                      >
                        Learn more →
                      </Link>
                    )}
                    <div className="sm:self-end">
                      <SaveButton opportunityId={o.id} from="list" variant="card" />
                    </div>
                    {/*
                      Show our working.

                      The site claims "we check each one and keep it current".
                      A claim like that is worth more when it is dated: it lets
                      a visitor judge for themselves how current this is, and
                      it quietly demonstrates, every day, that someone is
                      minding the database. Only shown for links we actually
                      reached — a dead one already says when it failed, and an
                      unverified one has nothing honest to report.
                    */}
                    {o.link_state === 'ok' && o.link_checked_at && (
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)] sm:text-right">
                        Link checked {formatCheckedAt(o.link_checked_at)}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        {totalPages > 1 && (
          <nav className="mt-12 flex items-center justify-center gap-4" aria-label={`Page ${page}`}>
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
      </section>

      {(
        <div className="mb-14">
          <EmailCapture
            sectors={sectors}
            heading="Never miss a deadline"
            blurb="A weekly email with what’s new and what’s closing soon. Tell us what you’re looking for and we’ll keep it relevant."
          />
        </div>
      )}
    </main>
  )
}
