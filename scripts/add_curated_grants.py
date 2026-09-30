"""
Add a small set of hand-verified opportunities to the database.

Unlike import_grants.py (which syncs a whole spreadsheet), this adds a short,
explicit list of opportunities that were each checked on the funder's own page:
that the call is real, who can apply, whether African creatives are eligible,
the amount and the deadline. Every field below was read off the source, never
invented — the same rule the rest of the site holds to.

Each record names its funder; the funder profile is linked if it already exists
and created (role: funder) if not. Grants are deduplicated by source_url, so
re-running is safe.

  python3 scripts/add_curated_grants.py            # dry run — prints the plan
  python3 scripts/add_curated_grants.py --apply    # write it

After --apply, run, in order:
  python3 scripts/backfill_slugs.py --write        # give each a permanent URL
  python3 scripts/extract_eligibility.py --write   # propose who-can-apply
  python3 scripts/review_eligibility.py --go        # approve it
"""
import json, os, re, sys, unicodedata, urllib.parse, urllib.request

APPLY = '--apply' in sys.argv
NOW = '2026-09-30T15:19:29Z'
TODAY = '2026-09-30'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = {l.split('=', 1)[0]: l.split('=', 1)[1].strip().strip('"')
       for l in open(os.path.join(ROOT, '.env.local')) if '=' in l and not l.startswith('#')}
URL, KEY = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/'), env['SUPABASE_SERVICE_ROLE_KEY']
HDR = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}


def rest(method, path, body=None, prefer=None):
    h = dict(HDR)
    if prefer:
        h['Prefer'] = prefer
    req = urllib.request.Request(f'{URL}/rest/v1/{path}', method=method, headers=h,
                                 data=json.dumps(body).encode() if body is not None else None)
    with urllib.request.urlopen(req, timeout=45) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def slugify(name):
    s = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'(^-|-$)', '', re.sub(r'[^a-z0-9]+', '-', s))


def norm_link(u):
    return re.sub(r'/$', '', (u or '').strip().lower().split('?')[0])


# Funders to link to (created if missing). Website is used for the profile and
# its favicon; grants_page is where a visitor applies.
FUNDERS = {
    'AU–EU Youth Voices Lab': dict(website='https://aueuyouthvoiceslab.eu', ftype='Programme / initiative'),
    'Film Possible': dict(website='https://www.filmpossible.org', ftype='Non-profit'),
    'Gauteng Film Commission': dict(website='https://gautengfilm.org.za', ftype='Government agency'),
    'Alter-Ciné Foundation': dict(website='https://altercine.org', ftype='Foundation'),
    'Culture Resource (Al Mawred Al Thaqafy)': dict(website='https://mawred.org', ftype='Foundation'),
    'Centre for Contemporary Art, Lagos': dict(website='https://ccalagos.org', ftype='Arts organisation'),
    # Next Narrative Africa already exists as a funder; we link to it by name.
}

# The verified opportunities. `verified_link` True means the application page
# loaded cleanly when checked (so we can stamp a verified date); False means the
# page is behind a login/portal and is left 'unverified' — never flagged as dead.
GRANTS = [
    # ---- Pass A: the ten direct sites David supplied ----
    dict(
        name='Lens of Change — Open Call for Young Filmmakers',
        funder='AU–EU Youth Voices Lab', funding_type='grant', cci_sector='film',
        eligible_countries=['Africa'], amount='€765–€1,800 per project',
        deadline=None, deadline_type='rolling',
        link='https://aueuyouthvoiceslab.eu/lens-of-change-open-call-for-young-filmmakers/',
        description=('Production grants of €765 to €1,800 per project for short documentaries '
                     '(3–15 minutes), social edits and event highlights. Supports emerging filmmakers '
                     'aged 18–35 across Africa. Rolling recruitment; open.'),
        verified_link=True),
    dict(
        name='Matatu Film Fund',
        funder='Film Possible', funding_type='grant', cci_sector='film',
        eligible_countries=['Africa'], amount=None,
        deadline=None, deadline_type='rolling',
        link='https://www.filmpossible.org/matatufilmfund/',
        description=('A fund for long and short fiction narratives and documentaries at development, '
                     'production and distribution stages. Supports emerging and established filmmakers '
                     'across Africa.'),
        verified_link=True),
    dict(
        name='Gauteng Film Commission — Content Development Fund',
        funder='Gauteng Film Commission', funding_type='grant', cci_sector='film',
        eligible_countries=['South Africa'], amount=None,
        deadline=None, deadline_type='recurring',
        link='https://gauteng-film-commision.grantplatform.com/', link_suffix='content-development',
        description=('Development funding for film and television content from the Gauteng Film Commission. '
                     'For South African filmmakers and production companies based in Gauteng. Applications '
                     'run in periodic cycles through the commission’s grant portal.'),
        verified_link=False),
    dict(
        name='Gauteng Film Commission — Marketing & Distribution Fund',
        funder='Gauteng Film Commission', funding_type='grant', cci_sector='film',
        eligible_countries=['South Africa'], amount=None,
        deadline=None, deadline_type='recurring',
        link='https://gauteng-film-commision.grantplatform.com/', link_suffix='marketing-distribution',
        description=('Support for the marketing and distribution of completed film and television work from '
                     'the Gauteng Film Commission. For South African filmmakers and production companies '
                     'based in Gauteng. Applications run in periodic cycles through the commission’s '
                     'grant portal.'),
        verified_link=False),
    dict(
        name='Gauteng Film Commission — Production Fund',
        funder='Gauteng Film Commission', funding_type='grant', cci_sector='film',
        eligible_countries=['South Africa'], amount=None,
        deadline=None, deadline_type='recurring',
        link='https://gauteng-film-commision.grantplatform.com/', link_suffix='production',
        description=('Production funding for film and television projects from the Gauteng Film Commission. '
                     'For South African filmmakers and production companies based in Gauteng. Applications '
                     'run in periodic cycles through the commission’s grant portal.'),
        verified_link=False),
    dict(
        name='Next Narrative Africa Fund',
        funder='Next Narrative Africa', funding_type='grant', cci_sector='film',
        eligible_countries=['Africa', 'Diaspora'], amount=None,
        deadline=None, deadline_type='recurring',
        link='https://nextnarrativeafricafund.com/pitch/',
        description=('Script-development grants for African and diaspora storytellers. The fund runs '
                     'periodic open calls; the most recent call closed in August 2025. Join the fund’s '
                     'list to be notified of the next round.'),
        verified_link=True),
    # ---- Pass B: verified from the spreadsheet ----
    dict(
        name='Alter-Ciné Foundation Documentary Film Grants',
        funder='Alter-Ciné Foundation', funding_type='grant', cci_sector='film',
        eligible_countries=['Africa', 'Asia', 'Latin America'],
        amount='CAD 10,000 (top grant) + CAD 5,000',
        deadline=None, deadline_type='recurring',
        link='https://altercine.org/en/documentary-film-grants/',
        description=('Annual grants for documentary projects: CAD 10,000 for the leading project and '
                     'CAD 5,000 for a second. Open to filmmakers born and living in the Global South — '
                     'Africa, Asia and Latin America. Applications close 15 August each year.'),
        verified_link=True),
    dict(
        name='Culture Resource (Al Mawred) Production Grant',
        funder='Culture Resource (Al Mawred Al Thaqafy)', funding_type='grant', cci_sector='multi-sector',
        eligible_countries=['Arab region', 'North Africa'], amount=None,
        deadline='2026-10-19', deadline_type='fixed',
        link='https://mawred.org/en/', link_suffix='production-grant',
        description=('A production grant helping young artists and writers in the Arab region — '
                     'including North Africa — produce new artistic and literary projects. '
                     'Applications close 19 October 2026.'),
        verified_link=True),
    dict(
        name='CCA Lagos — Aṣíkò Art School',
        funder='Centre for Contemporary Art, Lagos', funding_type='residency', cci_sector='visual arts',
        eligible_countries=['Africa'], amount=None,
        deadline=None, deadline_type='recurring',
        link='https://ccalagos.org/', link_suffix='asiko',
        description=('Aṣíkò is a roving art school and residency — part workshop, part academy — '
                     'building critical art education across Nigeria and the wider continent. Open to African '
                     'artists experimenting beyond traditional modes of practice. Runs in periodic cohorts.'),
        verified_link=True),
]

SOURCE = 'curated'


def main():
    print(f'{"APPLY" if APPLY else "DRY RUN"} — {len(GRANTS)} curated opportunities\n')

    funders = rest('GET', 'funders?select=id,name')
    by_name = {f['name']: f for f in funders}

    # 1. Funders --------------------------------------------------------------
    print('1. Funder profiles')
    need = {}
    for g in GRANTS:
        need.setdefault(g['funder'], None)
    for name in need:
        if name in by_name:
            print(f'   ✓ link  {name}')
            need[name] = by_name[name]['id']
        elif name in FUNDERS:
            meta = FUNDERS[name]
            site = meta['website']
            body = {
                'name': name, 'slug': slugify(name), 'funder_type': meta['ftype'],
                'website': site, 'source_url': site, 'grants_page_url': site,
                'logo_url': f'https://www.google.com/s2/favicons?domain={urllib.parse.urlparse(site).netloc}&sz=128',
                'roles': ['funder'], 'is_active': True, 'last_verified': TODAY,
            }
            print(f'   +  create {name}  [{meta["ftype"]}]')
            if APPLY:
                row = rest('POST', 'funders', body, 'return=representation')[0]
                need[name] = row['id']
        else:
            print(f'   !  {name}: not found and no creation metadata — grant will be unlinked')

    # 2. Grants ---------------------------------------------------------------
    print('\n2. Opportunities')
    existing = {norm_link(o['source_url']) for o in rest('GET', 'opportunities?select=source_url')}
    payload = []
    for g in GRANTS:
        src = norm_link(g['link'])
        if g.get('link_suffix'):
            src = f'{src}#{g["link_suffix"]}'
        if src in existing:
            print(f'   =  already present: {g["name"]}')
            continue
        row = {
            'name': g['name'], 'funder': g['funder'], 'institution_id': need.get(g['funder']),
            'funding_type': g['funding_type'], 'cci_sector': g['cci_sector'],
            'eligible_countries': g['eligible_countries'], 'amount': g['amount'],
            'deadline': g['deadline'], 'deadline_type': g['deadline_type'],
            'application_link': g['link'], 'source_url': src,
            'description': g['description'], 'raw_text': None, 'source': SOURCE,
        }
        if g['verified_link']:
            row.update({'link_state': 'ok', 'link_ok': True, 'link_status': 200,
                        'link_fail_streak': 0, 'link_checked_at': NOW})
        else:
            row.update({'link_state': 'unverified', 'link_ok': False, 'link_checked_at': NOW})
        payload.append(row)
        tag = 'verified' if g['verified_link'] else 'portal/unverified'
        link = 'linked' if row['institution_id'] else 'UNLINKED'
        print(f'   +  {g["name"]}')
        print(f'        {g["funding_type"]} · {g["cci_sector"]} · {", ".join(g["eligible_countries"])} '
              f'· {g["deadline_type"]}{" " + g["deadline"] if g["deadline"] else ""} · {tag} · {link}')

    print(f'\n   {len(payload)} to insert, {len(GRANTS) - len(payload)} already present')

    if not APPLY:
        print('\nDry run — nothing written. Re-run with --apply to insert.')
        return
    # One row at a time: a single 400 in a batch rejects the whole batch and
    # hides which row caused it. Per-row, a bad row is named and the rest land.
    inserted = 0
    for row in payload:
        try:
            rest('POST', 'opportunities?on_conflict=source_url', [row],
                 'resolution=ignore-duplicates,return=minimal')
            inserted += 1
        except Exception as e:
            print(f'   ! failed: {row["name"]}: {e}')
    total = len(rest('GET', 'opportunities?select=id'))
    print(f'\nDONE. {inserted} inserted; {total} opportunities now.')
    print('Next: backfill_slugs.py --write, then extract_eligibility.py --write, then review_eligibility.py --go')


if __name__ == '__main__':
    main()
