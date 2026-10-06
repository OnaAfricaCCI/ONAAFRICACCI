/**
 * The one-time "Your Ona Funds profile is ready" confirmation email.
 *
 * Sent by the SERVER (service role) after a user's FIRST profile is persisted
 * as completed and their email is verified. Delivery state lives in
 * `profile_confirmation_emails` (one row per user), so a retry, refresh or
 * re-run can never send a second one — the row's existence with status 'sent'
 * is the idempotency guard.
 *
 * Email delivery is handled SEPARATELY from saving the profile: this never
 * throws, so a Resend outage can't undo a profile the user already completed.
 * It also never sends on ordinary edits or draft saves — only the caller's
 * first-completion transition reaches here.
 *
 * It carries NO profile answers and NO auth tokens: just confirmation and
 * links to the relevant pages, the privacy policy and a contact address.
 *
 * Sender: configure a verified domain in Resend and set PROFILE_FROM to
 * "Ona Funds <hello@onafunds.com>". Until then it falls back to Resend's test
 * sender, which only delivers to the Resend account owner — see the handover.
 */
import { supabaseAdmin } from './supabase-admin'
import { renderConfirmationEmail, PROFILE_EMAIL_SUBJECT } from './profileEmailTemplate'

const API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.PROFILE_FROM ?? process.env.NOTIFY_FROM ?? 'Ona Funds <onboarding@resend.dev>'

export type SendResult =
  | { status: 'sent'; id: string | null }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string }

/**
 * Send the confirmation if it hasn't been sent already. Idempotent and
 * non-throwing. `verifiedEmail` must be the user's verified address.
 */
export async function sendProfileConfirmation(
  userId: string,
  verifiedEmail: string | null | undefined,
): Promise<SendResult> {
  if (!verifiedEmail) return { status: 'skipped', reason: 'no-verified-email' }

  // Idempotency guard: if we've already sent, stop.
  const { data: existing } = await supabaseAdmin
    .from('profile_confirmation_emails')
    .select('status, attempts')
    .eq('user_id', userId)
    .maybeSingle()
  if (existing?.status === 'sent') return { status: 'skipped', reason: 'already-sent' }

  // Claim the attempt (create or bump the row to pending).
  await supabaseAdmin.from('profile_confirmation_emails').upsert(
    { user_id: userId, status: 'pending', attempts: (existing?.attempts ?? 0) + 1, last_error: null },
    { onConflict: 'user_id' },
  )

  if (!API_KEY) {
    await supabaseAdmin
      .from('profile_confirmation_emails')
      .update({ status: 'failed', last_error: 'RESEND_API_KEY not set' })
      .eq('user_id', userId)
    return { status: 'failed', error: 'email-not-configured' }
  }

  const { text, html } = renderConfirmationEmail()
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), 8000)
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: abort.signal,
      headers: { authorization: `Bearer ${API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [verifiedEmail],
        subject: PROFILE_EMAIL_SUBJECT,
        html,
        text,
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      await supabaseAdmin
        .from('profile_confirmation_emails')
        .update({ status: 'failed', last_error: `${res.status} ${body}`.slice(0, 500) })
        .eq('user_id', userId)
      return { status: 'failed', error: `resend-${res.status}` }
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string }
    await supabaseAdmin
      .from('profile_confirmation_emails')
      .update({ status: 'sent', provider_message_id: json.id ?? null, last_error: null })
      .eq('user_id', userId)
    return { status: 'sent', id: json.id ?? null }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    await supabaseAdmin
      .from('profile_confirmation_emails')
      .update({ status: 'failed', last_error: msg.slice(0, 500) })
      .eq('user_id', userId)
    return { status: 'failed', error: msg }
  } finally {
    clearTimeout(timer)
  }
}
