"""
Review proposed replacements for dead grant links.

rediscover_links.py finds candidates; nothing it finds reaches the site until
you approve it here. Same shape as review_submissions.py.

  python3 scripts/review_links.py --go             # walk through them one by one
  python3 scripts/review_links.py                  # just list what's waiting

The --go walkthrough is the easy way: it opens each proposal in your browser,
asks yes or no, and moves to the next. No ids to copy.

For handling a single one directly:

  python3 scripts/review_links.py --approve <id>   # publish it
  python3 scripts/review_links.py --reject  <id>   # discard it
  python3 scripts/review_links.py --open    <id>   # open both URLs in a browser

Approving re-checks the URL first: if it doesn't load at that moment, nothing
is published. The old URL is kept on the candidate row, so any approval can be
undone by hand.
"""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = {
    l.split('=', 1)[0]: l.split('=', 1)[1].strip().strip('"')
    for l in open(os.path.join(ROOT, '.env.local'))
    if '=' in l and not l.startswith('#')
}
URL = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')
KEY = env['SUPABASE_SERVICE_ROLE_KEY']
HDR = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/128.0 Safari/537.36')


def rest(method, path, body=None, prefer='return=representation'):
    req = urllib.request.Request(
        f'{URL}/rest/v1/{path}', method=method, headers={**HDR, 'Prefer': prefer},
        data=json.dumps(body).encode() if body is not None else None,
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def check(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return None


def pending():
    return rest(
        'GET',
        'link_candidates?select=*,opportunities(name,funder)&status=eq.pending'
        '&order=confidence.desc,created_at.desc',
        prefer='',
    )


def show(rows):
    if not rows:
        print('Nothing waiting for review.')
        print('\nFind candidates with:  python3 scripts/rediscover_links.py --write')
        return
    print(f'{len(rows)} proposed replacement(s), most confident first:\n')
    for r in rows:
        grant = r.get('opportunities') or {}
        bar = '█' * round(float(r['confidence'] or 0) * 10)
        print(f"  id {r['id']}")
        print(f"     {grant.get('name', '(unknown grant)')}")
        if grant.get('funder'):
            print(f"     {grant['funder']}")
        print(f"     confidence   {float(r['confidence'] or 0):.2f} {bar}  (found by: {r['method']})")
        print(f"     was          {(r.get('previous_url') or '')[:92]}")
        print(f"     proposed     {r['candidate_url'][:92]}")
        if r.get('page_title'):
            print(f"     page title   {r['page_title'][:92]}")
        if r.get('reasoning'):
            print(f"     why          {r['reasoning'][:92]}")
        print()
    print('Approve with:  python3 scripts/review_links.py --approve <id>')
    print('Open both:     python3 scripts/review_links.py --open <id>')


def get_one(cid):
    rows = rest('GET', f'link_candidates?select=*,opportunities(name)&id=eq.{cid}', prefer='')
    if not rows:
        print('No candidate with that id.')
        return None
    if rows[0]['status'] != 'pending':
        print(f"Already {rows[0]['status']}.")
        return None
    return rows[0]


def approve(cid):
    c = get_one(cid)
    if not c:
        return

    # Never publish a link without looking at it first.
    status = check(c['candidate_url'])
    if not status or status >= 400:
        print(f"Not publishing: the proposed URL returned {status or 'no response'}.")
        print('Leaving it pending. Re-run when the site is up, or reject it.')
        return

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    rest('PATCH', f"opportunities?id=eq.{c['opportunity_id']}", {
        'application_link': c['candidate_url'],
        'link_state': 'ok',
        'link_ok': True,
        'link_fail_streak': 0,
        'link_status': status,
        'link_error': None,
        'link_checked_at': now,
    }, prefer='return=minimal')
    rest('PATCH', f"link_candidates?id=eq.{cid}",
         {'status': 'approved', 'reviewed_at': now}, prefer='return=minimal')

    name = (c.get('opportunities') or {}).get('name', 'grant')
    print(f'✓ published — {name}')
    print(f'  now points at {c["candidate_url"]}  [{status}]')
    print(f'  the old URL was {c.get("previous_url")}')
    print('  It will show a normal Apply button on the site.')


def reject(cid):
    c = get_one(cid)
    if not c:
        return
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    rest('PATCH', f"link_candidates?id=eq.{cid}",
         {'status': 'rejected', 'reviewed_at': now}, prefer='return=minimal')
    print('Rejected. The grant keeps its current link and stays flagged.')


def open_both(cid):
    rows = rest('GET', f'link_candidates?select=*&id=eq.{cid}', prefer='')
    if not rows:
        print('No candidate with that id.')
        return
    for u in (rows[0]['candidate_url'], rows[0].get('previous_url')):
        if u:
            subprocess.run(['open', u], check=False)
    print('Opened in your browser. Compare, then approve or reject.')


def walkthrough():
    """
    One at a time, no ids.

    Copying UUIDs out of a list is where this went wrong in practice: it is
    easy to re-run a spent command from scrollback and hard to tell what is
    left. This holds the list itself and asks a question per item.
    """
    rows = pending()
    if not rows:
        show(rows)
        return

    print(f'{len(rows)} to review. Each one opens in your browser.')
    print("a = approve   r = reject   s = skip for now   q = stop\n")

    done = 0
    for i, r in enumerate(rows, 1):
        grant = r.get('opportunities') or {}
        print('-' * 66)
        print(f"[{i} of {len(rows)}]  {grant.get('name', '(unknown grant)')}")
        print(f"  confidence  {float(r['confidence'] or 0):.2f}  (found by: {r['method']})")
        print(f"  was         {(r.get('previous_url') or '')[:88]}")
        print(f"  proposed    {r['candidate_url'][:88]}")
        if r.get('page_title'):
            print(f"  page title  {r['page_title'][:88]}")
        if r.get('reasoning'):
            print(f"  why         {r['reasoning'][:88]}")

        for u in (r['candidate_url'], r.get('previous_url')):
            if u:
                subprocess.run(['open', u], check=False)

        while True:
            choice = input('\n  Is the proposed page the right grant? [a/r/s/q] ').strip().lower()
            if choice in ('a', 'r', 's', 'q'):
                break
            print('  Please answer a, r, s or q.')

        if choice == 'q':
            print(f'\nStopped. {done} handled, {len(rows) - i + 1} still waiting.')
            return
        if choice == 's':
            print('  Skipped — it stays in the queue.')
            continue
        print()
        (approve if choice == 'a' else reject)(r['id'])
        done += 1

    print(f'\n{"=" * 66}\nAll done. {done} handled.')


if __name__ == '__main__':
    args = sys.argv[1:]
    if not args:
        show(pending())
    elif args[0] == '--go':
        walkthrough()
    elif args[0] == '--approve' and len(args) > 1:
        approve(args[1])
    elif args[0] == '--reject' and len(args) > 1:
        reject(args[1])
    elif args[0] == '--open' and len(args) > 1:
        open_both(args[1])
    else:
        print(__doc__)
