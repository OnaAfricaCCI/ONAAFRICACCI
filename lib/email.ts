/**
 * Outbound email (Resend).
 *
 * Used for internal notifications when someone writes in or submits an
 * opportunity — so a message never sits unseen in the database.
 *
 * No-ops safely when RESEND_API_KEY isn't set: the form still succeeds and
 * the record is still stored, you just don't get the nudge.
 */

const API_KEY = process.env.RESEND_API_KEY
/** Until the domain is verified in Resend, this falls back to their test sender. */
const FROM = process.env.NOTIFY_FROM ?? 'Ona <onboarding@resend.dev>'
const TO = process.env.NOTIFY_TO ?? 'hello@onafunds.com'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function notify({
  subject,
  lines,
  replyTo,
}: {
  subject: string
  /** [label, value] pairs shown as a simple table */
  lines: [string, string | null | undefined][]
  replyTo?: string
}): Promise<void> {
  if (!API_KEY) return

  const rows = lines
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#525252;font-size:13px;white-space:nowrap;vertical-align:top;">${esc(k)}</td>` +
        `<td style="padding:6px 0;font-size:15px;">${esc(String(v)).replace(/\n/g, '<br>')}</td></tr>`,
    )
    .join('')

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a0a0a;">
    <div style="max-width:560px;margin:0 auto;">
      <p style="margin:0 0 16px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#525252;">Ona — website</p>
      <h1 style="margin:0 0 20px;font-size:22px;">${esc(subject)}</h1>
      <table cellpadding="0" cellspacing="0">${rows}</table>
    </div></body></html>`

  /*
   * Hard timeout on the outbound call.
   *
   * Without it, a slow or unresponsive Resend holds the visitor's form POST
   * open until the serverless function is killed — they see "Something went
   * wrong" and submit again, even though their message was already saved.
   * Duplicate messages, and a visitor who thinks the site is broken. The
   * notification is a convenience; it must never outrank the submission.
   */
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), 5000)

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: abort.signal,
      headers: { authorization: `Bearer ${API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        subject,
        html,
        // Hitting reply goes straight to the person who wrote in
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    })
    if (!res.ok) console.error('notify failed:', res.status, await res.text())
  } catch (err) {
    // Never let a notification failure break the visitor's submission
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('notify timed out after 5s — submission was still saved')
    } else {
      console.error('notify error:', err)
    }
  } finally {
    clearTimeout(timer)
  }
}
