/**
 * Safe "return here after sign-in" handling.
 *
 * A return path travels through the magic-link email and back, so it is
 * attacker-influenceable. If we redirected to it blindly, a crafted link could
 * bounce a freshly-signed-in user to another site (an open redirect) or to a
 * javascript:/data: URI. So we accept ONLY a same-site, same-origin path:
 *
 *   - must be a string starting with a single "/"
 *   - must NOT start with "//" or an encoded slash (protocol-relative → host)
 *   - must NOT contain control characters, backslashes or whitespace
 *   - must parse, against our own origin, back to that same origin, unchanged
 *
 * Anything else falls back to `fallback` (default "/").
 */
const DEFAULT_FALLBACK = '/'

// Control chars (0x00-0x20 incl. space/tab/newline), 0x7f, or a backslash.
const UNSAFE = /[\x00-\x20\x7f\\]/

export function safeNext(next: unknown, fallback: string = DEFAULT_FALLBACK): string {
  if (typeof next !== 'string' || next.length === 0 || next.length > 512) return fallback

  // Must be root-relative.
  if (!next.startsWith('/')) return fallback
  // Protocol-relative or encoded-slash tricks → another host.
  const lower = next.toLowerCase()
  if (next.startsWith('//') || lower.startsWith('/%2f') || lower.startsWith('/%5c')) return fallback
  // No control chars, whitespace or backslashes anywhere.
  if (UNSAFE.test(next)) return fallback

  // Final proof: resolved against a fixed origin it must stay on that origin,
  // and the resolved path must still equal what we were given (no normalisation
  // games that climb out).
  try {
    const base = 'https://ona.internal'
    const url = new URL(next, base)
    if (url.origin !== base) return fallback
    const rebuilt = `${url.pathname}${url.search}${url.hash}`
    if (rebuilt !== next) return fallback
  } catch {
    return fallback
  }
  return next
}
