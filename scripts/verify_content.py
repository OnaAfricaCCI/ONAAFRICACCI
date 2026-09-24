"""
Check whether what we SAY about a grant still matches what its page says.

The link checker only asks "does this page load?". It never asks "does this
page still say what we claim it says". So a grant whose deadline passed in
March, whose award changed from $5,000 to $15,000, or which closed permanently
while leaving its page up, sails through every check we have: green light,
working link, wrong information.

That is the real reputation risk. A dead link is visibly broken and forgivable.
A confidently wrong listing sends someone to plan around a deadline that moved,
and sends a funder applications for a programme that ended.

This reads each grant's page and asks Claude to compare it with what we store.
It writes NOTHING. It produces a report for you to act on, because correcting a
grant's details is a decision about content, and content decisions are yours.

  python3 scripts/verify_content.py                  # the 25 most at-risk
  python3 scripts/verify_content.py --all            # every live grant
  python3 scripts/verify_content.py --name HEVA      # one grant
  python3 scripts/verify_content.py --limit 5        # a quick sample

"Most at-risk" means: deadline already passed, or no deadline recorded at all.
Those are the listings most likely to be quietly out of date.
"""
import argparse
import datetime
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = {
    l.split('=', 1)[0]: l.split('=', 1)[1].strip().strip('"')
    for l in open(os.path.join(ROOT, '.env.local'))
    if '=' in l and not l.startswith('#')
}
URL = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')
KEY = env['SUPABASE_SERVICE_ROLE_KEY']
ANTHROPIC_KEY = env.get('ANTHROPIC_API_KEY', '')
HDR = {'apikey': KEY, 'Authorization': f'Bearer {KEY}'}
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/128.0 Safari/537.36')

TODAY = datetime.date.today().isoformat()


def rest(path):
    req = urllib.request.Request(f'{URL}/rest/v1/{path}', headers=HDR)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def page_text(url):
    """The page's visible words, roughly. Enough for Claude to judge."""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'text/html,*/*'})
        with urllib.request.urlopen(req, timeout=20) as r:
            html = r.read(500_000).decode(r.headers.get_content_charset() or 'utf-8', 'replace')
    except Exception:
        return None
    html = re.sub(r'(?is)<(script|style|nav|footer|svg)[^>]*>.*?</\1>', ' ', html)
    text = re.sub(r'<[^>]+>', ' ', html)
    text = re.sub(r'&[a-z]+;|&#\d+;', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()[:7000]


ASSESS_TOOL = {
    'name': 'assess_listing',
    'description': 'Compare what our site claims about a grant with what its own page says.',
    'input_schema': {
        'type': 'object',
        'properties': {
            'verdict': {
                'type': 'string',
                'enum': ['current', 'changed', 'closed', 'unclear'],
                'description': (
                    'current = our details still match the page. '
                    'changed = the page gives a different deadline, amount or terms. '
                    'closed = the programme has ended or is explicitly not accepting applications. '
                    'unclear = the page does not say enough to judge (a login wall, a '
                    'JavaScript-only page, or a general index). Use unclear freely — it is '
                    'an honest answer and far better than a guess.'
                ),
            },
            'deadline_on_page': {
                'type': ['string', 'null'],
                'description': 'The deadline the page states, as written. null if it states none.',
            },
            'amount_on_page': {
                'type': ['string', 'null'],
                'description': 'The award amount the page states, as written. null if it states none.',
            },
            'note': {
                'type': 'string',
                'description': 'One sentence a non-technical editor can act on.',
            },
        },
        'required': ['verdict', 'note'],
    },
}


def assess(grant, text):
    prompt = f"""Our funding site lists this opportunity. Check it against the funder's own page.

WHAT WE CURRENTLY TELL PEOPLE
Name:     {grant['name']}
Funder:   {grant.get('funder') or 'not recorded'}
Deadline: {grant.get('deadline') or ('rolling' if grant.get('deadline_type') == 'rolling' else 'not recorded')}
Amount:   {grant.get('amount') or 'not recorded'}
Summary:  {(grant.get('description') or '')[:400]}

Today's date is {TODAY}.

THE FUNDER'S PAGE, AS TEXT
{text}

Does what we tell people still match this page?

Judge the SUBSTANCE, not the wording — a differently phrased but equivalent
deadline is 'current'. Say 'changed' only when a visitor would be materially
misled: a different date, a different amount, or terms that have moved.

Say 'closed' only where the page itself says the programme has ended or is not
accepting applications — not merely because a date has passed.

If the page is a login wall, requires JavaScript, or is a general index rather
than this programme's page, say 'unclear'. Do not guess."""

    body = json.dumps({
        'model': 'claude-haiku-4-5-20251001',
        'max_tokens': 400,
        'tools': [ASSESS_TOOL],
        'tool_choice': {'type': 'tool', 'name': 'assess_listing'},
        'messages': [{'role': 'user', 'content': prompt}],
    }).encode()
    req = urllib.request.Request(
        'https://api.anthropic.com/v1/messages', data=body,
        headers={'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01',
                 'Content-Type': 'application/json'},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            payload = json.loads(r.read())
    except Exception as e:
        return {'verdict': 'unclear', 'note': f'could not be assessed: {e}'}
    for block in payload.get('content', []):
        if block.get('type') == 'tool_use':
            return block['input']
    return {'verdict': 'unclear', 'note': 'no assessment returned'}


def one(grant):
    link = (grant.get('application_link') or '').strip()
    if not link:
        return {**grant, 'verdict': 'unclear', 'note': 'no application link stored'}
    text = page_text(link)
    if not text or len(text) < 200:
        return {**grant, 'verdict': 'unclear', 'note': 'page returned too little text to read'}
    return {**grant, **assess(grant, text)}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--all', action='store_true', help='every live grant, not just the at-risk ones')
    ap.add_argument('--limit', type=int, default=25)
    ap.add_argument('--name', help='only grants whose name contains this')
    ap.add_argument('--workers', type=int, default=4)
    args = ap.parse_args()

    if not ANTHROPIC_KEY.startswith('sk-ant-api'):
        print('ANTHROPIC_API_KEY is missing or malformed in .env.local.')
        sys.exit(1)

    cols = 'id,name,funder,deadline,deadline_type,amount,description,application_link'
    q = f'opportunities?select={cols}&link_state=eq.ok&order=deadline.asc.nullsfirst'
    if args.name:
        q += f'&name=ilike.*{urllib.parse.quote(args.name)}*'
    grants = rest(q)

    if not args.all and not args.name:
        # Most at risk: a deadline already gone, or none recorded at all.
        grants = [
            g for g in grants
            if not g.get('deadline') or str(g['deadline']) < TODAY
        ]
    grants = grants[: args.limit] if not args.all else grants

    if not grants:
        print('Nothing to check.')
        return

    print(f'Reading {len(grants)} grant page(s) and comparing with what we say.')
    print('This writes nothing — it produces a report.\n')

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        results = list(ex.map(one, grants))

    order = {'closed': 0, 'changed': 1, 'unclear': 2, 'current': 3}
    results.sort(key=lambda r: order.get(r['verdict'], 9))

    lines = [f'# Content check — {TODAY}', '',
             f'{len(results)} grants read.', '']
    counts = {v: sum(1 for r in results if r['verdict'] == v) for v in order}
    print('=' * 70)
    print('  CLOSED   %2d   the page says the programme has ended' % counts['closed'])
    print('  CHANGED  %2d   the page gives different details than we do' % counts['changed'])
    print('  UNCLEAR  %2d   could not be judged from the page' % counts['unclear'])
    print('  CURRENT  %2d   we still match the page' % counts['current'])
    print('=' * 70)

    for verdict, heading in [
        ('closed', 'ENDED — consider removing or marking closed'),
        ('changed', 'OUT OF DATE — our details differ from the page'),
        ('unclear', 'COULD NOT CHECK — worth a human glance'),
    ]:
        rows = [r for r in results if r['verdict'] == verdict]
        if not rows:
            continue
        print(f'\n{heading}  ({len(rows)})\n' + '-' * 70)
        lines += [f'## {heading}', '']
        for r in rows:
            print(f"  {r['name'][:58]}")
            print(f"    {r['note'][:100]}")
            if verdict == 'changed':
                if r.get('deadline_on_page'):
                    print(f"    deadline — we say {r.get('deadline') or 'none'} · page says {r['deadline_on_page'][:40]}")
                if r.get('amount_on_page'):
                    print(f"    amount   — we say {(r.get('amount') or 'none')[:34]} · page says {r['amount_on_page'][:34]}")
            print(f"    {(r.get('application_link') or '')[:88]}\n")
            lines += [f"- **{r['name']}** — {r['note']}",
                      f"  - we say: deadline {r.get('deadline') or 'none'}, amount {r.get('amount') or 'none'}",
                      f"  - page says: deadline {r.get('deadline_on_page') or 'none'}, amount {r.get('amount_on_page') or 'none'}",
                      f"  - {r.get('application_link')}", '']

    out = os.path.join(ROOT, f'content-check-{TODAY}.md')
    open(out, 'w').write('\n'.join(lines))
    print(f'\nFull report written to {os.path.basename(out)}')
    print('Nothing was changed. Tell Claude which entries to correct.')


if __name__ == '__main__':
    main()
