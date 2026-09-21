'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import posthog from 'posthog-js'

/**
 * Boots PostHog and records a pageview on every navigation.
 * Does nothing at all unless NEXT_PUBLIC_POSTHOG_KEY is set.
 *
 * Privacy posture:
 *  - Cookieless ("memory" persistence): no consent banner needed, and nothing
 *    is written to the visitor's device. The trade-off is that return visits
 *    aren't stitched together — acceptable for a public information site.
 *  - Session recordings mask every input field by default.
 *  - No personal profile is created for anonymous visitors.
 */
function PageviewTracker() {
  const pathname = usePathname()
  const search = useSearchParams()

  useEffect(() => {
    if (!posthog.__loaded) return
    const url = window.origin + pathname + (search?.toString() ? `?${search}` : '')
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, search])

  return null
}

export default function Analytics() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key || posthog.__loaded) return

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      ui_host: 'https://eu.posthog.com',
      capture_pageview: false,      // we send our own on route change
      capture_pageleave: true,      // enables time-on-page and bounce
      persistence: 'memory',        // cookieless
      person_profiles: 'identified_only',
      autocapture: true,            // clicks on links/buttons, for heatmaps
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-private]',
      },
    })
  }, [])

  return (
    <Suspense fallback={null}>
      <PageviewTracker />
    </Suspense>
  )
}
