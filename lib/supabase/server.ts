import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * A Supabase client bound to the signed-in user's session cookies.
 *
 * Reads and writes run AS THAT USER, so Row Level Security enforces owner-only
 * access at the database — the server never has to be trusted to filter by
 * user_id itself (though the API routes validate ownership too, belt and
 * braces). Use this for all per-user profile and saved-opportunity access.
 *
 * In Next 16 `cookies()` is async, so this factory is async.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // `setAll` was called from a Server Component where cookies are
            // read-only. The middleware refreshes the session, so this is safe
            // to ignore here.
          }
        },
      },
    },
  )
}

/** The signed-in user, or null. Never throws. */
export async function getCurrentUser() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
