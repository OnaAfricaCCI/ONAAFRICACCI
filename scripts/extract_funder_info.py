"""
Propose "what they fund" and "how to apply" for each funder, from its own page.

Funder profiles are thin because two useful fields are almost always empty:
`what_they_fund` (140 of 146 blank) and `how_to_apply` (all blank). This reads
each funder's grants/opportunities page — or its website if that is all we have
— and drafts those two fields IN THE FUNDER'S OWN TERMS, with the sentence it
relied on kept as evidence.

Nothing it writes reaches a visitor. Proposals land in a holding queue
(scripts/funder_enrichment_queue.json), and only reach the live funder row once
a person approves them with review_funder_info.py. This script proposes; a
human disposes — the same gate used for eligibility.

  python3 scripts/extract_funder_info.py                 # dry run, prints findings
  python3 scripts/extract_funder_info.py --write         # save to the queue for review
  python3 scripts/extract_funder_info.py --name Goethe   # one funder
  python3 scripts/extract_funder_info.py --limit 10 --write
  python3 scripts/extract_funder_info.py --all --write   # every funder missing a field

Only pages that can actually be read are drafted. About half of funder sites are
JavaScript-rendered or block automated traffic; those are reported as
"could not read" and left for hand entry, never guessed at.
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
QUEUE = os.path.join(ROOT, 'scripts', 'funder_enrichment_queue.json')
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


def rest(method, path, body=None, prefer=''):
    req = urllib.request.Request(
        f'{URL}/rest/v1/{path}', method=method, headers={**HDR, 'Prefer': prefer},
        data=json.dumps(body).encode() if body is not None else None,
    )
    with urllib.request.urlopen(req, timeout=45) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def page_text(url):
    """The readable words on a page, or None if it could not be read."""
    if not url:
        return None
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
    'name': 'funder_info',
    'description': 'Record what a funder supports and how to apply, drawn only from its page.',
    'input_schema': {
        'type': 'object',
        'properties': {
            'what_they_fund': {
                'type': ['string', 'null'],
                'description': (
                    'One to three sentences, in the organisation\'s own terms, naming what it '
                    'funds or supports: the disciplines, the kinds of activity, and who it is for. '
                    'Factual and grounded in the page — not marketing, not inferred. null if the '
                    'page does not say.'
                ),
            },
            'what_they_fund_evidence': {
                'type': ['string', 'null'],
                'description': 'A short quoted phrase or sentence from the page that supports it.',
            },
            'how_to_apply': {
                'type': ['string', 'null'],
                'description': (
                    'How an applicant actually applies, as the page states it: the route (online '
                    'portal, application form, email, annual open call) and the key steps or '
                    'documents if given. One to three sentences. null if the page does not say.'
                ),
            },
            'how_to_apply_evidence': {
                'type': ['string', 'null'],
                'description': 'A short quoted phrase or sentence from the page that supports it.',
            },
            'confidence': {'type': 'string', 'enum': ['high', 'medium', 'low']},
        },
        'required': ['confidence'],
    },
}


def ask(funder, text):
    prompt = f"""This organisation funds creative work. From its page below, draft two
fields for our directory, using the organisation's OWN wording and stating only
what the page actually says.

THE ORGANISATION
Name: {funder['name']}

ITS PAGE
{text[:14000]}

Draft:
1. what_they_fund — what this organisation funds or supports (disciplines,
   activities, who it is for).
2. how_to_apply — how an applicant applies (the route and key steps).

Quote the sentence you relied on for each (the evidence may be in the page's
original language). Write what_they_fund and how_to_apply themselves in English —
if the page is in another language, translate faithfully without adding anything.
If the page does not state a field, return null for it — do not infer or invent.
Be concise and factual."""
    body = json.dumps({
        'model': 'claude-haiku-4-5-20251001',
        'max_tokens': 700,
        'tools': [TOOL],
        'tool_choice': {'type': 'tool', 'name': 'funder_info'},
        'messages': [{'role': 'user', 'content': prompt}],
    }).encode()
    req = urllib.request.Request(
        'https://api.anthropic.com/v1/messages', data=body,
        headers={'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01',
                 'Content-Type': 'application/json'},
    )
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


def one(funder):
    """Returns (proposal_or_None, log_lines)."""
    log = [f"\n{funder['name'][:60]}"]
    page = funder.get('grants_page_url') or funder.get('website')
    text = page_text(page)
    # Fall back to the website if the grants page was unreadable.
    if not text and funder.get('grants_page_url') and funder.get('website'):
        page = funder['website']
        text = page_text(page)
    if not text:
        log.append('  ✗ could not read the page (JavaScript or blocked) — leave for hand entry')
        return None, log

    try:
        v = ask(funder, text)
    except Exception as e:
        log.append(f'  ! extraction failed: {e}')
        return None, log
    if not v:
        log.append('  ! no answer returned')
        return None, log

    # Only propose the fields the funder is actually missing.
    prop = {'id': funder['id'], 'name': funder['name'], 'slug': funder.get('slug'),
            'source_url': page, 'confidence': v.get('confidence')}
    got = []
    if not funder.get('what_they_fund') and v.get('what_they_fund'):
        prop['what_they_fund'] = v['what_they_fund']
        prop['what_they_fund_evidence'] = v.get('what_they_fund_evidence')
        got.append('what_they_fund')
    if not funder.get('how_to_apply') and v.get('how_to_apply'):
        prop['how_to_apply'] = v['how_to_apply']
        prop['how_to_apply_evidence'] = v.get('how_to_apply_evidence')
        got.append('how_to_apply')

    if not got:
        log.append('  ? page did not yield a missing field — nothing proposed')
        return None, log

    log.append(f"  ✓ {', '.join(got)}  [{v.get('confidence')}]")
    if 'what_they_fund' in prop:
        log.append(f"    funds: {prop['what_they_fund'][:90]}")
    if 'how_to_apply' in prop:
        log.append(f"    apply: {prop['how_to_apply'][:90]}")
    return prop, log


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--write', action='store_true', help='save proposals to the review queue')
    ap.add_argument('--name', help='only funders whose name contains this')
    ap.add_argument('--limit', type=int, default=25)
    ap.add_argument('--all', action='store_true', help='every funder missing a field')
    ap.add_argument('--workers', type=int, default=4)
    args = ap.parse_args()

    if not ANTHROPIC_KEY.startswith('sk-ant-api'):
        print('ANTHROPIC_API_KEY is missing or malformed in .env.local.')
        sys.exit(1)

    cols = 'id,name,slug,what_they_fund,how_to_apply,grants_page_url,website'
    q = (f'funders?select={cols}&is_active=eq.true&description=not.is.null'
         '&or=(what_they_fund.is.null,how_to_apply.is.null)')
    if args.name:
        q += f'&name=ilike.*{urllib.parse.quote(args.name)}*'
    q += '&order=name'
    funders = rest('GET', q)
    if not (args.all or args.name):
        funders = funders[: args.limit]
    if not funders:
        print('Nothing to extract — every funder already has both fields.')
        return

    print(f'Reading {len(funders)} funder page(s).')
    print('DRY RUN — nothing saved. Add --write to queue for review.\n'
          if not args.write else f'Proposals will be queued in {os.path.relpath(QUEUE, ROOT)}.\n')

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        results = list(ex.map(one, funders))
    for _, log in results:
        print('\n'.join(log))

    found = [p for p, _ in results if p]
    print(f'\n{"=" * 66}')
    print(f'{len(found)} of {len(funders)} pages gave at least one field. '
          f'{len(funders) - len(found)} unreadable or unclear.')

    if not args.write:
        print('\nDry run — nothing saved. Re-run with --write to queue these for review.')
        return

    # Merge into the queue, keyed by funder id (a re-run refreshes a proposal).
    existing = {}
    if os.path.exists(QUEUE):
        existing = {p['id']: p for p in json.load(open(QUEUE))}
    for p in found:
        p['reviewed'] = False
        existing[p['id']] = p
    json.dump(list(existing.values()), open(QUEUE, 'w'), indent=2, ensure_ascii=False)
    print(f'{len(found)} queued ({len(existing)} total in queue).')
    print('\nReview them with:  python3 scripts/review_funder_info.py --go')


if __name__ == '__main__':
    main()
