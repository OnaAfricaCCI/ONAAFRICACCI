"""
Stage 2c — quality pass.

  1. Merge duplicate grants (same programme imported from two files).
     Keeps the consolidated row; borrows the other row's link if it is the
     one that works; deletes the spare.
  2. Give every institution without a description one composed from its own
     linked mechanisms and grants — real content from the source files, not
     invented. Also fills regions / sectors / support types for filtering.

Run:  python3 scripts/enrich_and_dedupe.py          (dry run)
      python3 scripts/enrich_and_dedupe.py --apply
"""
import json, os, re, sys, urllib.request

APPLY = '--apply' in sys.argv
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = {l.split('=', 1)[0]: l.split('=', 1)[1].strip().strip('"') for l in open(os.path.join(ROOT, '.env.local')) if '=' in l and not l.startswith('#')}
URL, KEY = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/'), env['SUPABASE_SERVICE_ROLE_KEY']
HDR = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}
def rest(method, path, body=None, prefer='return=minimal'):
    req = urllib.request.Request(f'{URL}/rest/v1/{path}', method=method, headers={**HDR, 'Prefer': prefer},
                                 data=json.dumps(body).encode() if body is not None else None)
    with urllib.request.urlopen(req) as r:
        raw = r.read(); return json.loads(raw) if raw else None
get = lambda p: rest('GET', p, prefer='')
patch = lambda p, b: rest('PATCH', p, b)
delete = lambda p: rest('DELETE', p)

print('APPLY' if APPLY else 'DRY RUN')

# ---- 1. duplicate grants -------------------------------------------------------
DUPES = [  # (keep — consolidated name, drop — spreadsheet name)
    ('International Fund for Cultural Diversity (IFCD)', 'International Fund for Cultural Diversity (IFCD)'),
    ('World Cinema Fund', 'World Cinema Fund'),
    ('Sundance Documentary Fund', 'Sundance Documentary Fund'),
    ('Prince Claus Seed Awards', 'Prince Claus Seed Awards'),
    ('ART X Prize', 'ART X Prize'),
    ('Miles Morland Writing Scholarships', 'Miles Morland Writing Scholarships'),
    ('Delfina Foundation residency programmes', 'Delfina Foundation residencies'),
    ('Hubert Bals Fund — Development Support', 'Hubert Bals Fund: Script and Project Development'),
]
opps = get('opportunities?select=id,name,source,application_link,source_url,link_ok,link_status,link_error,link_checked_at,description,amount,deadline')
print('\n1. Duplicate grants')
for keep_name, drop_name in DUPES:
    keep = next((o for o in opps if o['name'] == keep_name and o['source'] == 'consolidated'), None)
    drop = next((o for o in opps if o['name'] == drop_name and o['source'] != 'consolidated'), None)
    if not keep or not drop:
        print(f'  - skip (not both present): {keep_name}'); continue
    upd = {}
    # prefer whichever link actually works
    if keep.get('link_ok') is not True and drop.get('link_ok') is True:
        upd.update({k: drop[k] for k in ['application_link', 'source_url', 'link_ok', 'link_status', 'link_error', 'link_checked_at']})
    for k in ['amount', 'deadline']:
        if not keep.get(k) and drop.get(k): upd[k] = drop[k]
    print(f'  merge {drop_name!r} → keep consolidated{"  (taking working link)" if "application_link" in upd else ""}')
    if APPLY:
        # delete first: source_url is unique, so the spare must go before its
        # link can be moved onto the kept row
        delete(f'opportunities?id=eq.{drop["id"]}')
        if upd: patch(f'opportunities?id=eq.{keep["id"]}', upd)

# ---- 2. enrich institutions --------------------------------------------------------
print('\n2. Institution descriptions')
inst = get('funders?select=id,name,roles,description,funder_type,institution_type,regions_of_focus,cci_sectors,funding_types,application_cycle,website')
mechs = get('builder_mechanisms?select=institution_id,name,mechanism,what_it_provides,who_it_supports,cci_areas,regions,economic_roles,access_model,cycle')
grants = get('opportunities?select=institution_id,name,funding_type,cci_sector,eligible_countries,description,deadline_type')

by_inst_m, by_inst_g = {}, {}
for m in mechs: by_inst_m.setdefault(m['institution_id'], []).append(m)
for g in grants: by_inst_g.setdefault(g['institution_id'], []).append(g)

def sentence(s):
    s = (s or '').strip().rstrip('.')
    return s + '.' if s else ''
def lower_first(s):
    """Lowercase a leading ordinary word ('Debt…' → 'debt…') but leave
    acronyms, names and amounts alone ('EBID', 'US$50m', 'R150m')."""
    if not s: return s
    first = s.split(' ', 1)[0]
    if len(first) > 1 and (any(c.isupper() for c in first[1:]) or any(c.isdigit() or c in '$€£' for c in first)):
        return s
    return s[0].lower() + s[1:]
def support_types(text):
    t = (text or '').lower(); out = []
    for k, label in [('grant','grants'),('loan','loans'),('debt','loans'),('credit','loans'),('equity','investment'),('invest','investment'),
                     ('venture','investment'),('prize','prizes'),('award','prizes'),('incubat','incubation'),('accelerat','incubation'),
                     ('training','capacity building'),('capacity','capacity building'),('mentor','capacity building'),('market','market access'),
                     ('export','market access'),('incentive','incentives'),('rebate','incentives'),('policy','policy'),('infrastructure','infrastructure')]:
        if k in t and label not in out: out.append(label)
    return out

n = 0
for i in inst:
    ms, gs = by_inst_m.get(i['id'], []), by_inst_g.get(i['id'], [])
    upd = {}
    if not i['description']:
        parts = []
        kind = i.get('institution_type') or i.get('funder_type')
        if kind: parts.append(sentence(kind[0].upper() + kind[1:]))
        if ms:
            lead = ms[0]
            names = [m['name'] for m in ms]
            if len(ms) == 1:
                parts.append(sentence(f"Its {lead['name']} provides {lower_first(lead['what_it_provides'])}") if lead['what_it_provides'] else '')
            else:
                parts.append(sentence(f"Active through {len(ms)} mechanisms including {names[0]} and {names[1]}"))
                if lead['what_it_provides']: parts.append(sentence(f"{names[0]} provides {lower_first(lead['what_it_provides'])}"))
            if lead['who_it_supports']: parts.append(sentence(f"Supports {lower_first(lead['who_it_supports'])}"))
        if gs and not ms:
            lead = gs[0]
            names = [g['name'] for g in gs]
            parts.append(sentence(f"Runs {names[0]}" if len(gs) == 1 else f"Runs {len(gs)} programmes including {names[0]} and {names[1]}"))
            if lead['description']:
                # first sentence of the grant's own description (award / what it funds)
                parts.append(sentence(lead['description'].split('. ')[0]))
        desc = ' '.join(p for p in parts if p).strip()
        if desc: upd['description'] = desc
    # filter fields from linked records
    regions = set(i['regions_of_focus'] or []); sectors = set(i['cci_sectors'] or []); ftypes = set(i['funding_types'] or [])
    for m in ms:
        regions |= set(m['regions'] or []); sectors |= set(m['cci_areas'] or []); ftypes |= set(support_types(m['mechanism']))
    for g in gs:
        if g['cci_sector']: sectors.add(g['cci_sector'])
        if g['funding_type'] and g['funding_type'] != 'other': ftypes.add(g['funding_type'] + ('s' if not g['funding_type'].endswith('s') else ''))
    for key, val, cur in [('regions_of_focus', regions, i['regions_of_focus']), ('cci_sectors', sectors, i['cci_sectors']), ('funding_types', ftypes, i['funding_types'])]:
        if sorted(val) != sorted(cur or []): upd[key] = sorted(val)
    if not i['application_cycle'] and ms and ms[0]['cycle']: upd['application_cycle'] = ms[0]['cycle'][:120]
    if upd:
        n += 1
        if 'description' in upd: print(f"  {i['name'][:44]:44} ← {upd['description'][:90]}…")
        if APPLY: patch(f'funders?id=eq.{i["id"]}', upd)
print(f'\n  {n} institutions updated')
if APPLY:
    print('institutions still without description:', len(get('funders?select=id&description=is.null')))
    print('grants now:', len(get('opportunities?select=id')))
