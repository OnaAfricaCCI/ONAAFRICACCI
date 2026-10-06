import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/** Sign out and return to the homepage. POST only, so a link can't trigger it. */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/', new URL(request.url).origin), { status: 303 })
}
