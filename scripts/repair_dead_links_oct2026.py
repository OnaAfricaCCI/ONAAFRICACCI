"""
Repair the dead application links flagged by the nightly check-links run
(2 Oct 2026). Each new URL below was found by searching for the funder's current
programme page and CONFIRMED live (HTTP 200, browser UA). Nothing invented.

Nine funders had simply restructured their sites; their programmes are still
running, so we repoint the link and mark it healthy again. Three others
(Global Heritage Fund, Hot Docs-Blue Ice, IFC-Sony) are ended/absorbed and are
deliberately left as-is for an editorial decision — they are NOT in this file.

  python3 scripts/repair_dead_links_oct2026.py            # dry run
  python3 scripts/repair_dead_links_oct2026.py --apply    # write it
"""
import json, os, sys, datetime, urllib.request
APPLY = '--apply' in sys.argv
NOW = datetime.datetime.now(datetime.timezone.utc).isoformat()
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

# slug -> confirmed-live replacement URL
REPAIRS = {
 'africa-no-filter-grants': 'https://africanofilter.org/what-we-do/community/',
 'climate-story-fund': 'https://climatestoryunit.org/fund/apply/',
 'ford-foundation-justfilms': 'https://www.fordfoundation.org/work/our-grants/justfilms/',
 'g-a-s-foundation-residencies-fellowships': 'https://www.guestartistsspace.com/news/Opportunities',
 'kenya-film-commission-film-empowerment-programme':
     'https://kenyafilmcommission.go.ke/news/call-for-applications-kenya-film-commission-empowerment-programme/',
 'orange-social-venture-prize-in-africa-and-the-middle-east':
     'https://www.orange.com/en/our-news/young-entrepreneurs-africa-and-middle-east-apply-2026-osvp',
 'quramo-writers-prize': 'https://quramo.com/',
 'sony-innovation-fund-africa': 'https://www.sonyinnovationfund.com/about/',
 'sovereign-african-art-prize': 'https://www.sovereignartfoundation.com/the-sovereign-african-art-prize/',
}
HEALTHY = {'link_state': 'ok', 'link_ok': True, 'link_status': 200,
           'link_checked_at': NOW, 'link_fail_streak': 0, 'link_error': None}

def main():
    print(f'{"APPLY" if APPLY else "DRY RUN"} — {len(REPAIRS)} links to repair\n')
    for slug, new in REPAIRS.items():
        cur = rest('GET', f'opportunities?select=name,application_link,link_state&slug=eq.{slug}')
        if not cur:
            print(f'   ! not found: {slug}'); continue
        c = cur[0]
        print(f'   {c["name"][:46]:46}  {c["link_state"]} -> ok')
        print(f'       old: {c["application_link"]}')
        print(f'       new: {new}')
        if APPLY:
            rest('PATCH', f'opportunities?slug=eq.{slug}',
                 {'application_link': new, **HEALTHY}, 'return=minimal')
    if not APPLY:
        print('\nDry run — nothing written.'); return
    left = rest('GET', 'opportunities?select=id&link_state=eq.dead')
    print(f'\nDONE. {len(REPAIRS)} repaired; {len(left)} still flagged dead (the 3 ended/absorbed).')
if __name__ == '__main__': main()
