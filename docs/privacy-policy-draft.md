# Privacy policy — INTERNAL REVIEW DRAFT (do not publish as-is)

Status: **draft for operator/legal review.** This is NOT live. The public policy
at `/privacy` (`app/privacy/page.tsx`) is unchanged. Do not publish material
changes silently — settle the open items below first.

This draft covers the new **grant-seeker accounts, profiles and saved
opportunities** feature (branch `feature/grant-seeker-profiles`). It does not
invent legal identities, hosting regions, retention periods or compliance
claims — unknowns are marked **[OPERATOR TO CONFIRM]**.

---

## 1. Statements in the current policy that this feature makes INACCURATE

These must be corrected before (or at) launch:

1. **Section 3 "What we collect, and why" — "We collect information in three
   situations".** It is now four: digest, contact form, opportunity submission,
   **and account + profile + saved opportunities**. The "three situations"
   framing and "We don't collect anything else about you" are no longer true.
2. **Section 8 "Cookies and tracking" — "The only things stored on your device
   are: your light-or-dark mode choice … Nothing else."** Signed-in users now
   have **Supabase authentication cookies / local storage** on their device
   (the session). This statement is now false and must be updated.
3. **Implicit "we create no profiles of you".** Section 3's analytics line says
   we don't build a profile *from browsing*; that stays true. But we now **do**
   store a profile that the user **chooses** to create. The policy should
   distinguish the two so the overall "we don't profile you" impression isn't
   misleading.
4. **Section 6 processor list** omits **Supabase Auth** as the authentication
   mechanism (same vendor as the database, but worth naming) and does not
   mention sign-in emails sent via Resend.

## 2. New processing to add

### 2.1 Account
- **Data:** email address (for the magic-link sign-in), and the authentication
  session (secure token in a cookie). Supabase Auth stores a user record.
- **Purpose:** let a person save opportunities and reuse a profile across
  devices and visits.
- **Proposed lawful basis:** performance of a service the user requested
  (contract/service), or consent. **[OPERATOR/LEGAL TO CONFIRM basis.]**

### 2.2 Grant-seeker profile (including drafts)
- **Data (all user-supplied, all optional except the minimum):** country of
  residence; applicant type; optional organisation name + country; creative
  disciplines; optional stage; funding support-type preferences; optional
  preferred languages. A **draft** is saved as the user goes; a **completed**
  profile is the same fields marked complete. Schema version and timestamps.
- **Required vs optional:** the minimum for a completed profile is country,
  applicant type, at least one discipline and one support type. Everything else
  is optional and stored as "not provided" when left blank (never guessed).
- **Purpose:** to generate relevant recommendations and prefill forms.
- **Not collected (deliberately):** nationality, date of birth, sensitive
  demographics, ID/passport, bank/financial details, income, document uploads.
- **Proposed lawful basis:** consent / service. **[CONFIRM.]**
- **Important framings to state plainly:**
  - Residence is **not** nationality; applicant type is **self-reported**, not
    verified legal status; a creative interest is **not** proof of experience;
    a preferred language is **not** proficiency.
  - A profile is **private to the user**, visible only to them, and **not shared
    with funders**. (This is enforced by Row Level Security — see §4.)
  - Creating a profile is **not** a funding application.

### 2.3 Saved opportunities
- **Data:** which opportunities the user saved, and when. Linked to their
  account only.
- **Purpose:** the user's private shortlist.
- **Lawful basis:** consent / service. **[CONFIRM.]**

### 2.4 Recommendation logic and its limits (disclose plainly)
- Recommendations are **deterministic rules**, not an AI or eligibility score.
  They match the user's stated preferences (discipline, support type, and
  location where it can be determined) against opportunity fields.
- They are **"relevant to your preferences", never an eligibility decision.**
  Unknown requirements (e.g. a nationality restriction, which residence cannot
  resolve) stay unknown, and users are told to check the funder's full rules.

### 2.5 Confirmation email
- After a user **first completes** a profile (and their email is verified), we
  send one transactional **"Your Ona Funds profile is ready"** email via Resend.
  It contains no profile answers and no tokens. It is **not** marketing and does
  **not** subscribe anyone to the digest.
- **[OPERATOR TO CONFIRM]** the sending domain/address once Resend domain
  verification is done (intended: `hello@onafunds.com`). Until then it falls
  back to Resend's test sender.

### 2.6 Email preferences / consent
- This release **does not** add any optional marketing/digest opt-in to the
  account flow, and does **not** convert digest subscribers into account holders
  or infer new consent from an existing subscription. Account/security email
  (the sign-in link and the one profile-ready confirmation) is separate from the
  existing weekly digest. If an optional digest opt-in is added later, it must be
  a separate, unticked choice with recorded consent (purpose, timestamp,
  wording/version).

## 3. Providers / sub-processors to reflect (actual, in use)
- **Supabase** — database **and authentication** (user records, sessions).
  EU-hosted project. [Confirm wording for "Auth".]
- **Vercel** — hosting.
- **Resend** — sign-in (magic-link) emails and the profile-ready confirmation.
- **PostHog** — analytics (cookieless, EU). See §5 on profile pages.
- No new third-party advertising, AI-provider sharing, or commercial research
  uses are introduced.

## 4. Security / access controls (enforced, can be stated)
- Profiles and saved records are **owner-only**, enforced at the database by
  Supabase **Row Level Security** (`user_id = auth.uid()`). Unauthenticated
  visitors can read none of it. The public (anon) database key has **no** access
  to these tables; existing restrictions on raw research and internal notes are
  unchanged. Privileged keys stay server-side.
- Profile answers are kept out of URLs, logs, error reports and analytics
  payloads.

## 5. Cookies / local storage / analytics behaviour to update
- Add: signed-in users have **Supabase auth cookies / local storage** (the
  session) on their device. These are necessary for sign-in, not tracking.
- **[OPERATOR TO CONFIRM / ACTION]** Ensure PostHog does **not** identify
  signed-in users and **session replay is not enabled on `/signin`, `/profile*`,
  `/saved`, `/recommendations`.** We do not call PostHog `identify()` anywhere,
  and the feature sends no personal data in events. If replay is enabled at the
  PostHog project level, exclude these paths (project setting, not code).

## 6. Retention (to decide)
- **[OPERATOR/LEGAL TO SET]** retention for: active profiles, **drafts**
  (abandoned part-profiles), saved opportunities, authentication/session logs,
  the confirmation-email delivery record, and backups. The existing 24-month
  sweep covers messages/submissions, not these new records.

## 7. Deletion: profile vs account (state clearly)
- A user can **delete their grant-seeker profile** themselves (removes the
  preferences) while **keeping their account and saved opportunities**. This
  distinction must be explained.
- **[OPERATOR TO CONFIRM]** the route for **account** deletion (removing the
  auth user cascades profile + saved). Currently offered via emailing
  `hello@onafunds.com`; decide whether to add self-serve account deletion.
- Explain honestly that security logs / backups may retain data briefly after
  deletion rather than promising instant erasure everywhere.

## 8. Other sections to review
- **Rights / complaints:** unchanged in substance; confirm the privacy contact
  address actually exists and is monitored (**[OPERATOR: does
  `privacy@onafunds.com` exist? currently a placeholder]**).
- **Adults only:** the policy already states adults-only; keep.
- **Controller identity:** the live policy uses placeholder `OPERATOR = 'Ona'`.
  **[OPERATOR/LEGAL TO CONFIRM]** the actual legal controller name and contact.
- **Changes/notification:** material changes (this feature) must go through
  review and be announced appropriately — not published silently.

---

## Open items the operator/legal must settle before public launch
1. Legal controller identity and privacy contact address (confirm
   `privacy@onafunds.com` exists / is monitored).
2. Lawful basis for account, profile and saved data (consent vs service).
3. Retention periods for profiles, drafts, saved items, auth/session logs,
   email-delivery records and backups.
4. Resend sender verification for `hello@onafunds.com` (and confirm the final
   sender shown in the confirmation email).
5. Confirm PostHog is not identifying users and replay is off for auth/profile
   pages (project setting).
6. Decide whether to offer self-serve account deletion (vs email request).
7. Final copy of the updated public policy, reviewed by legal, before publishing.
