# Grant-seeker profiles — implementation handover

Branch: **`feature/grant-seeker-profiles`** (not merged, not deployed, no
production data changed). Build passes, 20 logic tests pass, feature files lint
clean. DB/auth/email need the external configuration in the last section before
they work end-to-end.

## What was built

A free account + optional profile layer on top of the public site. Public
browsing, search, grant/funder detail and official application links stay open
to everyone — none of it requires an account.

- **Accounts** via Supabase Auth **email magic link** (passwordless; no auth
  existed before). Session kept fresh by `proxy.ts`.
- **Persistent saved opportunities** (a private shortlist), with a signed-out
  "save" that completes once after sign-in.
- **Short, resumable 3-step profile onboarding** + review screen.
- **Profile review/edit/delete** page (delete keeps account + saved).
- **Explainable, deterministic recommendations** ("relevant to your
  preferences", never "eligible").
- **One-time profile-ready confirmation email** (idempotent, non-blocking).
- **Privacy notice at collection**, analytics events with **no personal data**,
  and an internal **privacy-policy review draft**.

## Entry points (as specified)

- **A. "Find funding for me"** — in the header (`AccountMenu`), and a dedicated
  `/find-funding` page (benefit first; "Create my profile" / "Keep browsing";
  existing users sign in / open profile).
- **B. "Save"** — on every grant card (`GrantsExplorer`) and the grant detail
  page. Signed-in saves immediately; signed-out opens the dialog
  ("Keep this opportunity in your shortlist" / "Create an account to save
  opportunities and return to them across devices.") with a sign-in option; the
  pending save + return location travel through the magic link and the save
  completes once, with a confirmation toast. Profile setup is offered after, not
  required.
- **C. "Get more relevant opportunities"** — a quiet invitation near the grants
  filters; current filters are carried to setup as **suggested** answers the
  user must confirm (nothing is silently turned into a profile fact).
- **D.** On `/saved`, a dismissible "Help Ona find opportunities relevant to
  you." setup card when there's no profile (dismissal remembered).

No timed popups; official application links are never interrupted.

## Routes added

| Route | Type | Purpose |
|---|---|---|
| `/find-funding` | page | Entry point A |
| `/signin` | page | Magic-link sign-in for existing users |
| `/auth/callback` | route | Exchange code → session, complete pending save, safe redirect |
| `/auth/signout` | route (POST) | Sign out |
| `/profile/setup` | page | 3-step wizard + review (auth-gated) |
| `/profile` | page | Review / edit / delete profile, sign out |
| `/profile/ready` | page | Success screen |
| `/saved` | page | Saved opportunities |
| `/recommendations` | page | "Opportunities for you" |
| `/api/profile` | route | GET / POST (draft, complete) / DELETE |
| `/api/saved` | route | GET / POST (save) / DELETE (unsave) |

`proxy.ts` (Next 16's renamed middleware) refreshes the session on each request.

## Database migration

`supabase/migrations/20261006_grant_seeker_profiles.sql` — **additive, idempotent.**

- `grant_seeker_profiles` (one per user; draft/completed; answers; schema
  version; timestamps).
- `saved_opportunities` (user, opportunity, timestamp; **unique(user, opportunity)**
  prevents duplicate saves).
- `profile_confirmation_emails` (delivery state; **one row per user** = email
  idempotency).
- **RLS owner-only** on all three (`user_id = auth.uid()`); `authenticated` gets
  table grants, **`anon` gets nothing**; service role (server) bypasses for the
  confirmation send. No existing public permission widened; raw-research
  restrictions untouched.

## Key library modules

- `lib/supabase/server.ts`, `lib/supabase/browser.ts` — session-bound clients
  (`@supabase/ssr`, new dependency).
- `lib/returnUrl.ts` — `safeNext()` restricts post-auth redirects to same-site
  paths (open-redirect guard).
- `lib/profileTaxonomy.ts` — canonical disciplines mapped to the messy
  `cci_sector` text; support types = `funding_type` values; stage/languages are
  context-only (no opportunity data to match, so they don't drive recs).
- `lib/countries.ts` — global country list for residence; ISO→Ona-scope map.
- `lib/recommend.ts` — deterministic matching + explanations; contradiction vs
  unknown handling.
- `lib/profileValidation.ts` — server-side vocabulary validation.
- `lib/profileEmail.ts` — idempotent, non-blocking confirmation send.

## Email templates

In `lib/profileEmail.ts` (`templates()`): HTML + plain text, subject
"Your Ona Funds profile is ready", links to recommendations / saved / settings /
privacy + contact, states it's not an application and that the profile is
private, no profile answers, no tokens, no promo.

## Checks performed

- `npm run build` — **passes** (all new routes compile).
- `npm test` — **20/20 pure-logic tests pass**: return-URL open-redirect safety;
  recommendation rules (discipline+support required; location contradiction
  excludes; **missing nationality not inferred from residence**; unknown stays
  unknown; never "eligible"; empty results); taxonomy mapping; server-side
  validation (unknown values dropped, not guessed; minimum-complete rule).
- `npm run test:db` — DB/RLS integration suite **written** (owner isolation
  between two users, unauthenticated denial, duplicate-save prevention, draft
  resume, profile-delete-keeps-account-and-saved). **Skipped here** — needs a
  Supabase instance (no Docker in this environment). **To run end-to-end
  locally, see `docs/local-verification-runbook.md`:** `npm run verify:local`
  (DB + RLS), `npm run dev:local` (auth + UI against local Supabase, magic-link
  emails in Inbucket), `npm run email:preview` (confirmation email offline).
- `npm run lint` — the **new feature files are clean**. Pre-existing advisory
  `react-hooks` lint errors remain on untouched files (`MobileMenu.tsx`) and on
  the earlier pagination files; not introduced by this feature.

## Limitations / not in this release (by design)

- Email reminders, eligibility assessment, application tracking, funder access,
  change notifications — not built; not advertised as active.
- Stage and preferred languages are stored but **not** used in recommendations
  (no opportunity stage/language data). Documented in the UI and taxonomy.
- Recommendations read opportunities with the service role server-side (safe
  columns only); the `authenticated` role is intentionally not granted access to
  `opportunities`.

## External configuration required before it works end-to-end

1. **Apply the migration** to Supabase (the new tables + RLS). Review first
   (non-technical owner: this is additive, touches no existing data).
2. **Supabase Auth settings:**
   - Enable the **Email** provider (magic link / OTP).
   - Add **Redirect URLs** allow-list entries for `/auth/callback` on each
     origin used (production `https://onafunds.com/auth/callback`, any preview
     origin, and `http://localhost:3000/auth/callback` for local dev).
   - Set the Site URL appropriately.
   - **[Confirm]** authentication emails are sent from **"Ona Funds
     <hello@onafunds.com>"** — this needs the Resend domain verified and
     Supabase SMTP/sender configured; otherwise Supabase's default auth email is
     used.
3. **Resend domain verification** for `onafunds.com` (currently pending per
   `docs/PROJECT.md`), then set **`PROFILE_FROM="Ona Funds <hello@onafunds.com>"`**
   so the confirmation email sends from the right address. Until then it falls
   back to Resend's test sender, which only delivers to the Resend account
   owner. **Do not test by emailing real users** — use a test recipient or a
   local mail sink (`supabase start` includes Inbucket).
4. **Env vars** already present (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
   `NEXT_PUBLIC_SITE_URL`). New optional: `PROFILE_FROM`.
5. **PostHog:** confirm no user identification and session replay is off for
   `/signin`, `/profile*`, `/saved`, `/recommendations` (project setting).
6. **Privacy policy:** settle the open items in `docs/privacy-policy-draft.md`
   and have legal review before publishing any change. Do not launch publicly
   while sender config or material privacy decisions are unresolved.
