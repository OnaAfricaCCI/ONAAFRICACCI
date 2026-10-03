"""
Add the new funders from the ANF Funder Database (Ona_Africa_No_Filter, 03 Oct 2026).

Of the 15 rows, 7 already exist in our funders table (Ford, Bloomberg, Mellon,
Open Society, British Council, Tony Elumelu, Meta) and are skipped to avoid
duplicates. The two spreadsheet rows for Access Bank and the ACT Foundation are
the same entity (ACT is Access Bank's corporate foundation) and are merged into
one. That leaves 7 new funder PROFILES to add.

No opportunities are added: every one of the 15 is a proactive / invitation-only
funder with no verified open African CCI call (confirmed against each page,
03 Oct 2026). Descriptions below say so plainly rather than implying an open call.

  python3 scripts/add_anf_funders_oct2026.py            # dry run
  python3 scripts/add_anf_funders_oct2026.py --apply    # write it
Then: backfill_slugs.py --write  (slugs are set here, but harmless to re-run)
"""
import json, os, re, sys, unicodedata, urllib.parse, urllib.request
APPLY = '--apply' in sys.argv
TODAY = '2026-10-03'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = {l.split('=',1)[0]: l.split('=',1)[1].strip().strip('"')
       for l in open(os.path.join(ROOT,'.env.local')) if '=' in l and not l.startswith('#')}
URL, KEY = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/'), env['SUPABASE_SERVICE_ROLE_KEY']
HDR = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}
def rest(method, path, body=None, prefer=None):
    h = dict(HDR)
    if prefer: h['Prefer'] = prefer
    req = urllib.request.Request(f'{URL}/rest/v1/{path}', method=method, headers=h,
                                 data=json.dumps(body).encode() if body is not None else None)
    with urllib.request.urlopen(req, timeout=45) as r:
        raw = r.read(); return json.loads(raw) if raw else None
def slugify(n):
    s = unicodedata.normalize('NFKD', n).encode('ascii','ignore').decode().lower()
    return re.sub(r'(^-|-$)','', re.sub(r'[^a-z0-9]+','-', s))
def favicon(site): return f'https://www.google.com/s2/favicons?domain={urllib.parse.urlparse(site).netloc}&sz=128'

# name, type, website, hub, cci_sectors, regions, description
NEW = [
 ('Luminate', 'Philanthropic organisation', 'https://luminategroup.com/', 'https://luminategroup.com/',
  ['media','journalism','digital storytelling'], ['Africa','Global'],
  'Luminate is a global philanthropic organisation backing independent media, journalism, digital storytelling and '
  'civic-narrative work. It funds in Africa through programme- and geography-specific strategies; support is '
  'predominantly strategic and proactive rather than through open public calls.'),
 ('Comic Relief', 'Charitable foundation', 'https://www.comicrelief.org/', 'https://www.comicrelief.org/grants/',
  ['storytelling','media','social change communications'], ['Africa','United Kingdom'],
  'Comic Relief is a UK charitable grantmaker funding storytelling, media and social-change communications, including '
  'work across Africa. Creative-industries eligibility is call-specific, and there is no standing Africa-wide open CCI call.'),
 ('Conrad N. Hilton Foundation', 'Private foundation', 'https://www.hiltonfoundation.org/', 'https://www.hiltonfoundation.org/grants/search/',
  ['storytelling','narrative'], ['Africa','Global'],
  'The Conrad N. Hilton Foundation is a large US private foundation active across several African countries. Creative '
  'and cultural industries are not a core grantmaking area; any narrative or storytelling support occurs through '
  'partnerships, and the foundation does not accept unsolicited proposals.'),
 ('William and Flora Hewlett Foundation', 'Private foundation', 'https://hewlett.org/', 'https://hewlett.org/grants/',
  ['arts','culture','media','narrative'], ['East Africa','West Africa'],
  'The William and Flora Hewlett Foundation is a US private foundation whose grantmaking includes arts and culture and '
  'media/narrative work, with selected programmes in East and West Africa. Funding is primarily proactive and '
  'strategy-led; CCI eligibility depends on the specific programme.'),
 ('Bill & Melinda Gates Foundation', 'Private foundation', 'https://www.gatesfoundation.org/', 'https://www.gatesfoundation.org/about/our-funding',
  ['film','television','podcasting','digital media','storytelling'], ['Kenya','Nigeria'],
  'The Bill & Melinda Gates Foundation supports entertainment and media work — film, TV, podcasting and digital '
  'storytelling — in Africa, including an Entertainment and Media Hubs programme delivered with Africa No Filter in '
  'Kenya and Nigeria. Funding is programme- and partner-led, with no general open application window.'),
 ('Mastercard Foundation', 'Private foundation', 'https://mastercardfdn.org/', 'https://mastercardfdn.org/en/what-we-do/our-programs/',
  ['creative industries','digital creative enterprises','crafts'], ['Africa','Kenya'],
  'The Mastercard Foundation backs creative industries and digital creative enterprises in Africa, including a Kenya '
  'Inclusive Creatives Program aimed at expanding dignified work for young creatives. Programmes are delivered with '
  'partners rather than through open public applications.'),
 ('Aspire Coronation Trust Foundation (ACT Foundation)', 'Corporate foundation', 'https://actrustfoundation.org/', 'https://actrustfoundation.org/',
  ['arts','culture','entrepreneurship','community development'], ['Nigeria','Africa'],
  'The Aspire Coronation Trust (ACT) Foundation is the corporate foundation of Access Bank, making grants primarily in '
  'Nigeria across health, education, environment, entrepreneurship and arts/culture where aligned. Creative-industries '
  'eligibility is call-specific, with grant calls announced periodically.'),
]

def main():
    print(f'{"APPLY" if APPLY else "DRY RUN"} — {len(NEW)} new funders to add\n')
    existing = {f['name'] for f in rest('GET','funders?select=name')}
    existing_slugs = {f['slug'] for f in rest('GET','funders?select=slug')}
    added=0
    for name, ftype, site, hub, sectors, regions, desc in NEW:
        slug = slugify(name)
        if name in existing or slug in existing_slugs:
            print(f'   =  already present: {name}'); continue
        body = {'name': name, 'slug': slug, 'funder_type': ftype, 'description': desc,
                'website': site, 'grants_page_url': hub, 'source_url': site,
                'logo_url': favicon(site), 'cci_sectors': sectors, 'regions_of_focus': regions,
                'roles': ['funder'], 'is_active': True, 'last_verified': TODAY,
                'notes': 'Added from ANF Funder Database (03 Oct 2026). Proactive/invitation-based; no open African CCI call verified at time of adding.'}
        if name.startswith('Aspire'): body['acronym'] = 'ACT Foundation'
        print(f'   +  {name}  [{ftype}]  /{slug}')
        if APPLY:
            rest('POST','funders', body, 'return=minimal'); added+=1
    print(f'\n   {added if APPLY else len([n for n in NEW if n[0] not in existing])} to add')
    if not APPLY: print('\nDry run — nothing written.'); return
    total = len(rest('GET','funders?select=id'))
    print(f'\nDONE. {added} funders added; {total} funders total.')
if __name__ == '__main__': main()
