-- ============================================================================
-- Application-fee policy: always allow fee-based calls, always flag the fee.
--
-- Some funders charge an entry/application fee (e.g. Innovate Grant's US$35).
-- Ona's policy is to list these but never hide the cost: the fee is stored as
-- its own field so every list card and grant page can surface it consistently,
-- instead of leaving it buried in prose where a visitor might miss it.
--
-- Values:
--   a charge   -> the fee as a display string, e.g. 'US$35'
--   'Free'     -> confirmed free to apply
--   NULL       -> unknown / not checked (we never guess "free")
--
-- Additive and idempotent. Does not touch existing rows or any other column.
-- The anon (public) role is granted column-level SELECT so the public grant
-- pages can read it, matching how the other display columns are exposed.
-- ============================================================================
alter table opportunities add column if not exists application_fee text;

comment on column opportunities.application_fee is
  'Applicant-paid entry/application fee as a display string (e.g. "US$35"), "Free" when confirmed free, or NULL when unknown. Policy: fee-based calls are allowed but the fee is always flagged on the site.';

grant select (application_fee) on opportunities to anon, authenticated;
