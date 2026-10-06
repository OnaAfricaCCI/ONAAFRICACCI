import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { safeNext } from '@/lib/returnUrl'

/**
 * Where the email magic link lands. It exchanges the one-time code for a
 * session (Supabase's secure, expiring token — we never roll our own), then:
 *
 *   1. completes a pending save, if the link carried one (`save=<uuid>`), so a
 *      visitor who clicked "Save" while signed out gets the opportunity saved
 *      exactly once on return;
 *   2. redirects to the page they came from — but ONLY a validated same-site
 *      path (safeNext), so the link can't be turned into an open redirect.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = safeNext(url.searchParams.get('next'), '/')
  const save = url.searchParams.get('save')
  const origin = url.origin

  if (!code) {
    return NextResponse.redirect(new URL('/signin?error=link', origin))
  }

  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL('/signin?error=expired', origin))
  }

  // Complete a pending save, once. Idempotent via the unique constraint.
  let savedParam = ''
  if (save && UUID.test(save)) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error: saveErr } = await supabase
        .from('saved_opportunities')
        .upsert(
          { user_id: user.id, opportunity_id: save },
          { onConflict: 'user_id,opportunity_id', ignoreDuplicates: true },
        )
      if (!saveErr) savedParam = 'saved=1'
    }
  }

  const dest = new URL(next, origin)
  if (savedParam) dest.searchParams.set('saved', '1')
  return NextResponse.redirect(dest)
}
