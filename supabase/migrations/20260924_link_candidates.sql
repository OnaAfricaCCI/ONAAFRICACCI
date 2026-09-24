-- ============================================================================
-- Link candidates: proposed replacements for dead links
--
-- When a grant's link 404s, the organisation is usually alive and still
-- funding — the page just moved. Someone has to find where it went. That is
-- what David did by hand for the Google Play Indie Games Fund.
--
-- The re-discovery script does the looking and writes what it finds HERE, not
-- into `opportunities`. Nothing it proposes appears on the site until a person
-- approves it. A machine guessing at a funder's application URL and publishing
-- the guess is exactly the kind of invented data this project refuses to ship.
--
-- Safe to run more than once.
-- ============================================================================

create table if not exists link_candidates (
  id            uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,

  -- What we propose, and what the old one was (so a mistake can be undone).
  candidate_url text not null,
  previous_url  text,

  -- How it was found: 'wayback' | 'redirect' | 'crawl' | 'manual'
  method        text not null,
  -- Claude's read of whether this is the same programme, 0.00–1.00.
  confidence    numeric(3,2),
  -- Why it thinks so, in a sentence — so a reviewer can judge the judgement.
  reasoning     text,
  -- What the candidate page actually said, for review without opening a tab.
  page_title    text,
  http_status   integer,

  status        text not null default 'pending',
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

alter table link_candidates drop constraint if exists link_candidates_status_check;
alter table link_candidates add constraint link_candidates_status_check
  check (status in ('pending', 'approved', 'rejected'));

alter table link_candidates drop constraint if exists link_candidates_method_check;
alter table link_candidates add constraint link_candidates_method_check
  check (method in ('wayback', 'redirect', 'crawl', 'manual'));

-- One pending proposal per URL per grant: re-running the script must not pile
-- up duplicates of the same suggestion.
create unique index if not exists link_candidates_unique_pending
  on link_candidates (opportunity_id, candidate_url)
  where status = 'pending';

create index if not exists link_candidates_status_idx on link_candidates (status, created_at desc);

-- Read access stays closed: this is an internal review queue, not public data.
alter table link_candidates enable row level security;
