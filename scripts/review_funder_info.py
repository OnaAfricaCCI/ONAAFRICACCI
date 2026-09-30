"""
Approve "what they fund" / "how to apply" drafts before they reach a funder page.

extract_funder_info.py writes proposals to a holding queue
(scripts/funder_enrichment_queue.json); nothing shows on the site until it is
approved here and written to the live funder row. This is the gate.

  python3 scripts/review_funder_info.py --go        # walk through them one by one
  python3 scripts/review_funder_info.py             # just list what's waiting

In the walkthrough each funder shows the two drafts and the sentence each came
from, and opens the source page so you can check the claim against it:

  a  approve both fields as drafted
  w  approve only "what they fund"
  h  approve only "how to apply"
  r  reject (drop this proposal, write nothing)
  s  skip for now
  q  stop

Approving writes the field(s) to the funder and marks the queue entry done.
Because the live funder page only shows a field once it is filled, nothing
unreviewed is ever visible.
"""
import json
import os
import subprocess
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUEUE = os.path.join(ROOT, 'scripts', 'funder_enrichment_queue.json')
env = {
    l.split('=', 1)[0]: l.split('=', 1)[1].strip().strip('"')
    for l in open(os.path.join(ROOT, '.env.local'))
    if '=' in l and not l.startswith('#')
}
URL = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')
KEY = env['SUPABASE_SERVICE_ROLE_KEY']
HDR = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}


def patch(fid, body):
    req = urllib.request.Request(
        f'{URL}/rest/v1/funders?id=eq.{fid}', method='PATCH',
        headers={**HDR, 'Prefer': 'return=minimal'}, data=json.dumps(body).encode(),
    )
    urllib.request.urlopen(req, timeout=30)


def load():
    if not os.path.exists(QUEUE):
        return []
    return json.load(open(QUEUE))


def save(rows):
    json.dump(rows, open(QUEUE, 'w'), indent=2, ensure_ascii=False)


def show_one(r, i, total):
    print('-' * 72)
    print(f"[{i} of {total}]  {r['name'][:56]}   [{r.get('confidence')}]")
    if r.get('what_they_fund'):
        print(f"\n  WHAT THEY FUND\n    {r['what_they_fund']}")
        if r.get('what_they_fund_evidence'):
            print(f"    ⤷ evidence: \"{r['what_they_fund_evidence'][:120]}\"")
    if r.get('how_to_apply'):
        print(f"\n  HOW TO APPLY\n    {r['how_to_apply']}")
        if r.get('how_to_apply_evidence'):
            print(f"    ⤷ evidence: \"{r['how_to_apply_evidence'][:120]}\"")
    print(f"\n  source: {r.get('source_url')}")


def apply_fields(r, which):
    body = {}
    if 'w' in which and r.get('what_they_fund'):
        body['what_they_fund'] = r['what_they_fund']
    if 'h' in which and r.get('how_to_apply'):
        body['how_to_apply'] = r['how_to_apply']
    if body:
        patch(r['id'], body)
    return list(body.keys())


def walkthrough():
    rows = load()
    pending = [r for r in rows if not r.get('reviewed')]
    if not pending:
        print('Nothing waiting for review.')
        print('\nExtract some with:  python3 scripts/extract_funder_info.py --write')
        return
    print(f'{len(pending)} to review.')
    print('a approve both · w what-they-fund only · h how-to-apply only · r reject · s skip · q stop\n')

    done = 0
    for i, r in enumerate(pending, 1):
        show_one(r, i, len(pending))
        if r.get('source_url'):
            subprocess.run(['open', r['source_url']], check=False)

        while True:
            choice = input('\n  [a/w/h/r/s/q] ').strip().lower()
            if choice in ('a', 'w', 'h', 'r', 's', 'q'):
                break
            print('  Please answer a, w, h, r, s or q.')

        if choice == 'q':
            print(f'\nStopped. {done} handled, {len(pending) - i + 1} still waiting.')
            break
        if choice == 's':
            print('  Skipped.')
            continue
        if choice == 'r':
            r['reviewed'] = True
            r['rejected'] = True
            print('  Rejected — nothing written.')
        else:
            which = 'wh' if choice == 'a' else choice
            wrote = apply_fields(r, which)
            r['reviewed'] = True
            print(f"  ✓ wrote {', '.join(wrote) if wrote else 'nothing (field was empty)'}")
        done += 1
        save(rows)  # persist after every decision, so a stop loses nothing

    save(rows)
    print(f'\n{"=" * 72}\nDone. {done} handled.')


def summary():
    rows = load()
    if not rows:
        print('Queue is empty.')
        print('\nExtract some with:  python3 scripts/extract_funder_info.py --write')
        return
    pending = [r for r in rows if not r.get('reviewed')]
    print(f'{len(rows)} in queue · {len(pending)} waiting · {len(rows) - len(pending)} handled\n')
    for r in pending:
        fields = [k for k in ('what_they_fund', 'how_to_apply') if r.get(k)]
        print(f"  {r['name'][:50]:50} {', '.join(fields)}  [{r.get('confidence')}]")
    if pending:
        print('\nWalk through them with:  python3 scripts/review_funder_info.py --go')


if __name__ == '__main__':
    args = sys.argv[1:]
    if args and args[0] == '--go':
        walkthrough()
    else:
        summary()
