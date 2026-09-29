-- ============================================================================
-- Structured eligibility
--
-- `eligible_countries` holds the funders' own free-text answers, which are
-- interpreted for the filter and cleaned for display but never rewritten: they
-- are the provenance. These columns sit ALONGSIDE it and answer the question a
-- visitor actually asks, "can I apply?", in structured form that a human has
-- checked.
--
-- Every column is nullable and starts empty. A grant shows the cleaned
-- geographic line until enrichment fills these in, so nothing on the site
-- changes the moment this runs.
--
-- Safe to run more than once.
-- ============================================================================

alter table opportunities
  -- Who the funder accepts. The single most useful missing fact.
  add column if not exists eligible_who text,
  -- One short condition in the funder's terms, e.g. "with a European
  -- co-production structure". Not a rewrite of eligible_countries.
  add column if not exists eligible_conditions text,
  -- The sentence on the funder's page this was drawn from. Kept so a reviewer,
  -- and later a reader, can check the claim against the source.
  add column if not exists eligibility_evidence text,
  -- How sure the extractor was, before a human looked.
  add column if not exists eligibility_confidence text,
  -- False until a person has approved the extraction. Nothing structured is
  -- shown to visitors, and nothing counts as done, until this is true.
  add column if not exists eligibility_reviewed boolean not null default false;

-- Guard the small vocabularies so a typo cannot enter the field.
alter table opportunities drop constraint if exists opportunities_eligible_who_check;
alter table opportunities add constraint opportunities_eligible_who_check
  check (eligible_who is null
         or eligible_who in ('individual', 'organisation', 'either', 'partnership'));

alter table opportunities drop constraint if exists opportunities_eligibility_confidence_check;
alter table opportunities add constraint opportunities_eligibility_confidence_check
  check (eligibility_confidence is null
         or eligibility_confidence in ('high', 'medium', 'low'));

-- Find the ones still needing eligibility work.
create index if not exists opportunities_eligibility_todo_idx
  on opportunities (eligibility_reviewed)
  where eligibility_reviewed = false;

-- Confirm the columns exist. Expect five rows.
select column_name from information_schema.columns
 where table_name = 'opportunities'
   and column_name like 'eligib%'
 order by column_name;
