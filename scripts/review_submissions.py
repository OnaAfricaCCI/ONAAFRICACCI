"""
Review opportunities submitted through the website.

Submissions land in `opportunity_submissions` with status 'pending'. Nothing
reaches the public grants database until it is approved here.

  python3 scripts/review_submissions.py                 # list what's waiting
  python3 scripts/review_submissions.py --approve <id>  # publish it
  python3 scripts/review_submissions.py --reject  <id>  # decline it
  python3 scripts/review_submissions.py --approve-all   # publish everything pending

Approving copies the submission into `opportunities`, checks the link works,
and marks the submission 'published' so it can't be published twice.
"""
import json, os, re, sys, urllib.request, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = {l.split('=', 1)[0]: l.split('=', 1)[1].strip().strip('"')
       for l in open(os.path.join(ROOT, '.env.local')) if '=' in l and not l.startswith('#')}
URL, KEY = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/'), env['SUPABASE_SERVICE_ROLE_KEY']
HDR = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}

def rest(method, path, body=None, prefer='return=representation'):
    req = urllib.request.Request(f'{URL}/rest/v1/{path}', method=method, headers={**HDR, 'Prefer': prefer},
                                 data=json.dumps(body).encode() if body is not None else None)
    with urllib.request.urlopen(req) as r:
        raw = r.read()
        return json.loads(raw) if raw else None

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128 Safari/537.36'
def check_link(url):
    if not url: return (None, None)
    try:
        req = urllib.request.Request(url, method='GET', headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=12) as r:
            return (r.status < 400, r.status)
    except urllib.error.HTTPError as e:
        return (e.code == 403, e.code)     # 403 = up, just blocks bots
    except Exception:
        return (False, None)

def show(rows):
    if not rows:
        print('Nothing waiting for review.')
        return
    print(f'{len(rows)} submission(s) pending:\n')
    for r in rows:
        print(f"  id {r['id']}")
        print(f"     {r['name']}")
        for label, key in [('Organisation', 'organization'), ('Amount', 'amount'),
                           ("Who it's for", 'for_who'), ('Deadline', 'deadline'),
                           ('Link', 'link'), ('Notes', 'notes'), ('Contact', 'contact_email')]:
            v = r.get(key)
            if key == 'deadline' and r.get('rolling'): v = 'Rolling / no fixed deadline'
            if v: print(f"     {label:14} {str(v)[:90]}")
        print(f"     submitted     {r['created_at'][:16].replace('T',' ')}\n")
    print('Approve with:  python3 scripts/review_submissions.py --approve <id>')

def publish(sub):
    """Copy a submission into the public grants database."""
    ok, status = check_link(sub.get('link'))
    desc_bits = []
    if sub.get('amount'): desc_bits.append(f"{sub['amount'].rstrip('.')}.")
    if sub.get('for_who'):
        w = sub['for_who'].rstrip('.')
        desc_bits.append(f"Supports {w[0].lower()}{w[1:]}.")
    if sub.get('notes'): desc_bits.append(sub['notes'].rstrip('.') + '.')
    description = ' '.join(desc_bits) or None
    if not description:
        print(f"  ! {sub['name']}: no amount, who-it's-for or notes — nothing to describe it with.")
        print("    The site never publishes a blank record. Add detail to the submission first.")
        return False

    link = (sub.get('link') or '').strip() or None
    row = {
        'name': sub['name'],
        'funder': sub.get('organization') or None,
        'amount': sub.get('amount') or None,
        'deadline': None if sub.get('rolling') else (sub.get('deadline') or None),
        'deadline_type': 'rolling' if sub.get('rolling') else ('fixed' if sub.get('deadline') else 'unknown'),
        'application_link': link,
        'source_url': (link.lower().rstrip('/') if link else f"submission:{sub['id']}"),
        'description': description,
        'eligible_countries': [],
        'funding_type': 'grant',
        'source': 'submitted',
        'link_ok': ok,
        'link_status': status,
        'link_checked_at': datetime.datetime.now(datetime.timezone.utc).isoformat() if link else None,
    }
    try:
        created = rest('POST', 'opportunities', row)
    except urllib.error.HTTPError as e:
        if e.code == 409:
            print(f"  ! {sub['name']}: a grant with that link already exists."); return False
        raise
    rest('PATCH', f"opportunity_submissions?id=eq.{sub['id']}", {'status': 'published'}, 'return=minimal')
    link_note = 'link OK' if ok else (f'link problem ({status})' if link else 'no link')
    print(f"  ✓ published: {sub['name']}  [{link_note}]")
    if ok is False:
        print("    Note: it won't appear in the homepage carousel until the link works.")
    return True

if __name__ == '__main__':
    args = sys.argv[1:]
    pending = rest('GET', 'opportunity_submissions?select=*&status=eq.pending&order=created_at.desc', prefer='')

    if not args:
        show(pending)
    elif args[0] == '--approve-all':
        for s in pending: publish(s)
    elif args[0] == '--approve' and len(args) > 1:
        rows = rest('GET', f'opportunity_submissions?select=*&id=eq.{args[1]}', prefer='')
        if not rows: print('No submission with that id.')
        elif rows[0]['status'] != 'pending': print(f"Already {rows[0]['status']}.")
        else: publish(rows[0])
    elif args[0] == '--reject' and len(args) > 1:
        rest('PATCH', f'opportunity_submissions?id=eq.{args[1]}', {'status': 'rejected'}, 'return=minimal')
        print('Marked as rejected.')
    else:
        print(__doc__)
