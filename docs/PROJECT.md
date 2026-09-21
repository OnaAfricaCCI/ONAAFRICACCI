# Ona — project brief

Read this first. It is the context a new session needs; the code is the source of truth for details.

**What it is:** a public record of funding for Africa's cultural and creative industries (CCI) — grants, prizes, residencies, fellowships — plus the institutions behind them. Live at **https://onafunds.com** (aliases: onafunds.org, www, and ona-africa-cci.vercel.app redirect to it). Owner: David Amira, Nairobi, non-technical builder — explain in plain language, propose before changing, confirm before anything destructive or schema-changing.

## Stack

- **Next.js 16 (App Router), TypeScript, Tailwind v4.** Read `node_modules/next/dist/docs/` before writing Next code — this version differs from training data.
- **Supabase** (Postgres, EU) project `fperytyukppkkjjfkwgl`. Public read via RLS on content tables; all writes server-side with the service-role key.
- **Supabase Edge Functions** (Deno) in `supabase/functions/`: `receive-apify-data` (scraper → Claude Haiku extraction → insert), `check-links` (daily link health), `weekly-digest` (Resend email + 24-month retention sweep). All three require header `x-digest-secret`.
- **Vercel** hosting, deployed from this machine with `npx vercel --prod --yes` (no Git integration yet). Preview: `npx vercel --yes`.
- **PostHog** analytics (cookieless, EU), key-gated on `NEXT_PUBLIC_POSTHOG_KEY`. **Google Search Console** verified via meta tag.
- **Apify** Website Content Crawler → webhook → `receive-apify-data`.

## Secrets (names only — values live in `.env.local`, never in git)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DIGEST_SECRET`, `NEXT_PUBLIC_SITE_URL`, optionally `NEXT_PUBLIC_POSTHOG_KEY`. Supabase-side secrets: `ANTHROPIC_API_KEY`, `APIFY_TOKEN`, `RESEND_API_KEY`, `DIGEST_FROM`, `SITE_URL`, `DIGEST_SECRET`. To work on a new machine, copy `.env.local` over privately (password manager / AirDrop), then `npm install`, `npx vercel link`, `npx supabase link --project-ref fperytyukppkkjjfkwgl`.

## Data model (Supabase)

- `opportunities` — grants. ~142 rows. Sources: `spreadsheet`, `consolidated`, `apify`. `amount` is free text (parse with `lib/amount.ts`). `link_ok/link_status/link_checked_at` set by check-links; the homepage only features `link_ok = true`. `institution_id` → funders.
- `funders` — **the single institutions layer** (~140). `roles` = `{funder}`, `{builder}` or both. `slug` for URLs. Profile fields: `what_they_fund`, `how_to_apply`, `deadline_notes`, `notable_grantees`, `grants_page_url`, `last_verified`, `source_url`, `institution_type`.
- `builder_mechanisms` — the **Ecosystem layer** (45): investors, DFIs, corporate capital, government mechanisms. Derived filter fields: `economic_roles` (4 buckets: Capital & investment / Market access & trade / Skills & enterprise growth / Policy & industry infrastructure), `access_model` (Open to applications / By relationship or introduction / Programme-based). DB constraints enforce these vocabularies.
- `subscribers`, `contact_messages`, `opportunity_submissions`, `posts` — private (RLS, no public policy); posts readable when published.
- Migrations: `supabase/migrations/`. Import scripts (idempotent, dry-run by default): `scripts/import_ecosystem.py`, `import_grants.py`, `enrich_and_dedupe.py`, `add_shared_link_grants.py`. Institution resolution table: `scripts/institution-map.json`.

## Rules that must hold

- **Never show a blank record.** `lib/quality.ts` — grants and institutions need name + description, mechanisms need name + what_it_provides. Applied in every query and page.
- **Never feature a dead link.** Homepage carousel filters `link_ok = true`.
- **Blank stays blank.** Don't invent data. Descriptions are composed from source fields, not written.
- **Grants end in "Apply"; Ecosystem records end in "Learn more" / "How to engage".** Never a fake Apply.
- Two co-equal layers: Grants & Opportunities (applyable) and Ecosystem (structural). Same nav level, parallel copy.

## Design

**VoiceBox** system (`docs/` has none — spec was supplied in chat; tokens are in `app/globals.css`): black `#0A0A0A` on off-white `#FAFAFA`, one red `#EF4444`. Archivo Black display, Work Sans body, Space Mono mono. Sharp 0px corners, flat, 2px borders. **Dark mode** = inverted tokens; toggle in header, `data-theme` on `<html>`, no-flash init script. **Every link and button turns red on hover** (David's override of the one-red rule; resting state still uses red sparingly: active nav rule, urgency flags, pull quote, email box top rule, errors). Legacy token names (`--paper`, `--terracotta`, `--forest`, `--ochre`…) are aliases in globals.css — don't reintroduce colours.

## Copy

Final copy for every page was supplied by David (Sept 2026) and is in the components. Tone: plain, human, first person plural. "Cultural and creative industries" = who we serve; "creative economy" = what we make legible. Don't claim things are "structured by AI".

## Status (22 Sept 2026)

- Live on onafunds.com. Redesign, dark mode, analytics (awaiting PostHog key), SEO (sitemap 147 URLs, JSON-LD, per-page metadata), security (CSP + headers, rate limits, honeypots, guarded endpoints, Next 16.3.5 / 0 vulns), privacy policy at `/privacy` (controller name + privacy email still placeholders).
- Ecosystem work: Stages 1–2 done (schema, 45 mechanisms, 140 institutions linked). **Stage 3 (`/ecosystem` route), Stage 4 (shared profiles at `/institutions/[slug]`, fold Funders in), Stage 5 (copy) not built.**
- Branches: `main` (deployed), `feature/ecosystem`, `design/voicebox` — both merged into main.

## Roadmap David asked to be reminded of (after analytics + user testing)

1. Enrichment pipeline — Claude extracts structured summary, eligibility criteria, how-to-apply from each grant's source page.
2. Grant detail pages `/grants/[slug]` with "who can apply" checklist and "remind me before the deadline".
3. Eligibility self-check (graded answers, never a hard "no").
Also pending: Ecosystem Stages 3–5; Resend domain verification for `digest@onafunds.com`; cron jobs for `check-links` (daily) and `weekly-digest` (Mondays); 47 dead grant links to fix; `amount_value` numeric column; PostHog key; Supabase Pro for backups; 2FA on Vercel/Supabase/Namecheap/Google.
