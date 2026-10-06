'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * The browser Supabase client, bound to the session cookies. Used by client
 * components that need the current session (e.g. the Save button deciding
 * whether the visitor is signed in) and to start the email magic-link flow.
 *
 * A single instance is reused so the auth state listener isn't duplicated.
 */
let client: ReturnType<typeof createBrowserClient> | undefined

export function createBrowserSupabase() {
  if (client) return client
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  return client
}
