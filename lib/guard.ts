import { NextResponse } from 'next/server'

/**
 * Shared protection for the public form endpoints.
 *
 *  - Honeypot: a hidden field humans never see; bots fill it in. Respond as
 *    if successful so the bot learns nothing, but write nothing.
 *  - Rate limit: at most N requests per IP per window. Held in memory, so on
 *    serverless it's per-instance and best-effort — enough to blunt a naive
 *    flood. For hard guarantees, enable Vercel's Firewall as well.
 *  - Size cap: reject oversized bodies before parsing them.
 */

const WINDOW_MS = 10 * 60 * 1000
const buckets = new Map<string, number[]>()

export function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

export function rateLimited(req: Request, limit: number): boolean {
  const key = clientIp(req)
  const now = Date.now()
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  buckets.set(key, recent)
  // keep the map from growing without bound
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.every((t) => now - t >= WINDOW_MS)) buckets.delete(k)
  }
  return recent.length > limit
}

export const tooMany = () =>
  NextResponse.json({ error: 'Too many requests. Please try again in a few minutes.' }, { status: 429 })

export const tooLarge = () =>
  NextResponse.json({ error: 'That submission is too large.' }, { status: 413 })

/** Parse JSON with a hard size limit (bytes). */
export async function readJson(req: Request, maxBytes = 20_000): Promise<Record<string, unknown> | null> {
  const len = Number(req.headers.get('content-length') ?? 0)
  if (len > maxBytes) return null
  const text = await req.text()
  if (text.length > maxBytes) return null
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

/** True when the honeypot field was filled — i.e. a bot. */
export function isBot(body: Record<string, unknown>): boolean {
  return typeof body.company === 'string' && body.company.trim() !== ''
}
