import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { cleanProfile } from '@/lib/profileValidation'
import { rateLimited, readJson, tooLarge, tooMany } from '@/lib/guard'
import { shouldShowThankYou } from '@/lib/phase2'

/**
 * Phase 2 batches — submit a batch's answers, or dismiss its invitation.
 *
 * Submitting and dismissing are deliberately distinct:
 *  - submit  → store this batch's answers, mark it completed, and record that an
 *              invitation was acted on this visit (so the next batch is never
 *              offered in the same visit).
 *  - dismiss → count the dismissal and hold the batch for at least three more
 *              return visits; after two dismissals it stops being offered
 *              automatically (a manual entry point stays in the profile).
 *
 * All answers are optional and partial: only the submitted batch's keys are
 * written, so a batch never disturbs Phase 1 or another batch.
 */

// The answer keys that belong to each batch (everything else in the body is ignored).
const BATCH_KEYS: Record<1 | 2 | 3, readonly string[]> = {
  1: ['goals', 'timeframe', 'willing_locations'],
  2: ['applications_count', 'prior_support', 'barriers', 'barriers_other'],
  3: ['citizenship', 'citizenship_prefer_not', 'registered_in', 'members_based_in', 'typical_amount', 'fit_rating', 'fit_note', 'actions_taken'],
} as const

// All Phase 2 answer fields, used to decide the real-vs-skipped thank-you.
const ALL_PHASE2_KEYS = [...BATCH_KEYS[1], ...BATCH_KEYS[2], ...BATCH_KEYS[3]] as const

function hasAnswer(row: Record<string, unknown>, key: string): boolean {
  const v = row[key]
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'boolean') return v // citizenship_prefer_not = true is a real answer
  return v != null && v !== ''
}

export async function POST(req: Request) {
  if (rateLimited(req, 30)) return tooMany()
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const body = await readJson(req)
  if (body === null) return tooLarge()

  const batch = body.batch === 1 || body.batch === 2 || body.batch === 3 ? (body.batch as 1 | 2 | 3) : null
  const action = body.action === 'dismiss' ? 'dismiss' : body.action === 'save-partial' ? 'save-partial' : 'submit'
  if (!batch) return NextResponse.json({ error: 'Unknown batch.' }, { status: 400 })

  // The current visit/dismissal state is the server's, never the client's.
  const { data: current } = await supabase
    .from('grant_seeker_profiles')
    .select('status, visit_count, batch1_dismissals, batch2_dismissals, batch3_dismissals, thankyou_shown')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!current || current.status !== 'completed') {
    return NextResponse.json({ error: 'Finish your profile first.' }, { status: 400 })
  }
  const visit = current.visit_count ?? 0

  if (action === 'dismiss') {
    const dismissals = (current[`batch${batch}_dismissals` as keyof typeof current] as number | null) ?? 0
    const { error } = await supabase.from('grant_seeker_profiles').update({
      [`batch${batch}_dismissals`]: dismissals + 1,
      [`batch${batch}_dismissed_visit`]: visit,
      last_invited_visit: visit,
    }).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: 'Could not save that. Please try again.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // --- submit / save-partial ----------------------------------------------
  // Both persist the entered answers and mark that an invitation was acted on
  // this visit; only a full submit marks the batch completed (which unlocks the
  // next one). "Save and finish later" leaves it open to resume, prefilled.
  const complete = action === 'submit'
  const clean = cleanProfile(body) as unknown as Record<string, unknown>
  const updates: Record<string, unknown> = {
    last_invited_visit: visit, // acted on an invitation this visit → no second batch now
    ...(complete ? { [`batch${batch}_completed`]: true } : {}),
  }
  for (const k of BATCH_KEYS[batch]) if (k in body) updates[k] = clean[k]

  const { data: saved, error } = await supabase
    .from('grant_seeker_profiles')
    .update(updates)
    .eq('user_id', user.id)
    .select()
    .single()
  if (error || !saved) return NextResponse.json({ error: 'Could not save your answers. Please try again.' }, { status: 500 })

  // The final batch earns a one-time thank-you — full if any Phase 2 answer was
  // given across all batches, neutral if everything was skipped.
  let thankYou: 'full' | 'neutral' | null = null
  if (complete && batch === 3) {
    const anyPhase2Answer = ALL_PHASE2_KEYS.some((k) => hasAnswer(saved as Record<string, unknown>, k))
    thankYou = shouldShowThankYou({ batch3_completed: true, thankyou_shown: !!current.thankyou_shown, anyPhase2Answer })
    if (thankYou) {
      // Mark it shown so it never reappears on later visits or edits.
      await supabase.from('grant_seeker_profiles').update({ thankyou_shown: true }).eq('user_id', user.id)
    }
  }

  return NextResponse.json({ ok: true, thankYou })
}
