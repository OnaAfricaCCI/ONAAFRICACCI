# Local end-to-end verification runbook — grant-seeker profiles

How to verify **DB + RLS, auth (magic link), and the confirmation email** on a
**local** Supabase stack. Nothing here touches the hosted project or production
data, and no email reaches a real person.

> This was prepared but **not executed** in the build environment (it has no
> Docker). Run it on a Mac with Docker. Everything is wired so it's mostly two
> commands.

## 0. Prerequisites (one-time)

- **Docker** running — Docker Desktop, or Colima (`brew install colima && colima start`).
- Supabase CLI is already a dev dependency (used via `npx supabase`).
- From the repo: `npm install` (if not already).

You do **not** need to log in or link anything for local work. Leave your
`.env.local` (production keys) as-is — the scripts below override the relevant
values in the shell, which takes precedence, without editing that file.

## 1. Verify the database + RLS (automated, ~1 command)

```bash
npm run verify:local
```

This starts the local Supabase containers, **applies the migration**
(`supabase db reset`), reads the local keys, and runs the integration tests.
Expect all of these to pass:

- Owner isolation — user B cannot read user A's profile (RLS).
- Unauthenticated access denied — anon can read nothing, inserts are rejected.
- **Duplicate save prevented** by the unique constraint.
- Draft edits persist and resume.
- **Deleting the profile keeps the account and the saved opportunities.**

When it finishes it prints the Studio / Inbucket / API URLs and leaves the stack
running for step 2.

## 2. Verify auth + the UI (manual click-through)

In a second terminal:

```bash
npm run dev:local
```

This points the app at local Supabase and prints the **Inbucket** URL (the local
mail sink, usually http://localhost:54324). Open http://localhost:3000, then:

1. **Account + magic link.** Go to **Find funding → Create my profile** (or any
   grant's **Save** while signed out). Enter an email. Open **Inbucket**, open
   the newest message, click the sign-in link. You land back on the page you
   started from, now signed in. (Confirms: auth, and the safe same-site return.)
2. **Pending save completes once.** Signed out, open a grant, click **Save** →
   the dialog ("Keep this opportunity in your shortlist") → enter email → click
   the Inbucket link. You return with a **"Saved to your shortlist"** toast, and
   `/saved` lists it exactly once. (Confirms: pending save survives auth and runs
   a single time.)
3. **Onboarding.** Walk the 3 steps. Try **Finish later**, then return to
   `/profile/setup` — it resumes with your draft. Reach **Review**, use a
   **Change** link, then **Save my profile** → `/profile/ready`.
4. **Recommendations.** `/recommendations` shows matches with plain reasons
   ("Matches your interest in …"), the "check the funder's requirements" caveat,
   and never the word "eligible". Empty results offer edit/browse.
5. **Delete.** On `/profile`, delete the profile. Confirm the account and
   `/saved` are untouched.
6. **Confirmation-email record.** Open **Studio** (http://localhost:54323) →
   table `profile_confirmation_emails`. After the FIRST completion there is one
   row for the user. With Resend unconfigured (the default here) its status is
   `failed` / `email-not-configured` — and crucially the **profile still saved**
   (delivery is independent). Editing the profile again does **not** add a row
   (idempotent / only-on-first-completion).

Stop the stack when done:

```bash
npx supabase stop
```

## 3. Verify the confirmation email body (offline, no stack needed)

```bash
npm run email:preview
```

Writes `confirmation-email.html` + `.txt` and prints the text. Open the HTML in a
browser to check the branded layout, the "not a funding application" and
"private" lines, the links, and that it contains **no profile answers and no
tokens**.

## 4. Actually sending the confirmation email locally (optional)

Our confirmation email goes through **Resend** (not Inbucket). To exercise a real
send without spamming anyone:

```bash
RESEND_API_KEY=... PROFILE_FROM="Ona Funds <onboarding@resend.dev>" npm run dev:local
```

Use a **test recipient you control** (with an unverified domain, Resend's test
mode only delivers to the Resend account owner). Complete a profile once and
check the row flips to `sent` with a `provider_message_id`. **Never send test
mail to real users.**

## Safety notes

- **Never run `supabase config push`.** The `[auth]`/`[inbucket]` blocks in
  `supabase/config.toml` are localhost-only; pushing them would break the hosted
  project's auth URLs. Production Auth is configured in the Supabase **dashboard**
  (Authentication → URL configuration) — see the handover.
- These scripts only ever talk to the **local** stack. They never read or write
  the hosted database.
- `confirmation-email.html/.txt` are git-ignored preview artifacts.

## What this does and doesn't prove

- **Proves locally:** the migration applies cleanly; RLS is owner-only; magic-link
  auth works; the pending-save-through-auth journey; onboarding draft/resume;
  recommendations; profile deletion semantics; the confirmation-email idempotency
  and non-blocking behaviour; the email body.
- **Still needs the hosted setup** before production (see
  `docs/grant-seeker-profiles-handover.md`): applying the migration to the hosted
  DB, Supabase dashboard Auth redirect URLs, Resend domain verification for
  `hello@onafunds.com`, and the PostHog replay/identify check.
