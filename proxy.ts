import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Keeps the Supabase auth session fresh on every request by rotating the
 * session cookies. Without this, a signed-in user's token would expire and
 * server components would stop seeing them as signed in.
 *
 * It only refreshes the session; it does not gate routes. Public browsing,
 * search, grant and funder pages all stay open to everyone — the private
 * profile/saved data is protected at the database by Row Level Security, not
 * here. Per-page "you must be signed in" checks live in the pages themselves.
 *
 * Next 16 renamed Middleware to Proxy; the behaviour is unchanged.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Touch the session so expiring tokens are rotated into the response cookies.
  await supabase.auth.getUser()

  return response
}

export const config = {
  // Run on everything except static assets and image files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
