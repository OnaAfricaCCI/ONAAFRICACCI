"""
Stage 2b: sync grants from the Consolidated Funding Database and link every
opportunity to an institution profile.

  1. Link existing opportunities to institutions by funder name
  2. Create institutions for parent funders that don't exist yet (role: funder)
  3. Insert consolidated grants not already present (deduplicated by link)

Run:  python3 scripts/import_grants.py            (dry run)
      python3 scripts/import_grants.py --apply
"""
import json, os, re, sys, unicodedata, datetime
import urllib.request, urllib.parse
import openpyxl

APPLY = '--apply' in sys.argv
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = os.path.expanduser('~/Downloads/Consolidated_African_CCI_Funding_Database_2026.xlsx')

env = {l.split('=', 1)[0]: l.split('=', 1)[1].strip().strip('"') for l in open(os.path.join(ROOT, '.env.local')) if '=' in l and not l.startswith('#')}
URL, KEY = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/'), env['SUPABASE_SERVICE_ROLE_KEY']
HDR = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}
def rest(method, path, body=None, prefer=None):
    h = dict(HDR); h.update({'Prefer': prefer} if prefer else {})
    req = urllib.request.Request(f'{URL}/rest/v1/{path}', method=method, headers=h,
                                 data=json.dumps(body).encode() if body is not None else None)
    with urllib.request.urlopen(req) as r:
        raw = r.read(); return json.loads(raw) if raw else None
get = lambda p: rest('GET', p)
patch = lambda p, b: rest('PATCH', p, b, 'return=minimal')
post = lambda p, b, pref='return=representation': rest('POST', p, b, pref)
say = print

# ---- name matching -----------------------------------------------------------
def fold(s):  # accent- and punctuation-insensitive
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]', '', s.lower())

# Variants in the funding file that mean an institution we already have.
ALIASES = {
    'Centre Cinématographique Marocain': 'Morocco: Centre Cinematographique Marocain (CCM)',
    'Centre Cinématographique Marocain (CCM)': 'Morocco: Centre Cinematographique Marocain (CCM)',
    'Swiss Arts Council Pro Helvetia': 'Pro Helvetia (Swiss Arts Council)',
    'YouTube / Google': 'Google / YouTube',
    'IFC / Sony Group': 'International Finance Corporation (IFC)',
    'Department of Trade, Industry and Competition (dtic)': 'Department of Trade, Industry and Competition (South Africa)',
    'Federal Government of Nigeria / Ministry of Art, Culture, Tourism and Creative Economy': 'Federal Ministry of Arts, Culture, Tourism & Creative Economy, Nigeria',
    'South African Department of Sport, Arts and Culture / NAC and partners': 'Department of Sport, Arts and Culture (South Africa)',
    'International Film Festival Rotterdam': 'IFFR / Hubert Bals Fund',
    'Berlinale / German Federal Cultural Foundation and partners': 'World Cinema Fund (Berlinale)',
    'UNESCO World Heritage Centre': 'UNESCO',
    'European Union / Organisation of ACP States': 'ACP-EU Culture programme',
    'Government of Senegal / Ministry of Culture': 'Senegal: FOPICA',
}
# Any "Institut français / …" partnership rolls up to Institut français
def alias_for(name):
    if name in ALIASES: return ALIASES[name]
    if name.startswith('Institut français'): return 'Institut francais'
    return None

def primary_name(parent):
    """First-named party of a 'X / Y / partners' string."""
    p = re.split(r'\s+/\s+|\s+\+\s+', parent)[0].strip()
    p = re.sub(r'\s*(chapters|partners|and partners|partner consortia)$', '', p, flags=re.I).strip()
    return p

# ---- load ---------------------------------------------------------------------
inst = get('funders?select=id,name,website,roles')
by_fold = {fold(i['name']): i for i in inst}
by_name = {i['name']: i for i in inst}

def resolve(parent):
    a = alias_for(parent)
    if a and a in by_name: return by_name[a]
    f = fold(parent)
    if f in by_fold: return by_fold[f]
    pf = fold(primary_name(parent))
    if pf in by_fold: return by_fold[pf]
    hits = [i for k, i in by_fold.items() if len(k) > 8 and (k in f or f in k)]
    return max(hits, key=lambda i: len(i['name'])) if hits else None

opps = get('opportunities?select=id,name,funder,source_url,application_link,institution_id')
wb = openpyxl.load_workbook(XLSX, read_only=True)
rows = [r for r in wb['Consolidated Funding Database'].iter_rows(values_only=True) if r and any(r)]
hi = next(i for i, r in enumerate(rows) if sum(1 for c in r if c) > 5)
H = {h: i for i, h in enumerate(rows[hi])}; data = rows[hi + 1:]
s = lambda v: str(v).strip() if v not in (None, '') else None
say(f'{"APPLY" if APPLY else "DRY RUN"} — {len(data)} consolidated grants, {len(opps)} existing, {len(inst)} institutions')

# ---- 1. link existing ---------------------------------------------------------
say('\n1. Link existing opportunities')
linked = 0; unlinked = []
for o in opps:
    if o['institution_id'] or not o['funder']: continue
    i = resolve(o['funder'])
    if i:
        linked += 1
        if APPLY: patch(f'opportunities?id=eq.{o["id"]}', {'institution_id': i['id']})
    else: unlinked.append(o['funder'])
say(f'  linked {linked}; left unlinked (no matching institution): {sorted(set(unlinked))}')

# ---- 2. new institutions for unknown parent funders --------------------------
say('\n2. New funder institutions')
nl = lambda u: re.sub(r'/$', '', (u or '').strip().lower().split('?')[0])
have = {nl(o['source_url']) for o in opps} | {nl(o['application_link']) for o in opps}; have.discard('')
new_rows = [r for r in data if nl(s(r[H['Direct programme / application link']])) not in have]
say(f'  (grants to add: {len(new_rows)}; already present: {len(data) - len(new_rows)})')

# Generic catch-alls that are not an institution; their grants stay unlinked.
NOT_AN_INSTITUTION = {'Foreign embassies and cultural agencies'}

created = 0
for r in new_rows:
    parent = s(r[H['Parent funder']])
    if not parent or resolve(parent): continue
    name = primary_name(parent)
    if name in NOT_AN_INSTITUTION or fold(name) in by_fold: continue
    site = s(r[H['Institution website']])
    ftype = s(r[H['Funder type']])
    body = {'name': name, 'slug': re.sub(r'(^-|-$)', '', re.sub(r'[^a-z0-9]+', '-', fold(name) if False else name.lower())),
            'funder_type': ftype, 'website': site, 'source_url': site, 'grants_page_url': s(r[H['Funding opportunities hub']]) or site,
            'logo_url': f'https://www.google.com/s2/favicons?domain={urllib.parse.urlparse(site).netloc}&sz=128' if site else None,
            'roles': ['funder'], 'is_active': True, 'last_verified': '2026-09-15'}
    body['slug'] = re.sub(r'(^-|-$)', '', re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFKD', name).encode('ascii','ignore').decode().lower()))
    say(f'  + {name}  [{ftype or "?"}]')
    created += 1
    if APPLY:
        row = post('funders', body)[0]
        by_fold[fold(name)] = row; by_name[name] = row
say(f'  {created} to create')

# ---- 3. insert grants ---------------------------------------------------------
say('\n3. Insert grants')
def funding_type(t):
    t = (t or '').lower()
    for k, v in [('grant','grant'),('prize','prize'),('competition','prize'),('award','prize'),('fellowship','fellowship'),
                 ('residenc','residency'),('loan','loan'),('invest','investment'),('scholarship','scholarship')]:
        if k in t: return v
    return 'other'
def sector(raw):
    if not raw: return None
    f = re.split(r'[;,]', raw)[0].strip().lower()
    return 'multi-sector' if any(w in f for w in ('all', 'wider', 'various', 'cross')) else f
def deadline_type(cycle, status):
    t = f'{cycle or ""} {status or ""}'.lower()
    if 'rolling' in t: return 'rolling'
    if any(w in t for w in ('annual','biennial','recurring','cycles','cohort')): return 'recurring'
    if re.search(r'\d{1,2} \w+ 202\d|closes|deadline', t): return 'fixed'
    return 'unknown'
MONTHS = dict(jan=1,feb=2,mar=3,apr=4,may=5,jun=6,jul=7,aug=8,sep=9,oct=10,nov=11,dec=12)
def iso_deadline(cycle, status):
    m = re.search(r'(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{4})?', f'{cycle or ""} {status or ""}')
    if not m: return None
    return f'{m.group(3) or 2026}-{MONTHS[m.group(2).lower()[:3]]:02d}-{int(m.group(1)):02d}'

payload = []
for r in new_rows:
    g = lambda k: s(r[H[k]])
    parent = g('Parent funder'); i = resolve(parent) if parent else None
    cycle, status, award, who, elig = g('Typical cycle / deadline'), g('Status (15 September 2026)'), g('Award / what it funds'), g('Who it supports'), g('African eligibility')
    desc = ' '.join(x for x in [
        f'{award.rstrip(".")}.' if award else None,
        f'Supports {who[0].lower()}{who[1:].rstrip(".")}.' if who else None,
        f'Cycle: {cycle.rstrip(".")}.' if cycle else None,
        f'Status: {status.rstrip(".")}.' if status else None] if x)
    link = g('Direct programme / application link')
    payload.append({
        'name': g('Grant / programme'), 'funder': parent, 'institution_id': i['id'] if i else None,
        'funding_type': funding_type(g('Support type')), 'cci_sector': sector(g('CCI area(s)')),
        'eligible_countries': [e.strip() for e in re.split(r'[;+]', elig or '') if e.strip()],
        'amount': award[:200] if award else None,
        'deadline': iso_deadline(cycle, status), 'deadline_type': deadline_type(cycle, status),
        'application_link': link, 'source_url': nl(link) or None, 'description': desc or None,
        'raw_text': None, 'source': 'consolidated',
    })
say(f'  {len(payload)} grants; {sum(1 for p in payload if p["institution_id"])} linked to an institution')
if APPLY and payload:
    post('opportunities?on_conflict=source_url', payload, 'resolution=ignore-duplicates,return=minimal')
    n = len(get('opportunities?select=id')); l = len(get('opportunities?select=id&institution_id=not.is.null'))
    say(f'\nDONE: {n} opportunities, {l} linked to an institution; {len(get("funders?select=id"))} institutions')
