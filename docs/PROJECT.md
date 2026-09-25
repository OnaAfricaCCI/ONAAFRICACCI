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

- `opportunities` — grants. ~142 rows. Sources: `spreadsheet`, `consolidated`, `apify`. `amount` is free text (parse with `lib/amount.ts`). `link_state` (`ok`/`unverified`/`dead`), `link_fail_streak`, `link_ok`, `link_status`, `link_checked_at` set by check-links; the homepage only features `link_ok = true`, and `/grants` flags only `dead`. `institution_id` → funders.
- `funders` — **the single institutions layer** (~140). `roles` = `{funder}`, `{builder}` or both. `slug` for URLs. Profile fields: `what_they_fund`, `how_to_apply`, `deadline_notes`, `notable_grantees`, `grants_page_url`, `last_verified`, `source_url`, `institution_type`.
- `builder_mechanisms` — the **Ecosystem layer** (45): investors, DFIs, corporate capital, government mechanisms. Derived filter fields: `economic_roles` (4 buckets: Capital & investment / Market access & trade / Skills & enterprise growth / Policy & industry infrastructure), `access_model` (Open to applications / By relationship or introduction / Programme-based). DB constraints enforce these vocabularies.
- `link_candidates` — proposed replacements for dead links, awaiting human approval. Private (RLS, no public policy).
- `subscribers`, `contact_messages`, `opportunity_submissions`, `posts` — private (RLS, no public policy); posts readable when published.
- Migrations: `supabase/migrations/`. Import scripts (idempotent, dry-run by default): `scripts/import_ecosystem.py`, `import_grants.py`, `enrich_and_dedupe.py`, `add_shared_link_grants.py`. Institution resolution table: `scripts/institution-map.json`.

## Rules that must hold

- **Never show a blank record.** `lib/quality.ts` — grants and institutions need name + description, mechanisms need name + what_it_provides. Applied in every query and page.
- **Never feature a dead link.** Homepage carousel filters `link_ok = true`.
- **Blank stays blank.** Don't invent data. Descriptions are composed from source fields, not written.
- **Grants end in "Apply"; Ecosystem records end in "Learn more" / "How to engage".** Never a fake Apply.
- Two co-equal layers: Grants & Opportunities (applyable) and Ecosystem (structural). Same nav level, parallel copy.

## Design

**Ona Funds brand system** (guidelines v1.3, Sept 2026; tokens in `app/globals.css`).

- **Colour.** Ink `#121412`, Ivory `#F6F4EC`, Ona Coral `#FF6A4D`, Coral Deep `#D6432A`, Blush `#FFC9B8`, Sage Deep `#5F7359`, Sage `#8FA487`, Sage Mist `#DCE3D5`, Graphite `#4A5249`. Proportion: Ivory 50 / Ink 28 / Sage 14 / Coral 8. **Coral appears once per view.** Coral text under 24px on ivory must be Coral Deep, which is why `--terracotta` maps there.
- **Type.** Outfit 800 for display at −3.5% tracking, sentence case. Source Sans 3 for body, UI and figures, tabular numerals on amounts and dates. Labels 12px / weight 900 / uppercase (`.label`).
- **Shape.** Radius 0 everywhere. No soft shadows. Card hover is a hard offset shadow `6px 6px 0` coral (`.card-ona`). The only circles are the logo and the motif rings.
- **The mark.** `app/components/Logo.tsx`, drawn as SVG geometry, never set in a typeface: three 100-unit circles, 20-unit gaps, 22-unit stroke, and **only the "o" carries colour**. Tones for ink / ivory / coral / sage surfaces are built in. The symbol alone is `app/icon.svg`, the favicon. Never "ONA", never a pupil, never stretched.
- **The motif.** `app/components/Motif.tsx`: The Find, Sightline, Aperture, all built from the logo ring at the same 22% stroke ratio. **One expression per page**, never behind body text, never The Find and Aperture together. Home: The Find + Aperture per section. Grants: The Find as a band. Funders and About: Aperture. Blog and Contact: The Find. Privacy: none.
  - Ring centres fall on a 28px grid at 14, 42, 70… **A coral ring placed off that grid reads as a blob, not a ring.** This has been got wrong twice.
  - A horizontal rule with a single ring on it looks like a slider and invites dragging. Don't build one.
- **Dark mode** swaps ink and ivory rather than inventing a second palette. Header and footer stay ink in both themes, so their contents use fixed colours, not tokens.
- **Copy rules from the voice guide:** no em dashes in anything a visitor reads, "Ona Funds" on first mention then "Ona", a middle dot in page titles, currency before the figure, "up to" preserved, ranges written "X to Y".

## Copy

Final copy for every page was supplied by David (Sept 2026) and is in the components. Tone: plain, human, first person plural. "Cultural and creative industries" = who we serve; "creative economy" = what we make legible. Don't claim things are "structured by AI".

## Status (25 Sept 2026)

- Live on onafunds.com, on the Ona Funds brand system.
- **Scheduled jobs are running.** `check-links` daily at 03:00 UTC, `weekly-digest` Mondays 09:00 UTC. First unattended run confirmed 25 Sept. `supabase/config.toml` pins `verify_jwt = false` for both, because pg_cron sends no JWT and a deploy without it silently 401s every night.
- **Link health is three-state**, not boolean: `link_state` is `ok` / `unverified` / `dead`, with `link_fail_streak` and a two-strikes rule. Timeouts, DNS failures and bot-blocks are `unverified` and are never flagged to visitors, because they are evidence about our access, not about the page.
- Link re-discovery built: `scripts/rediscover_links.py` finds replacements for dead links, `scripts/review_links.py --go` is the human gate, `link_candidates` is the queue. 16 links repaired this way.
- Content verification built: `scripts/verify_content.py` reads each grant's page and reports where our details no longer match the funder's. It writes nothing.
- Ecosystem work: Stages 1–2 done. **Stages 3–5 not built.**

## Roadmap David asked to be reminded of (after analytics + user testing)

1. Enrichment pipeline — Claude extracts structured summary, eligibility criteria, how-to-apply from each grant's source page.
2. Grant detail pages `/grants/[slug]` with "who can apply" checklist and "remind me before the deadline".
3. Eligibility self-check (graded answers, never a hard "no").
Also pending: Ecosystem Stages 3–5; Resend domain verification; `amount_value` numeric column; Supabase Pro for backups; 2FA on Vercel/Supabase/Namecheap/Google; automated tests (there are none); server-rendering `/grants` for search and mobile weight.

## Sources the crawler cannot read, to check by hand

Grants live on foundation websites, which are plain and static. **Finance lives on bank websites, which are JavaScript applications behind bot protection.** The ingestion pipeline will systematically under-collect the finance and investment category unless someone checks these directly.

Claude's browser renders JavaScript, so it *can* read these even though Apify cannot. Ask it to open the page and extract the details rather than feeding the URL to the crawler.

| Source | Why the crawler fails | Check every |
|---|---|---|
| **iDICE** `idice.ng/opportunities` | Returns 101 characters of text. Entirely JavaScript-rendered. | **2 months.** Highest value on this list. Carries open, closed and upcoming programmes side by side. Founders Lab Cohort 3 and the Startup Bridge Growth Lab are both coming. Applications run through `idice.boi.ng`. |
| **afreximbank.com** | Returns 403 to any automated request. | Use `cms.canex.africa` instead, which is the same content and readable. |
| **fedagroup.org** (FEDA) | Returns 403. | Via CANEX pages. |
| **canex.africa/africa-film-form** | 17 characters. JavaScript-rendered. | With the Film Fund below. |

**Africa Film Fund — watch, do not list.** Afreximbank via FEDA, "up to US$1 billion", announced May 2025. Its own page says "Further details, including investment parameters and application guidelines, will be shared in due course." Listing it now would put a billion-dollar headline against something nobody can apply to. Source: `https://cms.canex.africa/africa-film-fund/`

**Two accuracy rules for this category.** A facility size is not money disbursed: CANEX's US$2 billion is lending capacity for 2024 to 2027. And "up to" is a ceiling, so it must survive into the listing.
