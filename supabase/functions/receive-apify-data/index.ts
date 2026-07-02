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

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const EXTRACTION_TOOL = {
  name: 'save_opportunity',
  description: 'Save the structured funding opportunity extracted from the raw text.',
  input_schema: {
    type: 'object',
    properties: {
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
    required: ['name', 'description'],
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
          content: `Extract the funding opportunity details from this raw scraped text. Only include fields that are actually present in the text — do not invent values.\n\n${rawText}`,
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

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    })
  }

  try {
    const payload = await req.json()

    // Accept { text, sourceUrl } or Apify's default webhook shape.
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

    const fields = await extractFields(rawText)

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

      if (existing) {
        return new Response(
          JSON.stringify({ success: true, deduplicated: true, id: existing.id }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }
    }

    const { data, error } = await supabase
      .from('opportunities')
      .insert({
        name: fields.name,
        funder: fields.funder ?? null,
        deadline: fields.deadline ?? null,
        amount: fields.amount ?? null,
        eligible_countries: fields.eligible_countries ?? [],
        cci_sector: fields.cci_sector ?? null,
        funding_type: fields.funding_type ?? null,
        deadline_type: fields.deadline_type ?? null,
        application_link: fields.application_link ?? null,
        description: fields.description,
        source_url: normalizedUrl,
        raw_text: rawText,
        source: 'apify',
      })
      .select()
      .single()

    if (error) {
      // Unique-constraint race (two webhooks for the same URL landing at once):
      // treat as a successful dedup rather than an error.
      if (error.code === '23505') {
        return new Response(
          JSON.stringify({ success: true, deduplicated: true }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }
      throw new Error(`Insert failed: ${error.message}`)
    }

    return new Response(JSON.stringify({ success: true, deduplicated: false, opportunity: data }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    console.error('receive-apify-data error:', err)
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    )
  }
})
