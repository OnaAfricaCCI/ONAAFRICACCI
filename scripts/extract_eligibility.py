"""
Work out who can apply to each grant, from the funder's own page.

The card can show where an applicant must be based, cleaned from the funder's
wording, but not the question that actually gates an application: individual or
registered organisation. This reads each funder's page and extracts that, in
structured form, with the sentence it relied on kept as evidence.

Nothing it writes reaches a visitor. Extractions land in the eligibility
columns with `eligibility_reviewed = false`, and the card only shows structured
eligibility once a person has approved it with review_eligibility.py. This
script proposes; a human disposes.

  python3 scripts/extract_eligibility.py                 # dry run, prints findings
  python3 scripts/extract_eligibility.py --write         # save for review
  python3 scripts/extract_eligibility.py --featured      # the homepage twelve first
  python3 scripts/extract_eligibility.py --name Caine    # one grant
  python3 scripts/extract_eligibility.py --limit 10 --write

Only pages that can actually be read are extracted. About half the funder sites
are JavaScript-rendered or block automated traffic; those are reported as
"could not read" and left for the browser or hand entry, never guessed at.
"""
import argparse
import json
import os
import re
import ssl
import sys
import time
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
HDR = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/128.0 Safari/537.36')
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def rest(method, path, body=None, prefer='return=representation'):
    req = urllib.request.Request(
        f'{URL}/rest/v1/{path}', method=method, headers={**HDR, 'Prefer': prefer},
        data=json.dumps(body).encode() if body is not None else None,
    )
    with urllib.request.urlopen(req, timeout=45) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def page_text(url):
    """The readable words on a page, or None if it could not be read."""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'text/html,*/*'})
        with urllib.request.urlopen(req, timeout=20, context=CTX) as r:
            html = r.read(500_000).decode(r.headers.get_content_charset() or 'utf-8', 'replace')
    except Exception:
        return None
    html = re.sub(r'(?is)<(script|style|nav|footer|svg)[^>]*>.*?</\1>', ' ', html)
    text = re.sub(r'<[^>]+>', ' ', html)
    text = re.sub(r'&[a-z]+;|&#\d+;', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text if len(text) >= 1500 else None


TOOL = {
    'name': 'eligibility',
    'description': 'Record who can apply, drawn only from the funder page.',
    'input_schema': {
        'type': 'object',
        'properties': {
            'who': {
                'type': 'string',
                'enum': ['individual', 'organisation', 'either', 'partnership', 'unclear'],
                'description': (
                    'individual = open to individual creatives. organisation = applicant must be a '
                    'registered company/NGO/institution. either = both are accepted. partnership = '
                    'requires a named partner or co-producer. unclear = the page does not say. '
                    'Use unclear freely; it is an honest answer.'
                ),
            },
            'conditions': {
                'type': ['string', 'null'],
                'description': (
                    'One short condition in the funder\'s own terms, e.g. "with a European '
                    'co-production structure" or "first or second feature". null if none stands out. '
                    'Not a summary of the whole page.'
                ),
            },
            'confidence': {'type': 'string', 'enum': ['high', 'medium', 'low']},
            'evidence': {
                'type': 'string',
                'description': 'The exact sentence from the page that says who can apply. Quote it.',
            },
        },
        'required': ['who', 'confidence', 'evidence'],
    },
}


def ask(grant, text):
    prompt = f"""A funding opportunity on our site needs its eligibility made clear.
From the funder's page below, work out WHO can apply. State only what the page
says; if it does not say, answer "unclear".

THE OPPORTUNITY
Name: {grant['name']}
Funder: {grant.get('funder') or 'unknown'}
What we already note about where: {', '.join(grant.get('eligible_countries') or []) or 'nothing'}

THE FUNDER'S PAGE
{text}

Decide who can apply: an individual creative, a registered organisation, either,
or a partnership. Quote the sentence you relied on. Do not infer beyond the page."""
    body = json.dumps({
        'model': 'claude-haiku-4-5-20251001',
        'max_tokens': 500,
        'tools': [TOOL],
        'tool_choice': {'type': 'tool', 'name': 'eligibility'},
        'messages': [{'role': 'user', 'content': prompt}],
    }).encode()
    req = urllib.request.Request(
        'https://api.anthropic.com/v1/messages', data=body,
        headers={'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01',
                 'Content-Type': 'application/json'},
    )
    # The API returns 429/529/503 when briefly overloaded. Back off and retry
    # rather than lose the page read that already succeeded.
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                payload = json.loads(r.read())
            for block in payload.get('content', []):
                if block.get('type') == 'tool_use':
                    return block['input']
            return None
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503, 529) and attempt < 3:
                time.sleep(2 * (attempt + 1))
                continue
            raise
    return None


def one(grant):
    """Returns (row_or_None, log_lines)."""
    log = [f"\n{grant['name'][:64]}"]
    link = (grant.get('application_link') or '').strip()
    if not link:
        log.append('  — no link, cannot read')
        return None, log

    text = page_text(link)
    if not text:
        log.append('  ✗ could not read the page (JavaScript or blocked) — leave for the browser')
        return None, log

    try:
        v = ask(grant, text)
    except Exception as e:
        log.append(f'  ! extraction failed: {e}')
        return None, log
    if not v:
        log.append('  ! no answer returned')
        return None, log

    if v['who'] == 'unclear':
        log.append(f"  ? page does not say who — not proposing ({v.get('evidence','')[:70]})")
        return None, log

    log.append(f"  ✓ {v['who']}  [{v['confidence']}]")
    if v.get('conditions'):
        log.append(f"    condition: {v['conditions'][:80]}")
    log.append(f"    evidence: \"{v['evidence'][:100]}\"")
    return {
        'id': grant['id'],
        'eligible_who': v['who'],
        'eligible_conditions': v.get('conditions') or None,
        'eligibility_confidence': v['confidence'],
        'eligibility_evidence': v['evidence'][:1000],
        'eligibility_reviewed': False,
    }, log


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--write', action='store_true', help='save extractions for review')
    ap.add_argument('--featured', action='store_true', help='the homepage twelve first')
    ap.add_argument('--name', help='only grants whose name contains this')
    ap.add_argument('--limit', type=int, default=25)
    ap.add_argument('--all', action='store_true', help='every unreviewed grant')
    ap.add_argument('--workers', type=int, default=4)
    args = ap.parse_args()

    if not ANTHROPIC_KEY.startswith('sk-ant-api'):
        print('ANTHROPIC_API_KEY is missing or malformed in .env.local.')
        sys.exit(1)

    cols = 'id,name,funder,eligible_countries,application_link'
    q = (f'opportunities?select={cols}&description=not.is.null'
         '&eligibility_reviewed=eq.false&link_state=neq.dead')
    if args.featured:
        q += '&featured=eq.true'
    if args.name:
        q += f'&name=ilike.*{urllib.parse.quote(args.name)}*'
    q += '&order=featured.desc,name'
    grants = rest('GET', q, prefer='')
    if not (args.all or args.name):
        grants = grants[: args.limit]

    if not grants:
        print('Nothing to extract. Every grant is either reviewed or dead.')
        return

    print(f'Reading {len(grants)} funder page(s).')
    print('DRY RUN — nothing saved. Add --write to save for review.\n'
          if not args.write else 'Extractions will be saved for review.\n')

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        results = list(ex.map(one, grants))

    for _, log in results:
        print('\n'.join(log))

    found = [row for row, _ in results if row]
    print(f'\n{"=" * 66}')
    print(f'{len(found)} of {len(grants)} pages gave a clear answer. '
          f'{len(grants) - len(found)} unreadable or unclear.')

    if not args.write:
        print('\nDry run — nothing saved. Re-run with --write to queue these for review.')
        return

    saved = 0
    for row in found:
        rid = row.pop('id')
        rest('PATCH', f'opportunities?id=eq.{rid}', row, prefer='return=minimal')
        saved += 1
    print(f'{saved} saved as unreviewed.')
    print('\nReview them with:  python3 scripts/review_eligibility.py --go')


if __name__ == '__main__':
    main()
