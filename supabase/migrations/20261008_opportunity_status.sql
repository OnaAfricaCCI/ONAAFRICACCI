-- ============================================================================
-- Opportunity status taxonomy (Phase 1)
--
-- Replaces the overloaded single "deadline_type/Recurring" signal with three
-- separate, honest facts:
--   programme_frequency  — how often the programme runs (cadence; stable)
--   application_status    — whether you can apply right now (derived from
--                           evidence; the badge). Never claimed without proof.
--   verification          — what we confirmed, and when (status_verified_at +
--                           status_source), kept distinct from the automated
--                           link check so a working link never implies an open
--                           window.
--
-- Forward-looking fields let a visitor see (and later be alerted about) a call
-- that has not opened yet:
--   next_open_date        — an officially announced future opening date
--   expected_open_period  — an editorial/historical estimate ("usually Nov")
--
-- Additive and idempotent. Existing columns (deadline, deadline_type) are left
-- in place and untouched. Anon gets column-level SELECT so the public grant
-- pages can read these, matching the other display columns.
-- ============================================================================
alter table opportunities add column if not exists application_status   text;
alter table opportunities add column if not exists programme_frequency  text;
alter table opportunities add column if not exists frequency_detail     text;
alter table opportunities add column if not exists next_open_date       date;
alter table opportunities add column if not exists expected_open_period text;
alter table opportunities add column if not exists status_verified_at   timestamptz;
alter table opportunities add column if not exists status_source        text;

-- Controlled vocabularies. NULL is allowed (unmigrated rows fall back to the
-- old deadline logic until set).
alter table opportunities drop constraint if exists opp_application_status_check;
alter table opportunities add constraint opp_application_status_check
  check (application_status is null or application_status in
    ('open', 'opens_on', 'awaiting_next_call', 'closed_uncertain',
     'invitation_only', 'unconfirmed'));

alter table opportunities drop constraint if exists opp_programme_frequency_check;
alter table opportunities add constraint opp_programme_frequency_check
  check (programme_frequency is null or programme_frequency in
    ('rolling', 'quarterly', 'annual', 'biennial', 'periodic', 'one-off', 'unknown'));

comment on column opportunities.application_status is
  'Evidence-based current status: open | opens_on | awaiting_next_call | closed_uncertain | invitation_only | unconfirmed. Derived from verification, never guessed open/closed.';
comment on column opportunities.programme_frequency is
  'Cadence: rolling | quarterly | annual | biennial | periodic | one-off | unknown. Independent of status.';
comment on column opportunities.status_verified_at is
  'When a human/source confirmation of the status was last made. Distinct from link_checked_at (automated link test).';

grant select
  (application_status, programme_frequency, frequency_detail, next_open_date,
   expected_open_period, status_verified_at, status_source)
  on opportunities to anon, authenticated;
