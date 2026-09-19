"""
Stage 2 data import for the Ecosystem layer.

Reads:
  - scripts/institution-map.json          (hand-approved resolution table)
  - Downloads/African_Creative_Economy_Builders_Database_2026.xlsx

Does, in order:
  1. Merge approved duplicate funders (fill gaps in the kept row, then delete the spare)
  2. Rename existing institutions to their canonical names; set institution_type
  3. Create new institutions
  4. Upsert all 45 builder mechanisms, linked to institutions
  5. Set institution roles ('funder' / 'builder')

Run:  python3 scripts/import_ecosystem.py            (dry run — prints, writes nothing)
      python3 scripts/import_ecosystem.py --apply    (writes to Supabase)
"""
import json, os, re, sys, datetime
import urllib.request, urllib.parse
import openpyxl

APPLY = '--apply' in sys.argv
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILDERS_XLSX = os.path.expanduser('~/Downloads/African_Creative_Economy_Builders_Database_2026.xlsx')

# ---- Supabase REST helpers ---------------------------------------------------
env = {}
for line in open(os.path.join(ROOT, '.env.local')):
    if '=' in line and not line.startswith('#'):
        k, v = line.rstrip('\n').split('=', 1)
        env[k] = v.strip().strip('"')
URL = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')
KEY = env['SUPABASE_SERVICE_ROLE_KEY']
HDR = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}

def rest(method, path, body=None, prefer=None):
    h = dict(HDR)
    if prefer: h['Prefer'] = prefer
    req = urllib.request.Request(f'{URL}/rest/v1/{path}', method=method,
                                 data=json.dumps(body).encode() if body is not None else None, headers=h)
    with urllib.request.urlopen(req) as r:
        raw = r.read()
        return json.loads(raw) if raw else None

def get(path): return rest('GET', path)
def patch(path, body): return rest('PATCH', path, body, 'return=representation')
def post(path, body, prefer='return=representation'): return rest('POST', path, body, prefer)
def delete(path): return rest('DELETE', path, None, 'return=representation')

log = []
def say(msg): print(msg); log.append(msg)

# ---- Helpers -----------------------------------------------------------------
def slugify(s): return re.sub(r'(^-|-$)', '', re.sub(r'[^a-z0-9]+', '-', s.lower()))
def split_list(s): return sorted({p.strip().lower().rstrip('.') for p in re.split(r'[;,]', s or '') if p.strip()})
def s(v): return str(v).strip() if v not in (None, '') else None

REGION_KEYS = [('pan-african','Pan-African'),('pan african','Pan-African'),('continent','Pan-African'),
    ('east africa','East Africa'),('west africa','West Africa'),('southern africa','Southern Africa'),
    ('north africa','North Africa'),('central africa','Central Africa'),('diaspora','Diaspora'),
    ('global','Global'),('international','Global'),('worldwide','Global'),('francophone','Francophone Africa')]
COUNTRIES = ['nigeria','kenya','south africa','ghana','senegal','uganda','tanzania','ethiopia','egypt','morocco',
    'tunisia','algeria','zimbabwe','zambia','rwanda','mozambique','angola','cameroon',"cote d'ivoire",'ivory coast',
    'mali','burkina','benin','namibia','botswana','malawi','sudan','somalia','congo','madagascar','mauritius']
def regions(scope):
    t = (scope or '').lower(); out = []
    for k, label in REGION_KEYS:
        if k in t and label not in out: out.append(label)
    if not out and any(c in t for c in COUNTRIES): out.append('National / single-country')
    return out or (['Other'] if scope else [])
def countries(text):
    t = (text or '').lower()
    return [c.title() if c != "cote d'ivoire" else "Côte d'Ivoire" for c in COUNTRIES if c in t]
def parse_date(v):
    if isinstance(v, (datetime.date, datetime.datetime)): return v.date().isoformat() if isinstance(v, datetime.datetime) else v.isoformat()
    if not v: return None
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', str(v)); return m.group(0) if m else None

# ---- Load inputs -------------------------------------------------------------
M = json.load(open(os.path.join(ROOT, 'scripts/institution-map.json')))
wb = openpyxl.load_workbook(BUILDERS_XLSX, read_only=True)
rows = [r for r in wb['Creative Economy Builders'].iter_rows(values_only=True) if r and r[0]]
H = {h: i for i, h in enumerate(rows[0])}
mech_rows = rows[1:]
say(f'{"APPLY" if APPLY else "DRY RUN"} — {len(mech_rows)} mechanisms, {len(M["institutions"])} institutions')

funders = get('funders?select=id,name,slug,description,website,logo_url,notes,roles,institution_type,regions_of_focus,cci_sectors,funding_types,application_cycle,contact_email,contact_person')
by_name = {f['name']: f for f in funders}

# ---- 1. Merge approved duplicates -------------------------------------------
say('\n1. Duplicate merges')
FILL = ['description','website','logo_url','notes','application_cycle','contact_email','contact_person']
for m in M['proposed_duplicate_merges_in_existing_funders']:
    keep = by_name.get(m['keep'])
    if not keep: say(f'  ! keep row missing: {m["keep"]}'); continue
    for spare_name in m['fold_in']:
        spare = by_name.get(spare_name)
        if not spare: say(f'  - already gone: {spare_name}'); continue
        fill = {k: spare[k] for k in FILL if not keep.get(k) and spare.get(k)}
        for arr in ['regions_of_focus','cci_sectors','funding_types']:
            merged = sorted(set(keep.get(arr) or []) | set(spare.get(arr) or []))
            if merged != sorted(keep.get(arr) or []): fill[arr] = merged
        if spare.get('notes') and keep.get('notes') and spare['notes'] not in keep['notes']:
            fill['notes'] = keep['notes'] + ' | ' + spare['notes']
        say(f'  {spare_name!r} → {m["keep"]!r}  (carrying over: {list(fill) or "nothing"})')
        if APPLY:
            if fill: patch(f'funders?id=eq.{keep["id"]}', fill)
            # repoint anything already attached to the spare
            patch(f'opportunities?institution_id=eq.{spare["id"]}', {'institution_id': keep['id']})
            delete(f'funders?id=eq.{spare["id"]}')
            keep.update(fill); del by_name[spare_name]

# ---- 2. Rename existing + set type ------------------------------------------
say('\n2. Rename / retype existing institutions')
canon = {}   # canonical name -> funders row
for inst in M['institutions']:
    if not inst['existing']: continue
    row = by_name.get(inst['existing'])
    if not row: say(f'  ! existing not found: {inst["existing"]}'); continue
    upd = {}
    new_name = inst.get('rename_existing_to')
    if new_name and row['name'] != new_name:
        upd['name'] = new_name; upd['slug'] = slugify(new_name)
        say(f'  rename {row["name"]!r} → {new_name!r}')
    if inst.get('type') and not row.get('institution_type'): upd['institution_type'] = inst['type']
    if APPLY and upd:
        patch(f'funders?id=eq.{row["id"]}', upd); row.update(upd)
        by_name[row['name']] = row
    canon[inst['canonical']] = row

# ---- 3. Create new institutions ---------------------------------------------
say('\n3. New institutions')
# website from the first mechanism row that names this institution
site_for = {}
for r in mech_rows:
    c = M['mechanisms'][r[H['Mechanism / programme']]]
    if c not in site_for and s(r[H['Institution website']]): site_for[c] = s(r[H['Institution website']])
for inst in M['institutions']:
    if inst['existing']: continue
    name = inst['canonical']
    if name in by_name:
        canon[name] = by_name[name]; say(f'  - exists already: {name}'); continue
    site = site_for.get(name)
    body = {'name': name, 'slug': slugify(name), 'institution_type': inst.get('type'),
            'website': site, 'grants_page_url': None, 'source_url': site,
            'logo_url': f'https://www.google.com/s2/favicons?domain={urllib.parse.urlparse(site).netloc}&sz=128' if site else None,
            'funder_type': 'Ecosystem builder', 'roles': ['builder'], 'is_active': True,
            'last_verified': '2026-09-15'}
    say(f'  + {name}  ({site or "no site"})')
    if APPLY:
        created = post('funders', body)[0]; canon[name] = created; by_name[name] = created

# ---- 4. Mechanisms ----------------------------------------------------------
say('\n4. Mechanisms')
existing_mech = {m['slug']: m for m in get('builder_mechanisms?select=id,slug')} if APPLY else {}
buckets = M['economic_role_buckets']; access = M['access_model_labels']
payload = []
for r in mech_rows:
    g = lambda k: s(r[H[k]])
    name = g('Mechanism / programme')
    inst = canon.get(M['mechanisms'][name])
    role_raw = g('Economic role')
    roles = sorted({buckets[p.strip()] for p in role_raw.split(';') if p.strip()}) if role_raw else []
    body = {
        'slug': slugify(name),
        'institution_id': inst['id'] if inst else None,
        'name': name,
        'parent_institution': g('Parent institution'),
        'institution_type': g('Institution type'),
        'mechanism': g('Capital / support mechanism'),
        'cci_areas': split_list(g('CCI area(s)')),
        'who_it_supports': g('Who it supports'),
        'african_eligibility': g('African eligibility'),
        'what_it_provides': g('Award / investment / what it provides'),
        'cycle': g('Typical cycle / deadline'),
        'status': g('Status (15 September 2026)'),
        'institution_website': g('Institution website'),
        'opportunities_hub': g('Funding / opportunities hub'),
        'evidence_link': g('Direct programme / evidence link'),
        'geographic_focus': g('Geographic focus'),
        'notes': g('Notes / verification caveat'),
        'economic_role_raw': role_raw,
        'access_model_raw': g('Access model'),
        'evidence_strength': g('Evidence strength'),
        'research_date': parse_date(r[H['Research date']]),
        'economic_roles': roles,
        'access_model': access.get(g('Access model')),
        'regions': regions(g('Geographic focus')),
        'eligible_countries': countries((g('African eligibility') or '') + ' ' + (g('Geographic focus') or '')),
    }
    payload.append(body)
    if not inst: say(f'  ! no institution for {name}')
say(f'  {len(payload)} mechanisms prepared; {sum(1 for p in payload if p["institution_id"])} linked to an institution')
if APPLY:
    post('builder_mechanisms?on_conflict=slug', payload, 'resolution=merge-duplicates,return=minimal')
    say('  upserted')

# ---- 5. Roles ---------------------------------------------------------------
say('\n5. Institution roles')
builder_ids = {p['institution_id'] for p in payload if p['institution_id']}
if APPLY:
    for f in get('funders?select=id,name,roles'):
        r = set(f['roles'] or [])
        if f['id'] in builder_ids: r.add('builder')
        if r != set(f['roles'] or []):
            patch(f'funders?id=eq.{f["id"]}', {'roles': sorted(r)})
say(f'  {len(builder_ids)} institutions marked as builders')

# ---- Summary ----------------------------------------------------------------
if APPLY:
    n_f = len(get('funders?select=id')); n_m = len(get('builder_mechanisms?select=id'))
    both = len(get('funders?select=id&roles=cs.{funder,builder}'))
    say(f'\nDONE: {n_f} institutions ({both} in both layers), {n_m} mechanisms')
