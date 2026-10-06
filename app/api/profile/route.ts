import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { cleanProfile, isCompletable } from '@/lib/profileValidation'
import { sendProfileConfirmation } from '@/lib/profileEmail'
import { rateLimited, readJson, tooLarge, tooMany } from '@/lib/guard'

/**
 * The grant-seeker profile API. All access is as the signed-in user, so Row
 * Level Security enforces owner-only at the database; we also derive user_id
 * from the session (never the request body), so a user can only ever write
 * their own row.
 *
 *  GET    → the current user's profile, or null
 *  POST   → save a draft, or complete the profile (action: 'save-draft' | 'complete')
 *  DELETE → delete the profile (keeps the account and saved opportunities)
 */

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const { data, error } = await supabase
    .from('grant_seeker_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Could not load your profile.' }, { status: 500 })
  return NextResponse.json({ profile: data ?? null })
}

export async function POST(req: Request) {
  if (rateLimited(req, 30)) return tooMany()
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const body = await readJson(req)
  if (body === null) return tooLarge()

  const action = body.action === 'complete' ? 'complete' : 'save-draft'
  const clean = cleanProfile(body)

  if (action === 'complete' && !isCompletable(clean)) {
    return NextResponse.json(
      { error: 'Please add your country, who you are applying as, a discipline and a support type.' },
      { status: 400 },
    )
  }

  // Was the profile already completed before this write? (To fire the one-time
  // confirmation only on the FIRST completion, never on an edit.)
  const { data: before } = await supabase
    .from('grant_seeker_profiles')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()
  const firstCompletion = action === 'complete' && before?.status !== 'completed'

  const row = {
    user_id: user.id,
    status: action === 'complete' ? 'completed' : 'draft',
    ...clean,
    ...(firstCompletion ? { completed_at: new Date().toISOString() } : {}),
  }

  const { data: saved, error } = await supabase
    .from('grant_seeker_profiles')
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Could not save your profile. Please try again.' }, { status: 500 })
  }

  // Confirmation email: only on the first completion, only for a verified email,
  // and never blocking the save. A failure here does not undo the saved profile.
  let emailStatus: string | undefined
  if (firstCompletion) {
    const verified = user.email_confirmed_at || user.confirmed_at ? user.email : null
    const result = await sendProfileConfirmation(user.id, verified)
    emailStatus = result.status
  }

  return NextResponse.json({ profile: saved, emailStatus })
}

export async function DELETE() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  // Deletes ONLY the profile. The account and saved opportunities are untouched.
  const { error } = await supabase.from('grant_seeker_profiles').delete().eq('user_id', user.id)
  if (error) return NextResponse.json({ error: 'Could not delete your profile.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
