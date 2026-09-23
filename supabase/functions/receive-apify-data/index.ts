// Supabase Edge Function: receive-apify-data
//
// Receives raw scraped text from an Apify webhook, uses Claude Haiku to
// extract structured funding-opportunity fields, and inserts the result
// into `opportunities`. Deduplicates on source URL — the same URL never
// creates two records.
//
// Required secrets (set via `supabase secrets set`):
//   ANTHROPIC_API_KEY  - Anthropic API key
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { checkLink } from '../_shared/check-link.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DIGEST_SECRET = Deno.env.get('DIGEST_SECRET')

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const EXTRACTION_TOOL = {
  name: 'save_opportunity',
  description: 'Save the structured funding opportunity extracted from the raw text.',
  input_schema: {
    type: 'object',
    properties: {
      is_opportunity: {
        type: 'boolean',
        description:
          'true ONLY if the text describes one specific, currently-applicable funding opportunity (a grant, prize, fellowship, residency, open call, etc.) with its own terms. false for: directories or lists of many opportunities, general articles or news, funder "about" pages, navigation/landing pages, and anything that is not itself an opportunity to apply for.',
      },
      name: { type: 'string', description: 'Name/title of the funding opportunity' },
      funder: { type: 'string', description: 'Organization providing the funding' },
      deadline: { type: 'string', description: 'Application deadline, ISO 8601 date (YYYY-MM-DD) if possible' },
      amount: { type: 'string', description: 'Funding amount or range, including currency' },
      eligible_countries: {
        type: 'array',
        items: { type: 'string' },
        description: 'Countries or regions eligible to apply',
      },
      cci_sector: {
        type: 'string',
        description:
          'Cultural and Creative Industries sector, e.g. music, film, visual arts, performing arts, design, fashion, gaming, publishing, heritage, crafts, or multi-sector',
      },
      funding_type: {
        type: 'string',
        enum: ['grant', 'prize', 'fellowship', 'residency', 'loan', 'investment', 'scholarship', 'in-kind', 'other'],
        description: 'Type of funding offered',
      },
      deadline_type: {
        type: 'string',
        enum: ['fixed', 'rolling', 'recurring', 'unknown'],
        description:
          'fixed = single hard deadline; rolling = applications accepted continuously; recurring = repeats in regular cycles/rounds; unknown = not stated',
      },
      application_link: { type: 'string', description: 'URL to apply or read more' },
      description: { type: 'string', description: 'Concise summary of the opportunity (2-4 sentences)' },
    },
    required: ['is_opportunity', 'name', 'description'],
  },
} as const

async function extractFields(rawText: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: 'tool', name: 'save_opportunity' },
      messages: [
        {
          role: 'user',
          content: `Extract the funding opportunity details from this raw scraped text. Only include fields that are actually present in the text — do not invent values. First judge is_opportunity strictly: pages that merely LIST or LINK TO many opportunities (directories, databases, aggregators, category pages) are NOT opportunities themselves.\n\n${rawText}`,
        },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${body}`)
  }

  const data = await res.json()
  const toolUse = data.content.find((block: { type: string }) => block.type === 'tool_use')
  if (!toolUse) throw new Error('No tool_use block in Claude response')
  return toolUse.input
}

/** Normalize a URL so trivial variations don't defeat deduplication. */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim())
    u.hash = ''
    // Strip common tracking params
    for (const p of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid']) {
      u.searchParams.delete(p)
    }
    let s = u.toString()
    if (s.endsWith('/')) s = s.slice(0, -1)
    return s.toLowerCase()
  } catch {
    return url.trim().toLowerCase()
  }
}

type ProcessResult =
  | { status: 'inserted'; id: string }
  | { status: 'deduplicated'; id?: string }
  | { status: 'rejected' }
  | { status: 'error'; error: string }

/** Extract fields from one piece of raw text and insert it (dedup-aware). */
async function processOne(rawText: string, payloadUrl?: string): Promise<ProcessResult> {
  try {
    const fields = await extractFields(rawText)

    // Not an actual funding opportunity (directory page, article, etc.)
    if (fields.is_opportunity === false) return { status: 'rejected' }

    // Dedup key: prefer the URL the scraper gives us, fall back to the
    // extracted application link.
    const sourceUrl = payloadUrl ?? fields.application_link
    const normalizedUrl = sourceUrl ? normalizeUrl(sourceUrl) : null

    if (normalizedUrl) {
      const { data: existing, error: lookupError } = await supabase
        .from('opportunities')
        .select('id')
        .eq('source_url', normalizedUrl)
        .maybeSingle()

      if (lookupError) throw new Error(`Dedup lookup failed: ${lookupError.message}`)
      if (existing) return { status: 'deduplicated', id: existing.id }
    }

    // Verify the link before it can be featured anywhere. Same rules as the
    // scheduled check-links function.
    const link = fields.application_link?.trim() || null
    const linkCheck = link ? await checkLink(link) : null

    const baseRow = {
      name: fields.name,
      funder: fields.funder ?? null,
      deadline: fields.deadline ?? null,
      amount: fields.amount ?? null,
      eligible_countries: fields.eligible_countries ?? [],
      cci_sector: fields.cci_sector ?? null,
      funding_type: fields.funding_type ?? null,
      deadline_type: fields.deadline_type ?? null,
      application_link: link,
      description: fields.description,
      source_url: normalizedUrl,
      raw_text: rawText,
      source: 'apify',
    }
    /*
     * A brand-new grant is never condemned on first sight. One check is one
     * opinion: if it doesn't answer, the grant arrives 'unverified' with a
     * strike against it, and the nightly sweep decides. The only thing that
     * matters immediately is that nothing unverified reaches the homepage,
     * which link_ok already guarantees.
     */
    const linkColumns = {
      link_state: linkCheck ? (linkCheck.verdict === 'ok' ? 'ok' : 'unverified') : 'unverified',
      link_fail_streak: linkCheck && linkCheck.verdict !== 'ok' ? 1 : 0,
      link_ok: linkCheck?.ok ?? null,
      link_status: linkCheck?.status ?? null,
      link_error: linkCheck?.error ?? null,
      link_checked_at: linkCheck ? new Date().toISOString() : null,
    }

    let { data, error } = await supabase
      .from('opportunities')
      .insert({ ...baseRow, ...linkColumns })
      .select('id')
      .single()

    // If the link_* columns haven't been added to the table yet, insert
    // without them rather than losing the grant.
    if (error?.code === '42703' || error?.code === 'PGRST204') {
      ;({ data, error } = await supabase
        .from('opportunities')
        .insert(baseRow)
        .select('id')
        .single())
    }

    if (error) {
      // Unique-constraint race (two webhooks for the same URL landing at once):
      // treat as a successful dedup rather than an error.
      if (error.code === '23505') return { status: 'deduplicated' }
      throw new Error(`Insert failed: ${error.message}`)
    }

    return { status: 'inserted', id: data.id }
  } catch (err) {
    return { status: 'error', error: err instanceof Error ? err.message : String(err) }
  }
}

/** Pull usable text out of one Apify dataset item, whatever the actor's shape. */
function itemText(item: Record<string, unknown>): string | undefined {
  for (const key of ['text', 'pageText', 'markdown', 'content', 'body', 'description']) {
    const v = item[key]
    if (typeof v === 'string' && v.trim().length > 50) return v
  }
  return undefined
}

Deno.serve(async (req) => {
  // Shared-secret guard: the public anon key is visible to every visitor, so it
  // must not be enough to trigger AI extraction and inserts. Apify sends this
  // header; nothing else should.
  if (DIGEST_SECRET && req.headers.get('x-digest-secret') !== DIGEST_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    })
  }

  try {
    const payload = await req.json()

    // Mode 1: Apify "run succeeded" webhook — fetch the run's results
    // from Apify storage, then process each scraped page.
    const datasetId: string | undefined = payload.resource?.defaultDatasetId
    if (datasetId) {
      const apifyToken = Deno.env.get('APIFY_TOKEN')
      if (!apifyToken) throw new Error('APIFY_TOKEN secret is not set')

      const itemsRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json&limit=500`,
        { headers: { authorization: `Bearer ${apifyToken}` } },
      )
      if (!itemsRes.ok) throw new Error(`Apify API error ${itemsRes.status}: ${await itemsRes.text()}`)

      const items: Record<string, unknown>[] = await itemsRes.json()
      const summary = { inserted: 0, deduplicated: 0, rejected: 0, skipped: 0, errors: [] as string[] }

      for (const item of items) {
        const text = itemText(item)
        if (!text) {
          summary.skipped++
          continue
        }
        const url = typeof item.url === 'string' ? item.url : undefined
        const result = await processOne(text, url)
        if (result.status === 'inserted') summary.inserted++
        else if (result.status === 'deduplicated') summary.deduplicated++
        else if (result.status === 'rejected') summary.rejected++
        else summary.errors.push(result.error)
      }

      console.log('apify run processed:', JSON.stringify(summary))
      return new Response(JSON.stringify({ success: true, mode: 'apify-run', ...summary }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    // Mode 2: direct { text, sourceUrl } payload (testing, manual submissions).
    const rawText: string | undefined =
      payload.text ?? payload.rawText ?? payload.resource?.text
    const payloadUrl: string | undefined =
      payload.sourceUrl ?? payload.url ?? payload.resource?.url

    if (!rawText || typeof rawText !== 'string' || rawText.trim() === '') {
      return new Response(JSON.stringify({ error: 'Missing "text" field in payload' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }

    const result = await processOne(rawText, payloadUrl)
    if (result.status === 'error') throw new Error(result.error)
    if (result.status === 'rejected') {
      return new Response(
        JSON.stringify({ success: true, rejected: true, reason: 'Not a funding opportunity' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ success: true, deduplicated: result.status === 'deduplicated', id: result.id }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )
  } catch (err) {
    console.error('receive-apify-data error:', err)
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    )
  }
})
