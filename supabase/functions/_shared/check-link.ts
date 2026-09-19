// Shared by check-links (scheduled sweep) and receive-apify-data (at ingest).
//
// Classification — lenient about bot-blocking, strict about missing pages:
//   2xx / 3xx           -> ok
//   403 (after GET)     -> ok   (site is up; it just refuses automated checks)
//   404 / 410           -> dead
//   other 4xx / 5xx     -> dead
//   timeout / DNS / TLS -> dead (rechecked next sweep; recovers automatically)

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 OnaLinkCheck/1.0'
const TIMEOUT_MS = 12_000

export type LinkResult = { ok: boolean; status: number | null; error: string | null }

async function fetchWithTimeout(url: string, method: 'HEAD' | 'GET'): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, {
      method,
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        'accept-language': 'en',
      },
    })
  } finally {
    clearTimeout(t)
  }
}

export async function checkLink(url: string): Promise<LinkResult> {
  let parsed: URL
  try {
    parsed = new URL(url)
    if (!/^https?:$/.test(parsed.protocol)) throw new Error('not http')
  } catch {
    return { ok: false, status: null, error: 'invalid url' }
  }

  // HEAD first (cheap); many servers reject it, so fall back to GET.
  let status: number | null = null
  try {
    const head = await fetchWithTimeout(parsed.toString(), 'HEAD')
    status = head.status
    if (status < 400) return { ok: true, status, error: null }
  } catch {
    /* fall through to GET */
  }

  try {
    const get = await fetchWithTimeout(parsed.toString(), 'GET')
    status = get.status
    try { await get.body?.cancel() } catch { /* ignore */ }

    if (status < 400) return { ok: true, status, error: null }
    if (status === 403) return { ok: true, status, error: 'blocks automated checks' }
    return { ok: false, status, error: `http ${status}` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, status, error: /abort/i.test(msg) ? 'timeout' : msg.slice(0, 120) }
  }
}
