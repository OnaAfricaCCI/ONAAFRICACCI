'use client'

import { track, type AnalyticsEvent } from '@/lib/analytics'

/** An <a> that records an analytics event on click. For server components. */
export default function TrackedLink({
  event,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { event: AnalyticsEvent }) {
  return <a {...props} onClick={() => track(event)} />
}
