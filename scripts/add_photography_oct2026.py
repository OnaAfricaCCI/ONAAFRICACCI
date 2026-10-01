"""
Two jobs, both from the LagosPhoto "Photography Opportunities" triage (2 Oct 2026):

  1. CORRECT the existing PhotoVogue MENA Panorama record. It was stored as
     recurring with no deadline, but Picter (the submission platform) and Vogue
     both say the 2026 open call runs 21 May – 15 October 2026 and is open to the
     Middle East, NORTH AFRICA and the diaspora. Fix it to a fixed 2026-10-15.
  2. ADD two verified, open, Africa-eligible opportunities not yet in the DB:
       - Earth Partner Prize 2026   (earthpartner.com, verified live)
       - Sony World Photography Awards 2027 (worldphoto.org, verified live)

Same discipline as add_african_facing_2026.py: every field read off the funder's
own page, funders created with a description (so their profile pages publish),
deduped by source_url, inserted one row at a time, nothing invented.

  python3 scripts/add_photography_oct2026.py            # dry run
  python3 scripts/add_photography_oct2026.py --apply    # write it
Then: backfill_slugs.py --write ; extract_eligibility.py --write ; review_eligibility.py --go
"""
import json, os, re, sys, unicodedata, urllib.parse, urllib.request
APPLY = '--apply' in sys.argv
TODAY = '2026-10-02'
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
def norm_link(u): return re.sub(r'/$','',(u or '').strip().lower().split('?')[0])

# ---- 1. MENA Panorama correction -------------------------------------------
MENA_ID = 'e8ae43ae-9b2f-4793-8671-88581e601d2a'
MENA_FIX = {
    'deadline': '2026-10-15',
    'deadline_type': 'fixed',
    'description': (
        'A free regional open call by PhotoVogue (Condé Nast) spotlighting image-makers '
        'from the Middle East, North Africa and the diaspora, with US$8,000 in grants split '
        'between selected artists plus publication on Vogue. Open to photographers and video '
        'artists; North African nationals and the diaspora are eligible. Submissions run on '
        'Picter from 21 May to 15 October 2026 (11:59 PM CEST).'
    ),
}

# ---- 2. New funders (created with a description so profiles publish) --------
FUNDERS = {
 'World Photography Organisation': ('https://www.worldphoto.org', 'Photography organisation',
   'A global platform for photography that runs the annual Sony World Photography Awards and '
   'related exhibitions and programmes, championing photographers worldwide through free-to-enter '
   'competitions.'),
 'Earth Partner': ('https://earthpartner.com', 'Non-profit / initiative',
   'A non-profit initiative using art and storytelling to drive action on the ecological crisis, '
   'running the annual Earth Partner Prize in collaboration with the Global Environment Facility '
   '(GEF) and Re:wild.'),
}

def R(name, funder, ft, cci, elig, amount, deadline, dtype, link, desc):
    return dict(name=name, funder=funder, funding_type=ft, cci_sector=cci, eligible_countries=elig,
                amount=amount, deadline=deadline, deadline_type=dtype, link=link, description=desc)

RECORDS = [
 R('Earth Partner Prize 2026','Earth Partner','prize','multi-sector',['Worldwide'],
   'Eight cash prizes of US$10,000, US$5,000 or US$2,000, plus 20 honourable mentions; free to enter',
   '2026-10-07','fixed','https://earthpartner.com/earth-partner-prize/',
   'An open call for climate-focused creative work in any medium — photography, film, music, '
   'performance, spoken word, dance, fashion, new media and more — run by Earth Partner with the '
   'Global Environment Facility and Re:wild. Eight finalists receive cash prizes of US$10,000, '
   'US$5,000 or US$2,000, with 20 honourable mentions chosen by an international panel. Open to '
   'artists of all nationalities aged 14–30; free to enter. Deadline 7 October 2026 (CEST).'),
 R('Sony World Photography Awards 2027','World Photography Organisation','prize','photography',['Worldwide'],
   'US$25,000 (Series winner) and US$5,000 (Single Image winner), plus Sony digital imaging equipment; free to enter',
   '2027-01-12','fixed','https://www.worldphoto.org/sony-world-photography-awards',
   'A free-to-enter international photography competition run by the World Photography Organisation, '
   'across four competitions: Series (professional; US$25,000), Single Image (US$5,000), Student, and '
   'Youth (under 19), each also awarding Sony digital imaging equipment and global exhibition exposure. '
   'Open to photographers worldwide. 2027 deadlines: Student 27 November 2026; Single Image and Youth '
   '5 January 2027; Series 12 January 2027.'),
]
SOURCE='photography-oct-2026'

def main():
    print(f'{"APPLY" if APPLY else "DRY RUN"}\n')

    # 1. MENA correction
    print('1. Correct MENA Panorama')
    cur = rest('GET', f'opportunities?select=name,deadline,deadline_type&id=eq.{MENA_ID}')
    if not cur:
        print('   ! record not found — skipping')
    else:
        print(f'   was: {cur[0]["deadline_type"]} / {cur[0]["deadline"]}')
        print(f'   ->  {MENA_FIX["deadline_type"]} / {MENA_FIX["deadline"]}')
        if APPLY:
            rest('PATCH', f'opportunities?id=eq.{MENA_ID}', MENA_FIX, 'return=minimal')
            print('   patched.')

    # 2. Funders
    print('\n2. Funders')
    funders = rest('GET','funders?select=id,name'); by_name={f['name']:f['id'] for f in funders}
    fid={}
    for name in sorted({r['funder'] for r in RECORDS}):
        if name in by_name: print(f'   ✓ link  {name}'); fid[name]=by_name[name]; continue
        site,ft,desc=FUNDERS[name]
        body={'name':name,'slug':slugify(name),'funder_type':ft,'description':desc,'website':site,
              'source_url':site,'grants_page_url':site,
              'logo_url':f'https://www.google.com/s2/favicons?domain={urllib.parse.urlparse(site).netloc}&sz=128',
              'roles':['funder'],'is_active':True,'last_verified':TODAY}
        print(f'   +  create {name}  [{ft}]')
        if APPLY: fid[name]=rest('POST','funders',body,'return=representation')[0]['id']

    # 3. Opportunities
    print('\n3. Opportunities')
    existing={norm_link(o['source_url']) for o in rest('GET','opportunities?select=source_url')}
    payload=[]
    for r in RECORDS:
        src=norm_link(r['link'])
        if src in existing: print(f'   =  present: {r["name"]}'); continue
        payload.append({'name':r['name'],'funder':r['funder'],'institution_id':fid.get(r['funder']),
            'funding_type':r['funding_type'],'cci_sector':r['cci_sector'],'eligible_countries':r['eligible_countries'],
            'amount':r['amount'],'deadline':r['deadline'],'deadline_type':r['deadline_type'],
            'application_link':r['link'],'source_url':src,'description':r['description'],'raw_text':None,'source':SOURCE})
        print(f'   +  {r["name"][:48]}  [{r["funding_type"]}·{r["cci_sector"]}·{r["deadline_type"]} {r["deadline"]}]')
    print(f'\n   {len(payload)} to insert')
    if not APPLY: print('\nDry run — nothing written.'); return
    ins=0
    for row in payload:
        try: rest('POST','opportunities?on_conflict=source_url',[row],'resolution=ignore-duplicates,return=minimal'); ins+=1
        except Exception as e: print(f'   ! failed {row["name"]}: {e}')
    print(f'\nDONE. {ins} inserted; {len(rest("GET","opportunities?select=id"))} total opportunities.')
if __name__=='__main__': main()
