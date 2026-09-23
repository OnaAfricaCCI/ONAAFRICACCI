// Shared by check-links (scheduled sweep) and receive-apify-data (at ingest).
//
// The job here is to report what actually happened, not to reach a verdict.
// Deciding whether a link is dead needs more than one look — that judgement
// lives in check-links, which can see the history. This file only answers
// "what did the server do when we knocked?"
//
//   ok           2xx, 3xx, or 403 — the site is up (403 = it just refuses bots)
//   gone         404, 410, or DNS says no such host — a real, definite "no"
//   unreachable  timeout, refused connection, TLS failure, 5xx — no answer
//   blocked      401, 429 — an answer, but not about the page
//
// The distinction that matters: "gone" is evidence, "unreachable" and
// "blocked" are the absence of evidence. Large sites behind Cloudflare
// routinely refuse datacentre traffic, and reading that as death is how three
// healthy British Council funds came to be flagged broken.

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 OnaLinkCheck/1.0'
const TIMEOUT_MS = 12_000

export type LinkVerdict = 'ok' | 'gone' | 'unreachable' | 'blocked'

export type LinkResult = {
  verdict: LinkVerdict
  /** Kept for the existing link_ok column: true only for a confirmed 'ok'. */
  ok: boolean
  status: number | null
  error: string | null
}

/** Deno surfaces a failed name lookup inside the fetch TypeError message. */
function isDnsFailure(message: string): boolean {
  return /dns error|failed to lookup|name not resolved|nodename nor servname|getaddrinfo/i.test(
    message,
  )
}

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

function fromStatus(status: number): LinkResult {
  if (status < 400) return { verdict: 'ok', ok: true, status, error: null }
  if (status === 403) return { verdict: 'ok', ok: true, status, error: 'blocks automated checks' }
  if (status === 404 || status === 410) return { verdict: 'gone', ok: false, status, error: `http ${status}` }
  if (status === 401 || status === 429)
    return { verdict: 'blocked', ok: false, status, error: `http ${status} — refused our check` }
  return { verdict: 'unreachable', ok: false, status, error: `http ${status}` }
}

export async function checkLink(url: string): Promise<LinkResult> {
  let parsed: URL
  try {
    parsed = new URL(url)
    if (!/^https?:$/.test(parsed.protocol)) throw new Error('not http')
  } catch {
    // A malformed URL is the one case we can condemn on sight: no amount of
    // retrying will make it parse.
    return { verdict: 'gone', ok: false, status: null, error: 'invalid url' }
  }

  // HEAD first (cheap); many servers reject it, so fall back to GET.
  try {
    const head = await fetchWithTimeout(parsed.toString(), 'HEAD')
    if (head.status < 400) return { verdict: 'ok', ok: true, status: head.status, error: null }
  } catch {
    /* fall through to GET */
  }

  try {
    const get = await fetchWithTimeout(parsed.toString(), 'GET')
    try { await get.body?.cancel() } catch { /* ignore */ }
    return fromStatus(get.status)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/abort/i.test(msg)) {
      return { verdict: 'unreachable', ok: false, status: null, error: 'timeout' }
    }
    if (isDnsFailure(msg)) {
      return { verdict: 'gone', ok: false, status: null, error: 'no such host (DNS)' }
    }
    return { verdict: 'unreachable', ok: false, status: null, error: msg.slice(0, 120) }
  }
}
