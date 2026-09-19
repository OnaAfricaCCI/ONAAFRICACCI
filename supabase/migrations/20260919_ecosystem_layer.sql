-- ============================================================================
-- Ona: Ecosystem layer + shared institution profiles
-- 19 September 2026
--
-- Everything here is ADDITIVE. No table is dropped, no column removed, no row
-- deleted. Safe to run on the live database; the current site keeps working
-- unchanged until the new code is deployed.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. `funders` becomes the single institutions layer.
--    Both grants and builder mechanisms attach to it, so an institution that
--    appears in both datasets resolves to one profile.
-- ----------------------------------------------------------------------------

alter table funders
  -- profile fields (designed earlier, never applied)
  add column if not exists slug text,
  add column if not exists what_they_fund text,
  add column if not exists how_to_apply text,
  add column if not exists deadline_notes text,
  add column if not exists notable_grantees text[] default '{}',
  add column if not exists grants_page_url text,
  add column if not exists last_verified date,
  add column if not exists source_url text,
  -- which layers this institution appears in: 'funder', 'builder', or both
  add column if not exists roles text[] not null default '{}',
  -- from the Builders file (institution-level)
  add column if not exists institution_type text;

-- Readable slugs from names; numeric suffix only if two names collide.
update funders f
set slug = b.s || case when b.rn > 1 then '-' || b.rn else '' end
from (
  select id,
         regexp_replace(regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g') as s,
         row_number() over (
           partition by regexp_replace(regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')
           order by created_at
         ) as rn
  from funders
) b
where f.id = b.id and f.slug is null;

create unique index if not exists funders_slug_key on funders (slug);

-- Every existing row is a funder.
update funders set roles = array['funder'] where roles = '{}';

-- Provenance for the spreadsheet import (its status column is dated 15 Sept 2026).
update funders
set grants_page_url = coalesce(grants_page_url, website),
    source_url      = coalesce(source_url, website),
    last_verified   = coalesce(last_verified, date '2026-09-15');


-- ----------------------------------------------------------------------------
-- 2. Grants link to institutions.
--    `funder` (free text) stays; `institution_id` is the resolved link.
-- ----------------------------------------------------------------------------

alter table opportunities
  add column if not exists institution_id uuid references funders(id) on delete set null;

create index if not exists opportunities_institution_idx on opportunities (institution_id);


-- ----------------------------------------------------------------------------
-- 3. Builder mechanisms — the Ecosystem layer.
--    One row per programme / mechanism, tied to a parent institution,
--    mirroring the Builders file column-for-column. Blanks stay blank.
-- ----------------------------------------------------------------------------

create table if not exists builder_mechanisms (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique,
  institution_id      uuid references funders(id) on delete set null,

  -- straight from the file
  name                text not null,            -- Mechanism / programme
  parent_institution  text,                     -- full string, e.g. "HEVA Fund + NCBA Group"
  institution_type    text,
  mechanism           text,                     -- Capital / support mechanism
  cci_areas           text[] default '{}',      -- CCI area(s), split on ;
  who_it_supports     text,
  african_eligibility text,
  what_it_provides    text,                     -- Award / investment / what it provides
  cycle               text,                     -- Typical cycle / deadline
  status              text,
  institution_website text,
  opportunities_hub   text,                     -- Funding / opportunities hub
  evidence_link       text,                     -- Direct programme / evidence link
  geographic_focus    text,
  notes               text,                     -- Notes / verification caveat
  economic_role_raw   text,                     -- as written, e.g. "Capital / investment; Trade / export / market access"
  access_model_raw    text,                     -- as written
  evidence_strength   text,
  research_date       date,

  -- derived for filtering (user-facing labels)
  economic_roles      text[] default '{}',      -- subset of the four buckets below
  access_model        text,                     -- 'Open to applications' | 'By relationship or introduction' | 'Programme-based'
  regions             text[] default '{}',      -- normalised from geographic_focus, same vocabulary as funders.regions_of_focus

  -- shared with grants so the two layers filter alike
  eligible_countries  text[] default '{}',

  -- link health, same treatment as opportunities
  link_ok             boolean,
  link_status         integer,
  link_error          text,
  link_checked_at     timestamptz,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Guard the derived vocabularies so bad values can't creep in.
alter table builder_mechanisms
  drop constraint if exists builder_mechanisms_access_model_check;
alter table builder_mechanisms
  add constraint builder_mechanisms_access_model_check
  check (access_model is null or access_model in (
    'Open to applications', 'By relationship or introduction', 'Programme-based'
  ));

alter table builder_mechanisms
  drop constraint if exists builder_mechanisms_economic_roles_check;
alter table builder_mechanisms
  add constraint builder_mechanisms_economic_roles_check
  check (economic_roles <@ array[
    'Capital & investment',
    'Market access & trade',
    'Skills & enterprise growth',
    'Policy & industry infrastructure'
  ]::text[]);

create index if not exists builder_mechanisms_institution_idx on builder_mechanisms (institution_id);
create index if not exists builder_mechanisms_access_idx on builder_mechanisms (access_model);
create index if not exists builder_mechanisms_roles_idx on builder_mechanisms using gin (economic_roles);

-- Public can read; writes stay server-side.
alter table builder_mechanisms enable row level security;
drop policy if exists "public read" on builder_mechanisms;
create policy "public read" on builder_mechanisms for select using (true);


-- ----------------------------------------------------------------------------
-- 4. Tables designed in earlier sessions that were never created.
--    The contact form, submission form and email signup currently error
--    without these. All new; nothing existing is touched.
-- ----------------------------------------------------------------------------

create table if not exists contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  message    text not null,
  created_at timestamptz default now()
);
alter table contact_messages enable row level security;

create table if not exists opportunity_submissions (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  organization  text,
  amount        text,
  for_who       text,
  deadline      text,
  rolling       boolean default false,
  link          text,
  contact_email text not null,
  notes         text,
  status        text default 'pending',
  created_at    timestamptz default now()
);
alter table opportunity_submissions enable row level security;

create table if not exists subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             text not null unique,
  sectors           text[] default '{}',
  countries         text[] default '{}',
  is_active         boolean default true,
  unsubscribe_token uuid not null default gen_random_uuid(),
  unsubscribed_at   timestamptz,
  created_at        timestamptz default now()
);
create index if not exists subscribers_token_idx on subscribers (unsubscribe_token);
alter table subscribers enable row level security;

create table if not exists posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  excerpt      text,
  body         text,
  post_type    text not null default 'article' check (post_type in ('article','image','video')),
  cover_url    text,
  video_url    text,
  author       text,
  tags         text[] default '{}',
  published    boolean default false,
  published_at timestamptz,
  created_at   timestamptz default now()
);
alter table posts enable row level security;
drop policy if exists "public read published" on posts;
create policy "public read published" on posts for select using (published = true);
