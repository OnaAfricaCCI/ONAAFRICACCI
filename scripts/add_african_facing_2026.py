"""
Add the hand-verified opportunities from the African-Facing deep-research sheet
(1 Oct 2026). Same discipline as add_curated_grants.py: each field read off the
funder's own page (a sample was re-verified live), funders linked or created,
deduped by source_url, inserted one row at a time, nothing invented.

  python3 scripts/add_african_facing_2026.py            # dry run
  python3 scripts/add_african_facing_2026.py --apply    # write it
Then: backfill_slugs.py --write ; extract_eligibility.py --write ; review_eligibility.py --go
"""
import json, os, re, sys, unicodedata, urllib.parse, urllib.request
APPLY = '--apply' in sys.argv
TODAY = '2026-10-01'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = {l.split('=',1)[0]: l.split('=',1)[1].strip().strip('"')
       for l in open(os.path.join(ROOT,'.env.local')) if '=' in l and not l.startswith('#')}
URL, KEY = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/'), env['SUPABASE_SERVICE_ROLE_KEY']
HDR = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}
def rest(method, path, body=None, prefer=None):
    h = dict(HDR); 
    if prefer: h['Prefer'] = prefer
    req = urllib.request.Request(f'{URL}/rest/v1/{path}', method=method, headers=h,
                                 data=json.dumps(body).encode() if body is not None else None)
    with urllib.request.urlopen(req, timeout=45) as r:
        raw = r.read(); return json.loads(raw) if raw else None
def slugify(n):
    s = unicodedata.normalize('NFKD', n).encode('ascii','ignore').decode().lower()
    return re.sub(r'(^-|-$)','', re.sub(r'[^a-z0-9]+','-', s))
def norm_link(u): return re.sub(r'/$','',(u or '').strip().lower().split('?')[0])

INSTITUT = '3490b024-0000'  # resolved by name below; placeholder not used
# Funders to create if missing (name -> site, type). Existing ones are linked by name.
FUNDERS = {
 'Look Aside Films': ('https://lookasidefilms.com','Independent film company'),
 'From the Heart Productions': ('https://fromtheheartproductions.com','Non-profit / production company'),
 'Sabi Arts': ('https://sabiarts.org','Arts organisation'),
 'PhMuseum': ('https://phmuseum.com','Photography platform'),
 'Art Explora Foundation': ('https://www.artexplora.org','Foundation'),
 'Vital Impacts': ('https://vitalimpacts.org','Non-profit'),
 'W. Eugene Smith Memorial Fund': ('https://www.smithfund.org','Foundation'),
 'Santu Mofokeng Foundation': ('https://santumofokengfoundation.com','Foundation'),
 'Wellcome': ('https://wellcome.org','Foundation'),
 'Rele Arts Foundation': ('https://www.releartsfoundation.org','Arts organisation'),
 'Onewater': ('https://onewater.blue','Non-profit / initiative'),
 'Rotterdam Photo': ('https://rotterdamphoto.eu','Photography festival'),
}
def R(name, funder, ft, cci, elig, amount, deadline, dtype, link, desc, suffix=None):
    return dict(name=name, funder=funder, funding_type=ft, cci_sector=cci, eligible_countries=elig,
                amount=amount, deadline=deadline, deadline_type=dtype, link=link, description=desc, link_suffix=suffix)

RECORDS = [
 R('Look Aside Film Fund — Primary Fund','Look Aside Films','grant','film',['Worldwide'],
   '£5,000 production funding, plus in-kind services, mentoring and festival support','2026-11-29','fixed',
   'https://filmfreeway.com/LookAsideFilmsFund',
   'A production grant of £5,000 plus in-kind services, mentoring and festival support for a short film. Open to writers, directors and producers worldwide (18+); production can take place anywhere. The 2026/27 round opened 28 September 2026, with a regular deadline of 1 November and a late deadline of 29 November 2026.',
   'primary'),
 R('Look Aside Film Fund — Debut Fund','Look Aside Films','grant','film',['Worldwide'],
   '£1,000 production funding, plus in-kind services, mentoring and festival support','2026-11-29','fixed',
   'https://filmfreeway.com/LookAsideFilmsFund',
   'A production grant of £1,000 plus in-kind services, mentoring and festival support for new and emerging filmmakers making a short film. Open to writers, directors and producers worldwide (18+). The 2026/27 round opened 28 September 2026; regular deadline 1 November, late deadline 29 November 2026.',
   'debut'),
 R('Relais Connect & Create','Institut francais','other','media',
   ['South Africa','Benin','Cameroon','Ghana','Guinea','Kenya','Mali','Mozambique'],
   None,'2026-10-13','fixed',
   'https://www.institutfrancais.com/fr/programme/aide-projet/connect-create-renforcer-liens-culturels-afrique-europe',
   'An 11-month professional-development programme (10 themed training sessions plus individual mentoring, 16 places) for young communications professionals, journalists and content creators. Open to residents of South Africa, Benin, Cameroon, Ghana, Guinea, Kenya, Mali, Mozambique and other eligible African countries. Applications 15 September–13 October 2026; the programme starts in early 2027.'),
 R('Thuthuka Film Co-production Fund','National Film and Video Foundation (NFVF)','grant','film',['South Africa'],
   'Development up to €40,000; production up to €250,000 (feature) or €100,000 (documentary)','2026-10-06','fixed',
   'https://www.nfvf.co.za/',
   'A co-production fund run by the NFVF with the Netherlands Film Fund: development support up to €40,000 and production support up to €250,000 for a feature or €100,000 for a documentary. For South African producers with a qualifying Dutch co-production connection. 2026 deadline: 6 October 2026.'),
 R('Roy W. Dean Film Grant','From the Heart Productions','grant','film',['Worldwide'],
   'US$3,500 cash plus up to $15,000 in original music, $500 in equipment/services and other donated support','None','recurring',
   'https://fromtheheartproductions.com/grants/',
   'A film grant giving US$3,500 in cash plus substantial in-kind production support (original music, equipment and services) to a project with a budget under $500,000. Open to filmmakers worldwide; international applications are explicitly accepted. Runs in recurring cycles; the Fall 2026 cycle is current.'),
 R('Sabi Arts Playwright Prize','Sabi Arts','prize','theatre',['Nigeria','Diaspora'],
   '₦1,000,000 grand prize plus a full professional production; ₦200,000 runner-up; ₦200,000 Julie Okoh Prize','2026-12-20','fixed',
   'https://sabiarts.org/competition',
   'A playwriting prize awarding ₦1,000,000 and a full professional production for the winning play, with a ₦200,000 runner-up prize and the ₦200,000 Julie Okoh Prize, plus writer’s-residency access. Open to Nigerian playwrights aged 18 and over, resident in Nigeria or the diaspora. Entries 1 October–20 December 2026; winners announced 31 March 2027.'),
 R('PHmuseum 2026 Women Photographers Grant','PhMuseum','grant','photography',['Worldwide'],
   '€10,000 in cash prizes plus a €5,000 MPB voucher, exhibition and publication','2026-10-15','fixed',
   'https://phmuseum.com/grants/women-photographers-grant',
   'A photography grant of €10,000 in cash prizes plus a €5,000 equipment voucher, exhibition, a Vogue Italia feature and festival screening. Open to women and non-binary photographers worldwide. Deadline 15 October 2026.'),
 R('Art Explora x Cité internationale des arts Residency 2027','Art Explora Foundation','residency','visual arts',['Worldwide'],
   None,'2026-10-30','fixed',
   'https://www.artexplora.org/residences-dartistes-presentation-du-programme',
   'A 3- or 6-month residency in Paris with studio and residency support and professional development, run by the Art Explora Foundation with the Cité internationale des arts. Open to artists and researchers of all nationalities. Applications 21 September–30 October 2026.'),
 R('Rotterdam Photo 2027 — International Projects','Rotterdam Photo','grant','photography',['Worldwide'],
   'Financial support, artistic mentorship and festival presentation for selected projects',None,'recurring',
   'https://rotterdamphoto.eu/open-calls/',
   'Selected international photography and visual-media projects receive financial support, artistic mentorship and presentation at the Rotterdam Photo festival. Open to photographers and image-makers worldwide. 2027 open call deadline 4 October 2026.'),
 R('Vital Impacts Environmental Photography Fellowships 2027','Vital Impacts','fellowship','photography',['Worldwide'],
   'One US$20,000 fellowship and six US$5,000 fellowships, plus 10 mentorship places','2026-11-30','fixed',
   'https://vitalimpacts.org/pages/the-vital-impacts-environmental-photography-grant',
   'Photography fellowships for environmental storytelling: one US$20,000 fellowship and six US$5,000 fellowships, plus ten mentorship places. Open to visual storytellers internationally; the application fee is waived for applicants from developing countries. Applications 31 August–30 November 2026.'),
 R('W. Eugene Smith Grant 2026','W. Eugene Smith Memorial Fund','grant','photography',['Worldwide'],
   'US$30,000 grant plus two US$10,000 finalist grants','2026-10-12','fixed',
   'https://www.smithfund.org/eugene-smith-grant',
   'The W. Eugene Smith Grant in Humanistic Photography: a US$30,000 grant plus two US$10,000 finalist grants for a documentary photography project. Open to photographers worldwide aged 18 and over; professional status is not required, and international applications are explicitly encouraged. Applications 1 July–12 October 2026.'),
 R('Santu Mofokeng Foundation Photography Prize','Santu Mofokeng Foundation','prize','photography',['South Africa'],
   'ZAR 100,000','2026-10-15','fixed',
   'https://santumofokengfoundation.com/',
   'A photography prize of ZAR 100,000 for emerging photographers working in South Africa. The 2026 deadline is reported as 15 October 2026; confirm the official application route on the foundation’s site before applying.'),
 R('Wellcome Photography Prize 2027','Wellcome','prize','photography',['Worldwide'],
   '£10,000 for each category winner; 22 further entries receive £1,000','2026-10-21','fixed',
   'https://wellcome.org/you-and-your-work/wellcome-photography-prize',
   'A photography prize on health, science and society: £10,000 to each category winner, with 22 further selected entries receiving £1,000. Open to photographers and image-makers in any country, subject to sanctions and payment restrictions. Deadline 21 October 2026.'),
 R('French Institute x Cité internationale des arts Residencies 2027/28','Institut francais','residency','visual arts',['Africa'],
   '3-, 6- or 9-month residency in Paris with studio and residential support',None,'recurring',
   'https://www.citeinternationaledesarts.fr/en/appels-a-candidature/institut-francais-residencies',
   'A 3-, 6- or 9-month residency in Paris with studio and residential support and access to a professional network, run by the Institut français with the Cité internationale des arts. Open to professional artists and cultural workers residing outside France; African artists residing in Africa can be eligible subject to partner support. Applications 2 July–8 October 2026.'),
 R('The R2 Space — Rele Arts Foundation Residency','Rele Arts Foundation','residency','visual arts',['Africa','Diaspora'],
   'US$500 monthly stipend, workspace and funding, over 1–3 months',None,'rolling',
   'https://www.releartsfoundation.org/r2-residency-program',
   'A 1-to-3-month residency in Lagos with a US$500 monthly stipend, workspace and funding, and a possible gallery presentation. Open to professional African and diaspora artists, curators, writers and researchers (mid-career, 35+). Applications are open annually, with residency periods running January to December.'),
 R('Walk of Water Photostory Contest 2026','Onewater','prize','photography',['Worldwide'],
   'US$9,000 total prize money; free to enter',None,'recurring',
   'https://onewater.blue/contest/walk-of-water-photostory-contest-out-of-sight',
   'A photostory contest on water and the environment with US$9,000 in total prize money and free entry, run by Onewater with UNESCO WWAP and UNEP. Open to photographers of all levels worldwide; a previous edition included a dedicated Sub-Saharan Africa youth category. The 2026 edition runs 1 October–30 November 2026.'),
 R('Alliance Française / Institut français — AOCA Support for Cultural Operators in Africa','Institut francais','grant','multi-sector',['Africa'],
   'Project support for creative and dissemination projects and events in Africa',None,'recurring',
   'https://www.institutfrancais.com/en/programme/project-support/aoca-support-cultural-operators-africa',
   'Project support for creative and dissemination projects and events in Africa, and for international cultural cooperation, through the Institut français and the French cultural network (Alliances Françaises). For African cultural institutions and organisations based in Africa. Applications 1 July–30 October 2026.'),
]
SOURCE='african-facing-2026'
def main():
    print(f'{"APPLY" if APPLY else "DRY RUN"} — {len(RECORDS)} opportunities\n')
    funders = rest('GET','funders?select=id,name'); by_name={f['name']:f['id'] for f in funders}
    print('1. Funders')
    need={r['funder'] for r in RECORDS}
    fid={}
    for name in sorted(need):
        if name in by_name: print(f'   ✓ link  {name}'); fid[name]=by_name[name]
        elif name in FUNDERS:
            site,ft=FUNDERS[name]
            body={'name':name,'slug':slugify(name),'funder_type':ft,'website':site,'source_url':site,
                  'grants_page_url':site,'logo_url':f'https://www.google.com/s2/favicons?domain={urllib.parse.urlparse(site).netloc}&sz=128',
                  'roles':['funder'],'is_active':True,'last_verified':TODAY}
            print(f'   +  create {name}  [{ft}]')
            if APPLY: fid[name]=rest('POST','funders',body,'return=representation')[0]['id']
        else: print(f'   !  {name}: no metadata'); 
    print('\n2. Opportunities')
    existing={norm_link(o['source_url']) for o in rest('GET','opportunities?select=source_url')}
    payload=[]
    for r in RECORDS:
        src=norm_link(r['link'])+ (f"#{r['link_suffix']}" if r['link_suffix'] else '')
        if src in existing: print(f'   =  present: {r["name"]}'); continue
        row={'name':r['name'],'funder':r['funder'],'institution_id':fid.get(r['funder']),
             'funding_type':r['funding_type'],'cci_sector':r['cci_sector'],'eligible_countries':r['eligible_countries'],
             'amount':r['amount'],'deadline':(None if r['deadline'] in (None,'None') else r['deadline']),
             'deadline_type':r['deadline_type'],'application_link':r['link'],'source_url':src,
             'description':r['description'],'raw_text':None,'source':SOURCE}
        payload.append(row)
        print(f'   +  {r["name"][:52]}  [{r["funding_type"]}·{r["cci_sector"]}·{",".join(r["eligible_countries"])[:24]}·{r["deadline_type"]}{" "+r["deadline"] if r["deadline"] not in (None,"None") else ""}]')
    print(f'\n   {len(payload)} to insert')
    if not APPLY: print('\nDry run — nothing written.'); return
    ins=0
    for row in payload:
        try: rest('POST','opportunities?on_conflict=source_url',[row],'resolution=ignore-duplicates,return=minimal'); ins+=1
        except Exception as e: print(f'   ! failed {row["name"]}: {e}')
    print(f'\nDONE. {ins} inserted; {len(rest("GET","opportunities?select=id"))} total.')
if __name__=='__main__': main()
