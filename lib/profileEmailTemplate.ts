/**
 * The "Your Ona Funds profile is ready" email body (HTML + plain text), styled
 * to the Claude Design spec: ink header, "Profile created" eyebrow, a sage-mist
 * reassurance note, stacked ink-separated buttons, ink footer.
 *
 * Kept separate from the sender (lib/profileEmail.ts) so it can be rendered and
 * previewed offline without loading the service-role client or any secret. No
 * SVG (email clients strip it), no webfonts assumed, no profile answers, no
 * tokens — confirmation and links only.
 */
import { SITE_URL } from './site'

export const PROFILE_EMAIL_CONTACT = 'hello@onafunds.com'
export const PROFILE_EMAIL_SUBJECT = 'Your Ona Funds profile is ready'

const DISPLAY = "'Outfit', 'Trebuchet MS', Helvetica, Arial, sans-serif"
const BODY = "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

export function renderConfirmationEmail() {
  const rec = `${SITE_URL}/recommendations`
  const saved = `${SITE_URL}/saved`
  const settings = `${SITE_URL}/profile`
  const privacy = `${SITE_URL}/privacy`
  const contact = PROFILE_EMAIL_CONTACT

  const text = [
    'Your profile is ready.',
    '',
    'Thanks for setting up My Funding on Ona Funds. We will use your preferences to surface grants, prizes, residencies and fellowships that fit your work.',
    '',
    'A quick note: this is not a funding application. Your profile is private, it is never shown to funders, and it only helps us match opportunities to you.',
    '',
    `Explore opportunities for me:  ${rec}`,
    `View my saved opportunities:   ${saved}`,
    `Profile settings:              ${settings}`,
    '',
    `You can edit or delete your profile anytime in settings. Privacy notice: ${privacy}`,
    `Questions or a data request: ${contact}`,
    '',
    'Ona Funds · Funding for Africa’s creative and cultural industries · onafunds.com',
    'You received this because you created a profile. This is a one-time confirmation, not marketing.',
  ].join('\n')

  const btn = (href: string, label: string, bg: string, color: string) =>
    `<a href="${href}" style="display:block;background:${bg};color:${color};text-decoration:none;font-family:${BODY};font-weight:700;font-size:15px;padding:14px 18px;">${label}</a>`

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#DCE3D5;font-family:${BODY};color:#121412;">
  <div style="max-width:560px;margin:0 auto;background:#F6F4EC;border:1px solid #121412;">
    <div style="background:#121412;padding:22px 28px;">
      <span style="font-family:${DISPLAY};font-weight:800;letter-spacing:-0.02em;font-size:20px;color:#F6F4EC;">
        <span style="color:#FF6A4D;">&#9679;</span>na funds
      </span>
    </div>
    <div style="padding:32px 28px;">
      <p style="margin:0 0 16px;font-size:12px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#5F7359;">Profile created</p>
      <h1 style="margin:0 0 18px;font-family:${DISPLAY};font-weight:800;letter-spacing:-0.035em;font-size:32px;line-height:1.02;color:#121412;">Your profile is ready.</h1>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#121412;">Thanks for setting up My Funding on Ona Funds. We will use your preferences to surface grants, prizes, residencies and fellowships that fit your work.</p>
      <div style="background:#DCE3D5;padding:16px 18px;font-size:14px;line-height:1.6;color:#121412;margin:0 0 22px;">A quick note. This is not a funding application. Your profile is private, it is never shown to funders, and it only helps us match opportunities to you.</div>
      <div style="background:#121412;border:1px solid #121412;margin:0 0 20px;">
        ${btn(rec, 'Explore opportunities for me &rarr;', '#FF6A4D', '#121412')}
        <div style="height:1px;background:#121412;"></div>
        ${btn(saved, 'View my saved opportunities', '#F6F4EC', '#121412')}
        <div style="height:1px;background:#121412;"></div>
        ${btn(settings, 'Profile settings', '#F6F4EC', '#121412')}
      </div>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#4A5249;">You can edit or delete your profile anytime in settings. Read how we handle your data in our <a href="${privacy}" style="color:#4A5249;">privacy notice</a>. Questions or a data request? Email <a href="mailto:${contact}" style="color:#4A5249;">${contact}</a>.</p>
    </div>
    <div style="background:#121412;color:#8FA487;padding:20px 28px;font-size:12px;line-height:1.6;">Ona Funds &middot; Funding for Africa&rsquo;s creative and cultural industries &middot; onafunds.com<br>You received this because you created a profile. This is a one-time confirmation, not marketing.</div>
  </div></body></html>`

  return { text, html }
}
