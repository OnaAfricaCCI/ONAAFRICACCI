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
import { SITE_URL } from './site'

const API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.PROFILE_FROM ?? process.env.NOTIFY_FROM ?? 'Ona Funds <onboarding@resend.dev>'
const CONTACT = 'hello@onafunds.com'

export type SendResult =
  | { status: 'sent'; id: string | null }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string }

function templates() {
  const rec = `${SITE_URL}/recommendations`
  const saved = `${SITE_URL}/saved`
  const settings = `${SITE_URL}/profile`
  const privacy = `${SITE_URL}/privacy`

  const text = [
    'Your Ona Funds profile is ready.',
    '',
    'Thanks for telling Ona about your work. We will use it to show you more relevant funding.',
    '',
    'Creating a profile does not submit a funding application. Applications always happen on the funder’s own website.',
    '',
    'Your profile is private. It is visible only to you and is not shared with funders.',
    '',
    `See opportunities for you:  ${rec}`,
    `Your saved opportunities:   ${saved}`,
    `Review or edit your profile: ${settings}`,
    '',
    `Privacy policy: ${privacy}`,
    `Questions or data requests: ${CONTACT}`,
    '',
    'Ona Funds',
  ].join('\n')

  const btn = (href: string, label: string) =>
    `<a href="${href}" style="display:inline-block;margin:4px 8px 4px 0;padding:11px 18px;background:#121412;color:#f6f4ec;text-decoration:none;font-weight:700;font-size:14px;">${label}</a>`

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f4ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#121412;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;padding:32px;">
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#5f7359;font-weight:700;">Ona Funds</p>
    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;">Your profile is ready</h1>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Thanks for telling Ona about your work. We will use it to show you more relevant funding across the continent and the diaspora.</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;"><strong>Creating a profile does not submit a funding application.</strong> Applications always happen on the funder’s own website.</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">Your profile is private. It is visible only to you and is not shared with funders.</p>
    <div style="margin:0 0 24px;">${btn(rec, 'Opportunities for you')}${btn(saved, 'Saved opportunities')}${btn(settings, 'Profile settings')}</div>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#4a5249;border-top:1px solid #dce3d5;padding-top:16px;">
      Read our <a href="${privacy}" style="color:#4a5249;">privacy policy</a>. Questions or a data request? Email
      <a href="mailto:${CONTACT}" style="color:#4a5249;">${CONTACT}</a>.
    </p>
  </div></body></html>`

  return { text, html }
}

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

  const { text, html } = templates()
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
        subject: 'Your Ona Funds profile is ready',
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
