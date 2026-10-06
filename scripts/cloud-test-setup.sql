-- ============================================================================
-- CLOUD TEST-PROJECT SETUP  —  THROWAWAY / DISPOSABLE PROJECT ONLY.
--
-- Run this in the Supabase SQL Editor of a NEW, EMPTY test project (never your
-- real onafunds project). It creates a minimal `opportunities` stub + one seed
-- row (so the profile feature's foreign key resolves and the tests have an
-- opportunity to save), then the real grant-seeker migration below.
--
-- Your real project already HAS a full opportunities table, so there you run
-- ONLY the migration (supabase/migrations/20261006_grant_seeker_profiles.sql),
-- not this stub.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.opportunities (
  id                 uuid primary key default gen_random_uuid(),
  name               text,
  slug               text,
  funder             text,
  funding_type       text,
  cci_sector         text,
  deadline           date,
  deadline_type      text,
  scopes             text[],
  eligible_countries text[],
  description        text
);

insert into public.opportunities (name, slug, funder, funding_type, cci_sector, scopes, description)
select 'Test Opportunity', 'test-opportunity', 'Test Funder', 'grant', 'film', array['africa'],
       'A seed opportunity for local/cloud verification only.'
where not exists (select 1 from public.opportunities);


-- ============================================================================
-- Below: the grant-seeker profiles migration (verbatim copy).
-- ============================================================================

-- ============================================================================
-- Grant-seeker accounts: profiles, saved opportunities, confirmation-email state
--
-- Three new, private, owner-only tables. Nothing here is public. Each row is
-- owned by one authenticated user (auth.users), and Row Level Security lets a
-- user touch only their own rows. The service-role key (server only) bypasses
-- RLS for the few server-side jobs that need it (sending the confirmation).
--
-- Additive and idempotent. It does NOT widen any existing public permission,
-- does NOT touch `opportunities`/`funders` data, and does NOT relax the
-- column-level grants that keep raw research private.
--
-- Safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Grant-seeker profile — one per account.
--
-- Stores the small amount of context a visitor supplies once and reuses:
-- where they are, the capacity they seek funding in, what they make, and what
-- kinds of funding they want. Preferences, not verified facts (see the privacy
-- draft): residence is not nationality, applicant_type is self-reported, a
-- creative interest is not proof of experience, a language is a preference.
--
-- An unanswered optional field is NULL (or an empty array) — never a guessed
-- value. `status` separates a resumable draft from a completed profile.
-- ---------------------------------------------------------------------------
create table if not exists grant_seeker_profiles (
  user_id              uuid primary key references auth.users(id) on delete cascade,

  status               text not null default 'draft',

  -- Step 1 — about you
  country_code         text,                    -- ISO 3166-1 alpha-2, residence (not nationality)
  applicant_type       text,                    -- individual | collective | business | nonprofit | other
  organisation_name    text,                    -- self-reported, only for org applicant types
  organisation_country text,                    -- ISO 3166-1 alpha-2

  -- Step 2 — your creative work
  disciplines          text[] not null default '{}',   -- canonical discipline ids (see lib/disciplines.ts)
  stage                text,                    -- optional; 'not-sure' allowed

  -- Step 3 — funding preferences
  support_types        text[] not null default '{}',   -- funding_type values: grant, prize, residency, ...
  languages            text[] not null default '{}',   -- preferred application languages (recommendations do NOT use these yet)

  schema_version       integer not null default 1,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  completed_at         timestamptz
);

alter table grant_seeker_profiles drop constraint if exists gsp_status_check;
alter table grant_seeker_profiles add constraint gsp_status_check
  check (status in ('draft', 'completed'));

alter table grant_seeker_profiles drop constraint if exists gsp_applicant_type_check;
alter table grant_seeker_profiles add constraint gsp_applicant_type_check
  check (applicant_type is null or applicant_type in
    ('individual', 'collective', 'business', 'nonprofit', 'other'));

-- ---------------------------------------------------------------------------
-- 2. Saved opportunities — a user's shortlist.
--
-- One row per (user, opportunity). The unique constraint is what makes a save
-- idempotent: saving the same grant twice can never create a duplicate.
-- Opportunities are never hard-deleted on this site (closed ones are kept and
-- marked), but the cascade keeps the shortlist tidy if one ever is.
-- ---------------------------------------------------------------------------
create table if not exists saved_opportunities (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (user_id, opportunity_id)
);

create index if not exists saved_opportunities_user_idx
  on saved_opportunities (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. Profile confirmation email — delivery state, for idempotency.
--
-- One row per user. Its existence means "we have already started/sent the
-- one-time 'your profile is ready' email", so a retry, refresh or re-run can
-- never send a second one. Written by the server (service role) only.
-- ---------------------------------------------------------------------------
create table if not exists profile_confirmation_emails (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  status              text not null default 'pending',   -- pending | sent | failed
  provider_message_id text,
  attempts            integer not null default 0,
  last_error          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table profile_confirmation_emails drop constraint if exists pce_status_check;
alter table profile_confirmation_emails add constraint pce_status_check
  check (status in ('pending', 'sent', 'failed'));

-- ---------------------------------------------------------------------------
-- updated_at touch trigger (shared)
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists gsp_set_updated_at on grant_seeker_profiles;
create trigger gsp_set_updated_at before update on grant_seeker_profiles
  for each row execute function set_updated_at();

drop trigger if exists pce_set_updated_at on profile_confirmation_emails;
create trigger pce_set_updated_at before update on profile_confirmation_emails
  for each row execute function set_updated_at();

-- ============================================================================
-- Row Level Security — owner-only.
--
-- RLS is enabled on all three tables. The policies below grant an authenticated
-- user access to ONLY the rows where user_id = their own auth.uid(). Anonymous
-- visitors match no policy, so they get nothing. The service-role key bypasses
-- RLS entirely (that is how the server completes a save during auth callback
-- and sends the confirmation email).
-- ============================================================================
alter table grant_seeker_profiles        enable row level security;
alter table saved_opportunities          enable row level security;
alter table profile_confirmation_emails  enable row level security;

-- grant_seeker_profiles: full owner CRUD
drop policy if exists gsp_select_own on grant_seeker_profiles;
create policy gsp_select_own on grant_seeker_profiles
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists gsp_insert_own on grant_seeker_profiles;
create policy gsp_insert_own on grant_seeker_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists gsp_update_own on grant_seeker_profiles;
create policy gsp_update_own on grant_seeker_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists gsp_delete_own on grant_seeker_profiles;
create policy gsp_delete_own on grant_seeker_profiles
  for delete to authenticated using (user_id = (select auth.uid()));

-- saved_opportunities: full owner CRUD
drop policy if exists saved_select_own on saved_opportunities;
create policy saved_select_own on saved_opportunities
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists saved_insert_own on saved_opportunities;
create policy saved_insert_own on saved_opportunities
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists saved_delete_own on saved_opportunities;
create policy saved_delete_own on saved_opportunities
  for delete to authenticated using (user_id = (select auth.uid()));

-- profile_confirmation_emails: owner may read their own state; writes are
-- server-only (service role bypasses RLS). No insert/update policy on purpose.
drop policy if exists pce_select_own on profile_confirmation_emails;
create policy pce_select_own on profile_confirmation_emails
  for select to authenticated using (user_id = (select auth.uid()));

-- ============================================================================
-- Privileges. Grant the authenticated role table access; RLS does the row
-- filtering above. Anonymous (anon) is deliberately granted NOTHING here, so
-- these tables stay invisible to the public key. Existing grants are untouched.
-- ============================================================================
grant select, insert, update, delete on grant_seeker_profiles to authenticated;
grant select, insert, delete          on saved_opportunities   to authenticated;
grant select                          on profile_confirmation_emails to authenticated;
