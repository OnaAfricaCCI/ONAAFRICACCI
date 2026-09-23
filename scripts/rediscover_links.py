"""
Find new homes for grants whose application link has died.

When a link 404s the organisation is usually alive and still funding — the page
just moved. This does the looking, the way a person would:

  1. Follow a redirect, if the old URL quietly points somewhere new.
  2. Ask the Wayback Machine what the page looked like when it last worked, and
     read the programme name out of it.
  3. Crawl the organisation's own site — the funding, grants and open-call
     pages — and collect links whose wording resembles the grant.
  4. Hand the shortlist to Claude with the grant's name, funder and description
     and ask: is any of these the same programme? Answer with a confidence.

Everything found is written to `link_candidates` for review. NOTHING touches
the live grants. Approve with review_links.py, which re-checks the URL before
publishing it.

Run from the project root:

  python3 scripts/rediscover_links.py                 # dry run, prints findings
  python3 scripts/rediscover_links.py --write         # save candidates for review
  python3 scripts/rediscover_links.py --limit 5       # try a handful first
  python3 scripts/rediscover_links.py --name HEVA     # one grant by name

Worth knowing: this runs from your laptop, not from a datacentre, so sites that
refuse automated traffic from servers will usually talk to it.
"""
import argparse
import json
import os
import re
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

# Where funding programmes tend to live on an organisation's own site.
CANDIDATE_PATHS = [
    '', '/grants', '/funding', '/funds', '/opportunities', '/open-calls',
    '/apply', '/programmes', '/programs', '/what-we-do', '/our-work', '/support',
]

# Words that mark a link as worth considering at all.
FUNDING_WORDS = re.compile(
    r'grant|fund|prize|award|fellow|residen|call|apply|application|programme|program|opportunit',
    re.I,
)


# ---------------------------------------------------------------------------
# Supabase
# ---------------------------------------------------------------------------

def rest(method, path, body=None, prefer='return=representation'):
    req = urllib.request.Request(
        f'{URL}/rest/v1/{path}', method=method, headers={**HDR, 'Prefer': prefer},
        data=json.dumps(body).encode() if body is not None else None,
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


# ---------------------------------------------------------------------------
# The web
# ---------------------------------------------------------------------------

def fetch(url, timeout=15, max_bytes=400_000):
    """Return (status, final_url, html). Never raises."""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'text/html,*/*'})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read(max_bytes)
            charset = r.headers.get_content_charset() or 'utf-8'
            return r.status, r.geturl(), body.decode(charset, errors='replace')
    except urllib.error.HTTPError as e:
        try:
            return e.code, url, e.read(max_bytes).decode('utf-8', errors='replace')
        except Exception:
            return e.code, url, ''
    except Exception:
        return None, url, ''


def page_title(html):
    m = re.search(r'<title[^>]*>(.*?)</title>', html, re.I | re.S)
    return re.sub(r'\s+', ' ', m.group(1)).strip()[:200] if m else ''


def links_on(html, base):
    """Every absolute link on a page, with its anchor text."""
    out = []
    for m in re.finditer(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', html, re.I | re.S):
        href, text = m.group(1), re.sub(r'<[^>]+>', ' ', m.group(2))
        text = re.sub(r'\s+', ' ', text).strip()
        if not href or href.startswith(('#', 'mailto:', 'tel:', 'javascript:')):
            continue
        out.append((urllib.parse.urljoin(base, href), text[:120]))
    return out


# ---------------------------------------------------------------------------
# The three ways of looking
# ---------------------------------------------------------------------------

def try_redirect(dead_url):
    """The simplest case: the old URL now points somewhere that works."""
    status, final, html = fetch(dead_url)
    if status and status < 400 and final.rstrip('/') != dead_url.rstrip('/'):
        return [{'url': final, 'text': page_title(html), 'method': 'redirect'}]
    return []


def try_wayback(dead_url):
    """
    Ask the Internet Archive for the last working snapshot.

    The snapshot itself is the wrong thing to publish — it is a museum piece,
    not a live application page. What it is good for is telling us what the
    programme was actually called and which outbound links it carried, which
    makes the crawl below far more accurate.
    """
    api = 'https://archive.org/wayback/available?url=' + urllib.parse.quote(dead_url, safe='')
    status, _, body = fetch(api, timeout=20)
    if status != 200:
        return None
    try:
        snap = json.loads(body).get('archived_snapshots', {}).get('closest')
    except Exception:
        return None
    if not snap or not snap.get('available'):
        return None
    _, _, html = fetch(snap['url'], timeout=25)
    return {'snapshot': snap['url'], 'timestamp': snap.get('timestamp', ''), 'title': page_title(html)}


def crawl_site(dead_url, grant_name, budget=8):
    """
    Walk the organisation's own site looking for the programme.

    Deliberately shallow: the funding index pages, and the links on them. We
    are looking for a page the organisation itself points at, not trying to
    index their website.
    """
    parts = urllib.parse.urlparse(dead_url)
    origin = f'{parts.scheme}://{parts.netloc}'
    seen, found = set(), []

    name_words = {w for w in re.findall(r'[a-z]{4,}', grant_name.lower())}

    for path in CANDIDATE_PATHS[:budget]:
        status, final, html = fetch(origin + path, timeout=12)
        if not status or status >= 400 or not html:
            continue
        if final not in seen:
            seen.add(final)
            found.append({'url': final, 'text': page_title(html), 'method': 'crawl'})

        for href, text in links_on(html, final):
            if urllib.parse.urlparse(href).netloc != parts.netloc:
                continue  # stay on the organisation's own site
            if href in seen or len(found) > 60:
                continue
            blob = f'{href} {text}'.lower()
            overlap = len({w for w in re.findall(r'[a-z]{4,}', blob)} & name_words)
            if overlap >= 1 or FUNDING_WORDS.search(blob):
                seen.add(href)
                found.append({'url': href, 'text': text, 'method': 'crawl',
                              '_score': overlap})

    # Strongest name overlap first, so the shortlist we send to Claude is short.
    found.sort(key=lambda c: -c.get('_score', 0))
    return found[:25]


# ---------------------------------------------------------------------------
# Claude decides whether any candidate is the same programme
# ---------------------------------------------------------------------------

JUDGE_TOOL = {
    'name': 'record_match',
    'description': 'Record which candidate URL, if any, is the same funding programme.',
    'input_schema': {
        'type': 'object',
        'properties': {
            'url': {
                'type': ['string', 'null'],
                'description': 'The candidate URL that is the same programme, or null if none is.',
            },
            'confidence': {
                'type': 'number',
                'description': '0.0 to 1.0. Below 0.5 means you are guessing — say null instead.',
            },
            'reasoning': {
                'type': 'string',
                'description': 'One sentence: why this is, or is not, the same programme.',
            },
        },
        'required': ['url', 'confidence', 'reasoning'],
    },
}


def ask_claude(grant, candidates, wayback):
    """
    The judgement step, and it is not optional.

    An earlier version fell back to scoring candidates by how many words of the
    grant's name appeared in each URL. It produced confident-looking nonsense:
    a press release proposed as the Art Moves Africa mobility grant, a donors
    page proposed as the African Culture Fund's open call. Both would have
    looked plausible in a review queue. Word overlap cannot tell the difference
    between a page ABOUT a programme and the page OF that programme, and a
    review queue full of near-misses is worse than an empty one — it costs
    attention and eventually earns a careless approval.
    """
    if not ANTHROPIC_KEY:
        return None

    listing = '\n'.join(
        f'{i + 1}. {c["url"]}\n   page says: {c.get("text") or "(no title)"}'
        for i, c in enumerate(candidates)
    )
    archive_note = ''
    if wayback and wayback.get('title'):
        archive_note = (
            f'\nWhen the old page still worked, its title was: "{wayback["title"]}"\n'
        )

    prompt = f"""A funding opportunity listed on our site has a dead application link.
We are trying to find where that programme moved to on the same organisation's website.

THE PROGRAMME WE ARE LOOKING FOR
Name: {grant['name']}
Funder: {grant.get('funder') or 'unknown'}
What it does: {(grant.get('description') or '')[:600]}
Dead link: {grant['application_link']}{archive_note}

CANDIDATE PAGES FOUND ON THE SAME SITE
{listing}

Which candidate is the SAME funding programme — the page where someone would now
read about it or apply?

Be strict. A general "our grants" index page is NOT the same as the programme's
own page, unless the programme genuinely has no page of its own any more. A
different programme run by the same funder is NOT a match. If nothing is clearly
the same programme, answer null — that is a useful answer, not a failure.
Confidence below 0.5 means you are guessing: answer null instead."""

    body = json.dumps({
        'model': 'claude-haiku-4-5-20251001',
        'max_tokens': 500,
        'tools': [JUDGE_TOOL],
        'tool_choice': {'type': 'tool', 'name': 'record_match'},
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
        print(f'    ! Claude call failed: {e}')
        return None

    for block in payload.get('content', []):
        if block.get('type') == 'tool_use':
            return block['input']
    return None


# ---------------------------------------------------------------------------
# One grant, end to end
# ---------------------------------------------------------------------------

def rediscover(grant):
    """Returns (candidate_row_or_None, lines_to_print) — the caller prints, so
    that parallel workers can't interleave half-lines with each other."""
    log = []
    def say(line):
        log.append(line)

    dead = (grant.get('application_link') or '').strip()
    say(f'\n{grant["name"][:66]}')
    say(f'  dead: {dead[:88]}')

    if not dead:
        say('  — no link stored, nothing to re-discover')
        return None, log

    # 1. Redirect
    candidates = try_redirect(dead)
    if candidates:
        say(f'  → redirects to {candidates[0]["url"][:76]}')

    # 2. Wayback, for context rather than as an answer
    wayback = try_wayback(dead)
    if wayback:
        say(f'  archive: "{(wayback.get("title") or "")[:60]}" ({wayback.get("timestamp", "")[:8]})')

    # 3. Crawl the organisation's own site
    crawled = crawl_site(dead, grant['name'])
    say(f'  crawled {len(crawled)} candidate pages on the site')
    candidates += crawled

    if not candidates:
        say('  — nothing found to propose')
        if not urllib.parse.urlparse(dead).netloc or fetch(f'https://{urllib.parse.urlparse(dead).netloc}/')[0] is None:
            say('    (the whole domain is unreachable — this one needs a web search, not a crawl)')
        return None, log

    # 4. Claude judges
    verdict = ask_claude(grant, candidates, wayback)
    if not verdict or not verdict.get('url'):
        why = (verdict or {}).get('reasoning', 'no judgement returned')
        say(f'  ✗ no confident match — {why[:90]}')
        return None, log

    chosen = verdict['url']
    confidence = float(verdict.get('confidence') or 0)
    if confidence < 0.5:
        say(f'  ✗ match too weak ({confidence:.2f}) — not proposing')
        return None, log

    status, final, html = fetch(chosen)
    if not status or status >= 400:
        say(f'  ✗ proposed page does not load ({status}) — discarded')
        return None, log

    method = next((c['method'] for c in candidates if c['url'] == chosen), 'crawl')
    say(f'  ✓ candidate ({confidence:.2f}, {method}): {final[:80]}')
    say(f'    {verdict.get("reasoning", "")[:110]}')

    return {
        'opportunity_id': grant['id'],
        'candidate_url': final,
        'previous_url': dead,
        'method': method,
        'confidence': round(confidence, 2),
        'reasoning': verdict.get('reasoning', '')[:1000],
        'page_title': page_title(html)[:200],
        'http_status': status,
        'status': 'pending',
    }, log


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--write', action='store_true', help='save candidates for review')
    ap.add_argument('--limit', type=int, default=0, help='only try this many grants')
    ap.add_argument('--name', help='only grants whose name contains this')
    ap.add_argument('--workers', type=int, default=3, help='how many at once (be polite)')
    args = ap.parse_args()

    query = 'opportunities?select=id,name,funder,description,application_link&link_state=eq.dead&order=name'
    if args.name:
        query += f'&name=ilike.*{urllib.parse.quote(args.name)}*'
    grants = rest('GET', query, prefer='')
    if args.limit:
        grants = grants[: args.limit]

    if not grants:
        print('No grants with a dead link. Nothing to do.')
        return

    # An example key pasted verbatim is a real thing that happens, and it fails
    # much later and much more confusingly than it should.
    if ANTHROPIC_KEY and not ANTHROPIC_KEY.startswith('sk-ant-api'):
        print('The ANTHROPIC_API_KEY in .env.local does not look like a real key.\n')
        print(f'  It starts: {ANTHROPIC_KEY[:12]}…')
        print('  A real one starts sk-ant-api and is about 100 characters long.\n')
        print('If you pasted the example text, replace that line with your own key')
        print('from console.anthropic.com.')
        sys.exit(1)

    if not ANTHROPIC_KEY:
        print('ANTHROPIC_API_KEY is not in .env.local.\n')
        print('The crawl can run without it, but nothing can judge whether a page')
        print('it finds is really the same programme — and a queue of near-misses')
        print('is worse than an empty one. Add the key and run this again:\n')
        print('  ANTHROPIC_API_KEY=sk-ant-...   (one line in .env.local)\n')
        sys.exit(1)

    print(f'Re-discovering {len(grants)} dead link(s).')
    print('DRY RUN — nothing will be saved. Add --write to save candidates.\n'
          if not args.write else 'Candidates will be saved for review.\n')

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        results = list(ex.map(rediscover, grants))

    for _, log in results:
        print('\n'.join(log))

    found = [row for row, _ in results if row]
    print(f'\n{"=" * 68}')
    print(f'{len(found)} of {len(grants)} dead links have a candidate replacement.')

    if not args.write:
        print('\nDry run — nothing saved. Re-run with --write to queue these for review.')
        return
    if not found:
        return

    saved = 0
    for row in found:
        try:
            rest('POST', 'link_candidates', row, prefer='return=minimal')
            saved += 1
        except urllib.error.HTTPError as e:
            if e.code == 409:
                print(f'  (already proposed: {row["candidate_url"][:60]})')
            else:
                print(f'  ! could not save {row["candidate_url"][:50]}: {e.code}')
    print(f'{saved} candidate(s) saved.')
    print('\nReview them with:  python3 scripts/review_links.py')


if __name__ == '__main__':
    main()
