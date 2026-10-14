/**
 * Who may see the hidden /admin dashboard. Controlled by the ADMIN_EMAILS
 * environment variable (comma-separated), so admins can be added or removed
 * without a code change. Matching is case-insensitive and trims whitespace.
 *
 * The check is used server-side only, against the email on the verified Supabase
 * session (never anything from the request body), and a non-match renders a
 * plain 404 — so the page is invisible to everyone who isn't on the list.
 */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}
