'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type FeaturedGrant = {
  id: string
  name: string
  funder: string | null
  amount: string | null
  deadlineText: string
  urgent: boolean
  tag: string | null
  /** The grant's own page — always external. */
  href: string
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
    'flex h-9 w-9 items-center justify-center border-2 border-[var(--paper)] text-[var(--paper)] transition-colors ' +
    'hover:bg-[var(--bg)] hover:text-[var(--ink)] disabled:cursor-not-allowed ' +
    'disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[var(--paper)]'

  return (
    <section
      className="bg-[var(--ink)] py-12 text-[var(--bg)] sm:py-14"
      aria-labelledby="featured-heading"
    >
      <div className="mx-auto max-w-6xl px-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2
            id="featured-heading"
            className="font-[family-name:var(--font-display)] text-2xl leading-[1.2]"
          >
            {heading}
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-3)]">
            A few from the database, picked fresh each visit.
          </p>
        </div>

        {/* Arrows are a convenience on wide screens; phones swipe instead. */}
        <div className="hidden shrink-0 gap-2 sm:flex">
          <button
            type="button"
            onClick={() => { pause(); step(-1); resumeSoon() }}
            disabled={!canPrev}
            aria-label="Scroll to previous grant"
            aria-controls="featured-scroller"
            className={arrowClass}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => { pause(); step(1); resumeSoon() }}
            aria-label={canNext ? 'Scroll to next grant' : 'Back to first grant'}
            aria-controls="featured-scroller"
            className={arrowClass}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
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
        className="mt-6 -mx-5 flex snap-x snap-mandatory scroll-pl-5 gap-4 overflow-x-auto px-5 pb-2 text-[var(--ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--paper)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {grants.map((g) => (
            <li
              key={g.id}
              className="w-[19rem] shrink-0 snap-start sm:w-[21rem]"
            >
              <a
                href={g.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col border-2 border-[var(--bg)] bg-[var(--bg)] p-6 transition-colors hover:border-[var(--accent)]"
              >
                <h3 className="line-clamp-2 font-[family-name:var(--font-display)] text-xl font-semibold leading-snug decoration-[var(--ink)] decoration-2 underline-offset-4 group-hover:underline">
                  {g.name}
                </h3>

                {g.funder && (
                  <p className="mt-1 line-clamp-1 text-sm text-[var(--ink-soft)]">{g.funder}</p>
                )}

                {g.amount && (
                  <p className="mt-3 line-clamp-2 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug text-[var(--forest)]">
                    {g.amount}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-[0.12em] ${
                      g.urgent ? 'text-[var(--accent)]' : 'text-[var(--ink-soft)]'
                    }`}
                  >
                    {g.deadlineText}
                  </span>
                  {g.tag && (
                    <span className="bg-[var(--ochre-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]">
                      {g.tag}
                    </span>
                  )}
                  <span className="ml-auto text-[var(--ink-soft)] transition-colors group-hover:text-[var(--accent)]" aria-hidden="true">
                    ↗
                  </span>
                </div>
              </a>
            </li>
        ))}
      </ul>
      </div>
    </section>
  )
}
