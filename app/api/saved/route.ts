import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { rateLimited, readJson, tooLarge, tooMany } from '@/lib/guard'

/**
 * Saved opportunities (a user's shortlist). Owner-only via RLS; user_id comes
 * from the session, never the body.
 *
 *  GET    → the ids this user has saved (for the browser to show save state)
 *  POST   → save { opportunity_id }  (idempotent: the unique constraint means a
 *           repeat save never creates a duplicate — a repeat returns ok)
 *  DELETE → unsave { opportunity_id }
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const { data, error } = await supabase
    .from('saved_opportunities')
    .select('opportunity_id')
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: 'Could not load saved opportunities.' }, { status: 500 })
  return NextResponse.json({ ids: (data ?? []).map((r) => r.opportunity_id) })
}

export async function POST(req: Request) {
  if (rateLimited(req, 60)) return tooMany()
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const body = await readJson(req, 2000)
  if (body === null) return tooLarge()
  const id = String(body.opportunity_id ?? '')
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid opportunity.' }, { status: 400 })

  // Idempotent: ignore a duplicate rather than erroring. The unique
  // (user_id, opportunity_id) constraint is what guarantees no double save.
  const { error } = await supabase
    .from('saved_opportunities')
    .upsert({ user_id: user.id, opportunity_id: id }, { onConflict: 'user_id,opportunity_id', ignoreDuplicates: true })

  if (error) {
    // A foreign-key violation means the opportunity doesn't exist.
    const code = (error as { code?: string }).code
    if (code === '23503') return NextResponse.json({ error: 'That opportunity no longer exists.' }, { status: 404 })
    return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, saved: true })
}

export async function DELETE(req: Request) {
  if (rateLimited(req, 60)) return tooMany()
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const body = await readJson(req, 2000)
  if (body === null) return tooLarge()
  const id = String(body.opportunity_id ?? '')
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid opportunity.' }, { status: 400 })

  const { error } = await supabase
    .from('saved_opportunities')
    .delete()
    .eq('user_id', user.id)
    .eq('opportunity_id', id)
  if (error) return NextResponse.json({ error: 'Could not remove. Please try again.' }, { status: 500 })
  return NextResponse.json({ ok: true, saved: false })
}
