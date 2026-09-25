'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { track } from '@/lib/analytics'
import { Sightline } from './Motif'

export type FeaturedGrant = {
  id: string
  name: string
  funder: string | null
  amount: string | null
  deadlineText: string
  urgent: boolean
  /** Days until the deadline, or null when there is no fixed date. */
  daysLeft: number | null
  /** Instrument and sector, e.g. "grant · film". */
  kicker: string | null
  /** Who it is open to, in the funder's own words. */
  who: string | null
  /** When the link was last checked, for the card's footer. */
  checkedAt: string | null
  /** The grant's own page, always external. */
  href: string
}

/**
 * Where the eye sits on the Sightline.
 *
 * The bar covers the next 90 days. The thick segment fills as the deadline
 * approaches, so a call closing this week reads as nearly full and one three
 * months out reads as barely started. A grant with no fixed date gets no
 * sightline: drawing one would imply a deadline we do not have.
 */
function sightlineProgress(daysLeft: number | null): number | null {
  if (daysLeft === null || daysLeft < 0) return null
  const WINDOW = 90
  return 1 - Math.min(daysLeft, WINDOW) / WINDOW
}

function verifiedLabel(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function FeaturedCarousel({
  grants,
  heading = 'Grants worth a look',
}: {
  grants: FeaturedGrant[]
  heading?: string
}) {
  const scroller = useRef<HTMLUListElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const sync = useCallback(() => {
    const el = scroller.current
    if (!el) return
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    sync()
    const el = scroller.current
    if (!el) return
    el.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      el.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [sync])

  const reducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /** Scroll by exactly one card; wraps to the start when the end is reached. */
  const step = useCallback((dir: 1 | -1) => {
    const el = scroller.current
    if (!el) return
    const card = el.querySelector('li')
    const gap = 16
    const distance = card ? card.getBoundingClientRect().width + gap : el.clientWidth * 0.8
    const behavior = reducedMotion() ? 'auto' : 'smooth'
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4

    if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior })
    else el.scrollBy({ left: dir * distance, behavior })
  }, [])

  // ---- Auto-advance ---------------------------------------------------------
  // Moves one card every few seconds. Pauses whenever a person is engaging with
  // it (hover, keyboard focus, touch/drag) or the tab is hidden, and never runs
  // for users who have asked for reduced motion.
  const paused = useRef(false)
  const resumeTimer = useRef<number | null>(null)

  const pause = () => { paused.current = true }
  const resumeSoon = (delay = 6000) => {
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
    resumeTimer.current = window.setTimeout(() => { paused.current = false }, delay)
  }

  useEffect(() => {
    if (grants.length < 2 || reducedMotion()) return
    const el = scroller.current
    if (!el) return

    const id = window.setInterval(() => {
      if (paused.current || document.hidden || el.matches(':hover') || el.matches(':focus-within')) return
      step(1)
    }, 4500)

    // A manual scroll (wheel, drag, swipe) counts as engagement too.
    const onUserScroll = () => { pause(); resumeSoon() }
    el.addEventListener('wheel', onUserScroll, { passive: true })
    el.addEventListener('touchstart', onUserScroll, { passive: true })
    el.addEventListener('pointerdown', onUserScroll, { passive: true })

    return () => {
      window.clearInterval(id)
      el.removeEventListener('wheel', onUserScroll)
      el.removeEventListener('touchstart', onUserScroll)
      el.removeEventListener('pointerdown', onUserScroll)
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
    }
  }, [grants.length, step])

  if (grants.length === 0) return null

  const arrowClass =
    'flex h-9 w-9 items-center justify-center border-2 border-[var(--ink)] text-[var(--ink)] transition-colors ' +
    'hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#121412] disabled:cursor-not-allowed ' +
    'disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[var(--ink)]'

  return (
    <section
      className="py-14 sm:py-16"
      aria-labelledby="featured-heading"
    >
      <div className="mx-auto max-w-6xl px-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2
            id="featured-heading"
            className="font-[family-name:var(--font-display)] text-[32px] leading-[1.1] sm:text-[44px]"
          >
            {heading}
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-2)]">
            A few from the database, picked fresh each visit.
          </p>
        </div>

        {/* Arrows are a convenience on wide screens; phones swipe instead. */}
        <div className="hidden shrink-0 gap-2 sm:flex">
          <button
            type="button"
            onClick={() => { pause(); step(-1); resumeSoon(); track({ name: 'carousel_arrow', direction: 'prev' }) }}
            disabled={!canPrev}
            aria-label="Scroll to previous grant"
            aria-controls="featured-scroller"
            className={arrowClass}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => { pause(); step(1); resumeSoon(); track({ name: 'carousel_arrow', direction: 'next' }) }}
            aria-label={canNext ? 'Scroll to next grant' : 'Back to first grant'}
            aria-controls="featured-scroller"
            className={arrowClass}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <ul
        ref={scroller}
        id="featured-scroller"
        // Focusable so keyboard users can scroll the strip with arrow keys
        tabIndex={0}
        role="region"
        aria-label="Featured grants, horizontally scrollable"
        className="mt-6 -mx-5 flex snap-x snap-mandatory scroll-pl-5 gap-4 overflow-x-auto px-5 pb-3 pt-1 text-[var(--ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {grants.map((g) => {
          const progress = sightlineProgress(g.daysLeft)
          const verified = verifiedLabel(g.checkedAt)
          return (
            <li key={g.id} className="w-[19rem] shrink-0 snap-start sm:w-[21rem]">
              <a
                href={g.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  track({ name: 'grant_apply_click', grant: g.name, funder: g.funder, from: 'carousel' })
                }
                className="card-ona group flex h-full flex-col border border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)]"
              >
                {/* Type on the left, the deadline on the right, in Coral Deep
                    because it sits under 24px on ivory. */}
                <div className="flex items-center justify-between gap-3 border-b border-[var(--ink)] px-4 py-3">
                  <span className="label truncate text-[11px]">{g.kicker ?? 'Opportunity'}</span>
                  <span
                    className={`label shrink-0 text-[11px] ${
                      g.urgent ? 'text-[var(--accent-deep)]' : 'text-[var(--ink-2)]'
                    }`}
                  >
                    {g.deadlineText}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-2.5 px-4 py-4">
                  <h3 className="line-clamp-2 text-[19px] font-bold leading-[1.3] transition-colors group-hover:text-[var(--accent-deep)]">
                    {g.name}
                  </h3>
                  {g.amount && (
                    <p className="line-clamp-2 font-[family-name:var(--font-display)] text-[24px] font-bold leading-[1.15]">
                      {g.amount}
                    </p>
                  )}
                  {g.funder && (
                    <p className="line-clamp-1 text-sm text-[var(--ink-2)]">{g.funder}</p>
                  )}
                  {g.who && (
                    <p className="line-clamp-2 text-sm leading-[1.5] text-[var(--ink-2)]">{g.who}</p>
                  )}
                </div>

                {/* Sightline: only where there is a real date to mark. */}
                {progress !== null && (
                  <div className="px-4 pb-1">
                    <Sightline
                      progress={progress}
                      className="block h-9 w-full"
                      label={`Closes ${g.deadlineText}`}
                    />
                  </div>
                )}

                <div className="bg-[var(--sage-mist)] px-4 py-2.5 text-xs text-[var(--ink-2)]">
                  {verified ? `Link checked ${verified}` : 'Link checked before listing'}
                </div>
              </a>
            </li>
          )
        })}
      </ul>
      </div>
    </section>
  )
}
