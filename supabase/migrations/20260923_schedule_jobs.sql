-- ============================================================================
-- Scheduled jobs ("cron")
--
-- Two jobs that keep the site current without anyone remembering to run them:
--   1. check-links   — every day at 03:00 UTC, visits every grant's link and
--                      records whether it still works. Dead links are kept out
--                      of the homepage carousel.
--   2. weekly-digest — Mondays at 09:00 UTC, emails subscribers what's new and
--                      what's closing, and sweeps out data older than 24 months.
--
-- Safe to run more than once: each job is removed and recreated.
-- ============================================================================

-- The two extensions that make scheduling and outbound calls possible.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove any earlier versions of these jobs so this can be re-run cleanly.
select cron.unschedule(jobid) from cron.job where jobname in ('ona-check-links', 'ona-weekly-digest');

-- 1. Daily link check — 03:00 UTC every day
select cron.schedule(
  'ona-check-links',
  '0 3 * * *',
  $$
  select net.http_post(
    url     := 'https://fperytyukppkkjjfkwgl.supabase.co/functions/v1/check-links',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-digest-secret', 'abb3b7385cf41ed0b0b92078699cc006aac47db8cd5c2473'
               ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);

-- 2. Weekly digest — 09:00 UTC every Monday
select cron.schedule(
  'ona-weekly-digest',
  '0 9 * * 1',
  $$
  select net.http_post(
    url     := 'https://fperytyukppkkjjfkwgl.supabase.co/functions/v1/weekly-digest',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-digest-secret', 'abb3b7385cf41ed0b0b92078699cc006aac47db8cd5c2473'
               ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);

-- Confirm what is scheduled.
select jobname, schedule, active from cron.job where jobname like 'ona-%';
