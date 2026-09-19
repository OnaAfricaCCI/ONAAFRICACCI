"""
Adds consolidated grants that were skipped only because they share an
application link with another grant (e.g. a fund's development and production
strands on one page). Each gets a distinct dedup key: link + '#' + slug.
"""
import os, re, sys
sys.argv = [sys.argv[0]]                      # force import_grants into dry-run
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import importlib.util
spec = importlib.util.spec_from_file_location('ig', 'scripts/import_grants.py')
ig = importlib.util.module_from_spec(spec)
import io, contextlib
with contextlib.redirect_stdout(io.StringIO()):
    spec.loader.exec_module(ig)               # loads data + helpers, writes nothing

ADD = [
    'AWA — Art in West Africa',
    'Tony Elumelu Storytellers Fund',
    'Kekere Storytellers Fund',
    'Presidential Employment Stimulus — creative sector calls',
    'Morocco film production rebate',
    'IDFA Bertha Fund Classic — Production & Post-production',
    'Hubert Bals Fund — Production & Post-production',
]

payload = []
for r in ig.data:
    g = lambda k: ig.s(r[ig.H[k]])
    name = g('Grant / programme')
    if name not in ADD: continue
    parent = g('Parent funder'); inst = ig.resolve(parent) if parent else None
    cycle, status, award, who, elig = (g('Typical cycle / deadline'), g('Status (15 September 2026)'),
                                       g('Award / what it funds'), g('Who it supports'), g('African eligibility'))
    desc = ' '.join(x for x in [
        f'{award.rstrip(".")}.' if award else None,
        f'Supports {who[0].lower()}{who[1:].rstrip(".")}.' if who else None,
        f'Cycle: {cycle.rstrip(".")}.' if cycle else None,
        f'Status: {status.rstrip(".")}.' if status else None] if x)
    link = g('Direct programme / application link')
    slug = re.sub(r'(^-|-$)', '', re.sub(r'[^a-z0-9]+', '-', name.lower()))
    payload.append({
        'name': name, 'funder': parent, 'institution_id': inst['id'] if inst else None,
        'funding_type': ig.funding_type(g('Support type')), 'cci_sector': ig.sector(g('CCI area(s)')),
        'eligible_countries': [e.strip() for e in re.split(r'[;+]', elig or '') if e.strip()],
        'amount': award[:200] if award else None,
        'deadline': ig.iso_deadline(cycle, status), 'deadline_type': ig.deadline_type(cycle, status),
        'application_link': link, 'source_url': f'{ig.nl(link)}#{slug}',
        'description': desc or None, 'raw_text': None, 'source': 'consolidated',
    })

print(f'{len(payload)} to add, {sum(1 for p in payload if p["institution_id"])} linked to an institution')
for p in payload: print('  +', p['name'])
if '--apply' in os.environ.get('MODE', ''):
    ig.post('opportunities', payload, 'return=minimal')
    print('total opportunities now:', len(ig.get('opportunities?select=id')))
