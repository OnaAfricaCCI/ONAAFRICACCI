"""
Approve who-can-apply extractions before they reach the site.

extract_eligibility.py proposes; nothing it writes shows to a visitor until it
is approved here, because the card only renders structured eligibility where
`eligibility_reviewed = true`.

  python3 scripts/review_eligibility.py --go        # walk through them one by one
  python3 scripts/review_eligibility.py             # just list what's waiting

In the walkthrough each grant shows the extracted answer and the funder's
sentence it came from, so you can check the claim against the source in a
moment:

  a  approve as-is
  i / o / e / p  approve, but set who to individual / organisation / either / partnership
  r  reject (clears the extraction; the card falls back to the geographic line)
  s  skip for now
  q  stop

Approving sets eligibility_reviewed = true. Rejecting clears the structured
fields, so nothing unreviewed is ever left showing.
"""
import json
import os
import subprocess
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = {
    l.split('=', 1)[0]: l.split('=', 1)[1].strip().strip('"')
    for l in open(os.path.join(ROOT, '.env.local'))
    if '=' in l and not l.startswith('#')
}
URL = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')
KEY = env['SUPABASE_SERVICE_ROLE_KEY']
HDR = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}

WHO_KEY = {'i': 'individual', 'o': 'organisation', 'e': 'either', 'p': 'partnership'}
WHO_LABEL = {
    'individual': 'Individuals',
    'organisation': 'Registered organisations',
    'either': 'Individuals or organisations',
    'partnership': 'Applicants with a partner',
}


def rest(method, path, body=None, prefer='return=representation'):
    req = urllib.request.Request(
        f'{URL}/rest/v1/{path}', method=method, headers={**HDR, 'Prefer': prefer},
        data=json.dumps(body).encode() if body is not None else None,
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def pending():
    # Extracted but not yet approved: who is set, reviewed is false.
    return rest(
        'GET',
        'opportunities?select=id,name,funder,eligible_countries,eligible_who,eligible_conditions,'
        'eligibility_confidence,eligibility_evidence,application_link'
        '&eligible_who=not.is.null&eligibility_reviewed=eq.false'
        '&order=eligibility_confidence,name',
        prefer='',
    )


def approve(cid, who=None):
    body = {'eligibility_reviewed': True}
    if who:
        body['eligible_who'] = who
    rest('PATCH', f'opportunities?id=eq.{cid}', body, prefer='return=minimal')


def reject(cid):
    rest('PATCH', f'opportunities?id=eq.{cid}', {
        'eligible_who': None, 'eligible_conditions': None,
        'eligibility_confidence': None, 'eligibility_evidence': None,
        'eligibility_reviewed': False,
    }, prefer='return=minimal')


def show_one(r, i, total):
    print('-' * 68)
    print(f"[{i} of {total}]  {r['name'][:56]}")
    if r.get('funder'):
        print(f"  funder     {r['funder'][:60]}")
    print(f"  where      {', '.join(r.get('eligible_countries') or []) or '(none noted)'}")
    print(f"  WHO        {WHO_LABEL.get(r['eligible_who'], r['eligible_who'])}"
          f"   [{r.get('eligibility_confidence')}]")
    if r.get('eligible_conditions'):
        print(f"  condition  {r['eligible_conditions']}")
    if r.get('eligibility_evidence'):
        print(f"  evidence   \"{r['eligibility_evidence'][:110]}\"")
    print(f"  source     {(r.get('application_link') or '')[:70]}")


def show(rows):
    if not rows:
        print('Nothing waiting for review.')
        print('\nExtract some with:  python3 scripts/extract_eligibility.py --write')
        return
    print(f'{len(rows)} extraction(s) waiting, least confident first:\n')
    for i, r in enumerate(rows, 1):
        show_one(r, i, len(rows))
        print(f"  id {r['id']}\n")
    print('Walk through them with:  python3 scripts/review_eligibility.py --go')


def walkthrough():
    rows = pending()
    if not rows:
        show(rows)
        return
    print(f'{len(rows)} to review, least confident first.')
    print('a approve · i/o/e/p set who then approve · r reject · s skip · q stop\n')

    done = 0
    for i, r in enumerate(rows, 1):
        show_one(r, i, len(rows))
        if r.get('application_link'):
            subprocess.run(['open', r['application_link']], check=False)

        while True:
            choice = input('\n  [a/i/o/e/p/r/s/q] ').strip().lower()
            if choice in ('a', 'i', 'o', 'e', 'p', 'r', 's', 'q'):
                break
            print('  Please answer a, i, o, e, p, r, s or q.')

        if choice == 'q':
            print(f'\nStopped. {done} handled, {len(rows) - i + 1} still waiting.')
            return
        if choice == 's':
            print('  Skipped.')
            continue
        if choice == 'r':
            reject(r['id'])
            print('  Rejected — the card falls back to the geographic line.')
        elif choice == 'a':
            approve(r['id'])
            print(f"  ✓ approved as {WHO_LABEL[r['eligible_who']]}")
        else:
            who = WHO_KEY[choice]
            approve(r['id'], who)
            print(f'  ✓ approved as {WHO_LABEL[who]}')
        done += 1

    print(f'\n{"=" * 68}\nAll done. {done} handled.')


if __name__ == '__main__':
    args = sys.argv[1:]
    if not args:
        show(pending())
    elif args[0] == '--go':
        walkthrough()
    else:
        print(__doc__)
