/**
 * Analytics — PostHog.
 *
 * One place to record what visitors do. Every call is a no-op until
 * NEXT_PUBLIC_POSTHOG_KEY is set, so the site works identically without it.
 *
 * Event names are the vocabulary you'll see in the PostHog dashboard. Keep
 * them stable: renaming one breaks its history.
 */
import posthog from 'posthog-js'

export const ANALYTICS_ENABLED =
  typeof window !== 'undefined' && Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY)

export type AnalyticsEvent =
  // The single most important signal: interest in a specific grant
  | { name: 'grant_apply_click'; grant: string; funder: string | null; from: 'list' | 'carousel' }
  | { name: 'grant_search'; query: string; results: number }
  | { name: 'grant_filter'; filter: string; value: string; results: number }
  | { name: 'grant_sort'; sort: string }
  | { name: 'show_expired_toggle'; on: boolean }
  | { name: 'funder_search'; query: string; results: number }
  | { name: 'funder_filter'; filter: string; value: string; results: number }
  | { name: 'funder_profile_view'; funder: string }
  | { name: 'funder_link_click'; funder: string; link: 'website' | 'grants_page' | 'email' }
  | { name: 'subscribe'; placement: 'home' | 'grants'; with_preferences: boolean }
  | { name: 'contact_message_sent' }
  | { name: 'opportunity_submitted' }
  | { name: 'theme_toggle'; to: 'light' | 'dark' }
  | { name: 'carousel_arrow'; direction: 'prev' | 'next' }
  | { name: 'outbound_click'; url: string; context: string }

export function track(event: AnalyticsEvent) {
  if (!ANALYTICS_ENABLED) return
  const { name, ...props } = event
  posthog.capture(name, props)
}

/** Reads from the search box are noisy; only record settled queries. */
export function debounced<T extends unknown[]>(fn: (...args: T) => void, ms = 800) {
  let t: ReturnType<typeof setTimeout> | undefined
  return (...args: T) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}
