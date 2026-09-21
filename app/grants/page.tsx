'use client'

import { useEffect, useMemo, useState } from 'react'
import EmailCapture from '@/app/components/EmailCapture'
import { supabase } from '@/lib/supabase'
import { parseAmount } from '@/lib/amount'
import { isPublishableGrant } from '@/lib/quality'

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

type SortKey = 'az' | 'za' | 'deadline' | 'newest'

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
  if (!deadline) return deadlineType === 'recurring' ? 'Recurring' : null
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return deadline
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000)
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
  const [showExpired, setShowExpired] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('az')

  useEffect(() => {
    supabase
      .from('opportunities')
      .select('*')
      .not('description', 'is', null)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setOpportunities(((data as Opportunity[]) ?? []).filter(isPublishableGrant))
        setLoading(false)
      })
  }, [])

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
    const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean)

    const matches = opportunities.filter((o) => {
      // Hide grants whose fixed deadline has already passed (unless toggled on)
      const dl = daysLeft(o.deadline)
      if (!showExpired && dl !== null && dl < 0) return false
      if (sector !== 'all' && o.cci_sector !== sector) return false
      if (country !== 'all' && !(o.eligible_countries ?? []).includes(country)) return false
      if (fundingType !== 'all' && o.funding_type !== fundingType) return false
      if (deadlineType !== 'all' && o.deadline_type !== deadlineType) return false
      if (amountBand !== 'all') {
        const band = AMOUNT_BANDS.find((b) => b.value === amountBand)!
        const value = parseAmount(o.amount)
        if (value === null || value < band.min || value >= band.max) return false
      }
      if (terms.length) {
        const haystack = [
          o.name,
          o.funder,
          o.description,
          o.cci_sector,
          o.funding_type,
          o.amount,
          ...(o.eligible_countries ?? []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        // every word must appear somewhere (order-independent)
        if (!terms.every((t) => haystack.includes(t))) return false
      }
      return true
    })

    const byName = (a: Opportunity, b: Opportunity) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })

    return [...matches].sort((a, b) => {
      switch (sortBy) {
        case 'az':
          return byName(a, b)
        case 'za':
          return byName(b, a)
        case 'newest':
          return b.created_at.localeCompare(a.created_at)
        case 'deadline': {
          // soonest real deadline first; undated entries last, alphabetical within
          const da = daysLeft(a.deadline)
          const db = daysLeft(b.deadline)
          if (da === null && db === null) return byName(a, b)
          if (da === null) return 1
          if (db === null) return -1
          return da - db || byName(a, b)
        }
      }
    })
  }, [opportunities, sector, country, fundingType, deadlineType, amountBand, showExpired, search, sortBy])

  const activeFilters = [sector, country, fundingType, deadlineType, amountBand].filter(
    (f) => f !== 'all',
  ).length

  const selectClass =
    'control-h w-full truncate border-2 border-[var(--border-md)] bg-[var(--bg)] pl-[14px] pr-9 text-sm font-medium ' +
    'cursor-pointer transition-colors hover:border-[var(--ink)] focus:border-[var(--ink)] focus:outline-none'

  return (
    <main className="mx-auto max-w-6xl px-5">
      {/* Masthead */}
      <section className="border-b border-[var(--line)] py-12 sm:py-16">
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
      </section>

      {/* Filter bar */}
      <section className="sticky top-[92px] sm:top-[66px] z-10 -mx-5 border-b border-[var(--line)] bg-[var(--paper)]/95 px-5 py-4 backdrop-blur-sm">
        {/* Row 1: search (8 cols) + sort (2 cols) — same 10-col track as the filters */}
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-10">
          <div className="relative sm:col-span-8">
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
          <select
            className={`${selectClass} sm:col-span-2`}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            aria-label="Sort grants"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Row 2: five equal-width selects on the same 10-col track (2 cols each) */}
        <div
          role="group"
          aria-label="Filter grants"
          className="grid grid-cols-2 gap-3 sm:grid-cols-10 [&>select]:sm:col-span-2"
        >
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
            <option value="all">All types</option>
            {fundingTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select className={selectClass} value={deadlineType} onChange={(e) => setDeadlineType(e.target.value)}>
            <option value="all">All deadlines</option>
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

        {/* Row 2: toggles */}
        <div className="mt-3 flex items-center gap-5">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            <input
              type="checkbox"
              checked={showExpired}
              onChange={(e) => setShowExpired(e.target.checked)}
              className="h-4 w-4 accent-[var(--terracotta)]"
            />
            Show expired
          </label>
          {(activeFilters > 0 || search) && (
            <button
              onClick={() => {
                setSector('all'); setCountry('all'); setFundingType('all')
                setDeadlineType('all'); setAmountBand('all'); setSearch('')
              }}
              className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--terracotta)] underline underline-offset-4 hover:no-underline"
            >
              Clear all{activeFilters > 0 ? ` (${activeFilters})` : ''}
            </button>
          )}
        </div>
      </section>

      {/* Results */}
      <section className="py-8">
        {error && (
          <p className="border-2 border-[var(--error)] bg-[var(--error-soft)] p-5 text-sm">
            Failed to load: {error}
          </p>
        )}
        {loading && (
          <p className="py-16 text-center text-sm uppercase tracking-[0.2em] text-[var(--ink-soft)]">
            Finding opportunities…
          </p>
        )}

        {!loading && !error && filtered.length === 0 && (
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
                  Check back soon, or turn on &ldquo;Show expired&rdquo; to see what&rsquo;s
                  been listed before.
                </p>
              </>
            )}
          </div>
        )}

        <ul className="divide-y divide-[var(--line)]">
          {filtered.map((o, i) => {
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
                      {o.application_link ? (
                        <a
                          href={o.application_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="decoration-[var(--ink)] decoration-2 underline-offset-4 group-hover:underline"
                        >
                          {o.name}
                        </a>
                      ) : (
                        o.name
                      )}
                    </h2>

                    {o.funder && (
                      <p className="mt-1 text-sm font-medium text-[var(--ink-soft)]">{o.funder}</p>
                    )}

                    {o.description && (
                      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-2)]">
                        {o.description}
                      </p>
                    )}

                    {(o.eligible_countries ?? []).length > 0 && (
                      <p className="mt-3 text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                        <span className="font-semibold">Eligible: </span>
                        {(o.eligible_countries ?? []).slice(0, 6).join(' · ')}
                        {(o.eligible_countries ?? []).length > 6 &&
                          ` · +${(o.eligible_countries ?? []).length - 6} more`}
                      </p>
                    )}
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
                    {o.application_link && (
                      <a
                        href={o.application_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto block w-full border-2 border-[var(--ink)] px-4 py-2 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] sm:w-auto"
                      >
                        Apply →
                      </a>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {!loading && !error && (
        <div className="mb-14">
          <EmailCapture
            sectors={sectors}
            countries={countries}
            heading="Never miss a deadline"
            blurb="A weekly email with what’s new and what’s closing soon. Tell us what you’re looking for and we’ll keep it relevant."
          />
        </div>
      )}
    </main>
  )
}
