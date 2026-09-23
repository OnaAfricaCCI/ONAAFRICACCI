-- ============================================================================
-- Link state: three answers instead of two
--
-- `link_ok` is a boolean, so it can only say "works" or "broken". It has no way
-- to say "we couldn't tell" — and that is the honest answer surprisingly often.
-- Large sites (the British Council among them) block automated checkers from
-- datacentre addresses. Our checker read that block as death and we flagged
-- three perfectly healthy funds as broken.
--
-- This adds:
--   link_state        'ok' | 'unverified' | 'dead'
--   link_fail_streak  consecutive failed sweeps, so one bad night can't
--                     condemn a link — it takes two in a row to be called dead
--
-- `link_ok` stays, and stays in sync (link_ok = link_state is 'ok'), so the
-- homepage carousel and every existing query keep working untouched.
--
-- Safe to run more than once.
-- ============================================================================

alter table opportunities
  add column if not exists link_state      text    not null default 'unverified',
  add column if not exists link_fail_streak integer not null default 0;

alter table opportunities drop constraint if exists opportunities_link_state_check;
alter table opportunities add constraint opportunities_link_state_check
  check (link_state in ('ok', 'unverified', 'dead'));

-- ---------------------------------------------------------------------------
-- Backfill from the evidence already recorded, not from guesswork.
-- ---------------------------------------------------------------------------

-- Confirmed working.
update opportunities
   set link_state = 'ok', link_fail_streak = 0
 where link_ok is true;

-- The server answered, and answered "no such page". That is real: the link is
-- broken even when the organisation is alive and still funding. Seeded at 2
-- strikes because the 404 is already confirmed.
update opportunities
   set link_state = 'dead', link_fail_streak = 2
 where link_ok is false
   and link_status in (404, 410);

-- We never got an answer at all — DNS failure, refused connection, timeout.
-- Some of these are genuinely gone and some are blocking us; the stored error
-- text cannot tell them apart, so we stop claiming to know. One strike stands
-- against them: the next sweep decides.
update opportunities
   set link_state = 'unverified', link_fail_streak = 1
 where link_ok is false
   and (link_status is null or link_status not in (404, 410));

-- Never checked.
update opportunities
   set link_state = 'unverified', link_fail_streak = 0
 where link_ok is null;

create index if not exists opportunities_link_state_idx on opportunities (link_state);

-- ---------------------------------------------------------------------------
-- What you should see: roughly 91 ok, 27 dead, 24 unverified.
-- ---------------------------------------------------------------------------
select link_state, count(*)
  from opportunities
 group by link_state
 order by count(*) desc;
