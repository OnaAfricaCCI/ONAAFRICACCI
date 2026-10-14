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
      { error: 'Please add your country, who you are applying as, a creative area and the kinds of opportunity you want.' },
      { status: 400 },
    )
  }

  // Partial write: only columns actually SUBMITTED are updated, so saving Phase 1
  // never wipes Phase 2 answers (and a Phase 2 batch never wipes Phase 1). An
  // omitted field keeps its stored value. `taxonomy_review` tracks the "Another
  // area" text, so it follows `disciplines_other`.
  const SUBMIT_KEYS = [
    'country_code', 'applicant_type', 'organisation_name', 'organisation_country',
    'disciplines', 'disciplines_other', 'stage', 'support_types', 'open_to_all', 'languages',
    'goals', 'timeframe', 'willing_locations',
    'applications_count', 'prior_support', 'barriers', 'barriers_other',
    'citizenship', 'citizenship_prefer_not', 'registered_in', 'members_based_in',
    'typical_amount', 'fit_rating', 'fit_note', 'actions_taken',
  ] as const
  const updates: Record<string, unknown> = {}
  for (const k of SUBMIT_KEYS) if (k in body) updates[k] = (clean as Record<string, unknown>)[k]
  if ('disciplines_other' in body) updates.taxonomy_review = clean.taxonomy_review

  // Was the profile already completed before this write? (To fire the one-time
  // confirmation only on the FIRST completion, never on an edit.)
  const { data: before } = await supabase
    .from('grant_seeker_profiles')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()
  const firstCompletion = action === 'complete' && before?.status !== 'completed'
  const now = new Date().toISOString()

  const row = {
    user_id: user.id,
    status: action === 'complete' ? 'completed' : 'draft',
    ...updates,
    // Seed visit tracking at first completion: the sign-up session itself is not
    // a return visit, so the next genuine return (>=30 min later) becomes visit 1.
    ...(firstCompletion ? { completed_at: now, last_visit_at: now, visit_count: 0 } : {}),
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
