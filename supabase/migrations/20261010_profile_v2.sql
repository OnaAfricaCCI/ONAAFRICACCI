-- ============================================================================
-- Grant-seeker profile v2 — revised questions, Phase 2 batches, visit tracking.
--
-- Fully ADDITIVE. Existing profiles, answers, saved opportunities, auth and RLS
-- are untouched. Every new column is nullable or defaulted, so current rows keep
-- working unchanged and can be read/written by the same owner-only policies.
--
-- Recovery: these are "add column"/"add value" changes; to roll back, drop the
-- added columns (data in them is lost, nothing else is affected). Safe to run
-- more than once.
-- ============================================================================

-- --- Phase 1 additions ------------------------------------------------------
alter table grant_seeker_profiles add column if not exists disciplines_other text;        -- "Another area" free text
alter table grant_seeker_profiles add column if not exists taxonomy_review boolean not null default false; -- flags disciplines_other for human review
alter table grant_seeker_profiles add column if not exists open_to_all boolean not null default false;     -- "open to different kinds of opportunities"

-- Allow the new applicant type "exploring for someone else".
alter table grant_seeker_profiles drop constraint if exists gsp_applicant_type_check;
alter table grant_seeker_profiles add constraint gsp_applicant_type_check
  check (applicant_type is null or applicant_type in
    ('individual', 'collective', 'business', 'nonprofit', 'other', 'exploring'));

-- --- Phase 2 · Batch 1 (goals) ---------------------------------------------
alter table grant_seeker_profiles add column if not exists goals             text[] not null default '{}';
alter table grant_seeker_profiles add column if not exists timeframe         text;
alter table grant_seeker_profiles add column if not exists willing_locations text[] not null default '{}';

-- --- Phase 2 · Batch 2 (funding experience) --------------------------------
alter table grant_seeker_profiles add column if not exists applications_count text;
alter table grant_seeker_profiles add column if not exists prior_support      text[] not null default '{}';
alter table grant_seeker_profiles add column if not exists barriers           text[] not null default '{}';
alter table grant_seeker_profiles add column if not exists barriers_other     text;

-- --- Phase 2 · Batch 3 (matching & outcomes) -------------------------------
-- Residence (country_code), citizenship, and registration stay three distinct
-- meanings; collectives record where members are based.
alter table grant_seeker_profiles add column if not exists citizenship            text[] not null default '{}';
alter table grant_seeker_profiles add column if not exists citizenship_prefer_not boolean not null default false;
alter table grant_seeker_profiles add column if not exists registered_in          text[] not null default '{}';
alter table grant_seeker_profiles add column if not exists members_based_in        text[] not null default '{}';
alter table grant_seeker_profiles add column if not exists typical_amount          text;
alter table grant_seeker_profiles add column if not exists fit_rating              text;
alter table grant_seeker_profiles add column if not exists fit_note                text;
alter table grant_seeker_profiles add column if not exists actions_taken           text[] not null default '{}';

-- --- Visit counting & Phase 2 invitation state ------------------------------
-- A "return visit" is a distinct active authenticated session (>= 30 min since
-- the last activity). The account-creation session is not a return visit.
alter table grant_seeker_profiles add column if not exists visit_count        integer not null default 0;
alter table grant_seeker_profiles add column if not exists last_visit_at       timestamptz;
alter table grant_seeker_profiles add column if not exists last_invited_visit  integer; -- visit number an invite was last shown (one batch per visit)
alter table grant_seeker_profiles add column if not exists batch1_completed    boolean not null default false;
alter table grant_seeker_profiles add column if not exists batch2_completed    boolean not null default false;
alter table grant_seeker_profiles add column if not exists batch3_completed    boolean not null default false;
alter table grant_seeker_profiles add column if not exists batch1_dismissals   integer not null default 0;
alter table grant_seeker_profiles add column if not exists batch2_dismissals   integer not null default 0;
alter table grant_seeker_profiles add column if not exists batch3_dismissals   integer not null default 0;
alter table grant_seeker_profiles add column if not exists batch1_dismissed_visit integer;
alter table grant_seeker_profiles add column if not exists batch2_dismissed_visit integer;
alter table grant_seeker_profiles add column if not exists batch3_dismissed_visit integer;
alter table grant_seeker_profiles add column if not exists thankyou_shown      boolean not null default false;

comment on column grant_seeker_profiles.taxonomy_review is
  'True when disciplines_other holds free-text "Another area" that a human should review; never auto-mapped onto a discipline.';
comment on column grant_seeker_profiles.visit_count is
  'Count of distinct active authenticated return visits (>=30 min apart). Drives Phase 2 invitation timing. Account-creation session excluded.';
