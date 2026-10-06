/**
 * The "Your Ona Funds profile is ready" email body (HTML + plain text).
 *
 * Kept separate from the sender (lib/profileEmail.ts) so it can be rendered and
 * previewed offline without loading the service-role client or any secret.
 * Carries no profile answers and no tokens: confirmation + links only.
 */
import { SITE_URL } from './site'

export const PROFILE_EMAIL_CONTACT = 'hello@onafunds.com'
export const PROFILE_EMAIL_SUBJECT = 'Your Ona Funds profile is ready'

export function renderConfirmationEmail() {
  const rec = `${SITE_URL}/recommendations`
  const saved = `${SITE_URL}/saved`
  const settings = `${SITE_URL}/profile`
  const privacy = `${SITE_URL}/privacy`
  const contact = PROFILE_EMAIL_CONTACT

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
    `Questions or data requests: ${contact}`,
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
      <a href="mailto:${contact}" style="color:#4a5249;">${contact}</a>.
    </p>
  </div></body></html>`

  return { text, html }
}
