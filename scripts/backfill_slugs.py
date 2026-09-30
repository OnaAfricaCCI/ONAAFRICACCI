"""
Give every grant a permanent slug — the address its own page lives at.

A slug is the URL a search engine ranks and a person bookmarks, so once a grant
has one it must never change. This fills the column in once, only where it is
still empty, and never touches a grant that already has a slug.

The rule matches lib/slug.ts exactly, so a grant's URL is identical whether it
is served from the stored slug or generated on the fly during the backfill.
Collisions (two grants that reduce to the same slug) get -2, -3 appended, and
existing slugs are treated as taken so we never mint a duplicate.

  python3 scripts/backfill_slugs.py            # dry run, shows what it would set
  python3 scripts/backfill_slugs.py --write    # fill the empty ones
"""
import argparse
import json
import re
import sys
import unicodedata
import urllib.request

import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = {
    l.split('=', 1)[0]: l.split('=', 1)[1].strip().strip('"')
    for l in open(os.path.join(ROOT, '.env.local'))
    if '=' in l and not l.startswith('#')
}
URL = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')
KEY = env['SUPABASE_SERVICE_ROLE_KEY']
HDR = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}


def rest(method, path, body=None, prefer='return=representation'):
    req = urllib.request.Request(
        f'{URL}/rest/v1/{path}', method=method, headers={**HDR, 'Prefer': prefer},
        data=json.dumps(body).encode() if body is not None else None,
    )
    with urllib.request.urlopen(req, timeout=45) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def slugify(name: str) -> str:
    """Mirror of lib/slug.ts. Keep the two in step."""
    s = unicodedata.normalize('NFKD', name)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"['’\"]", '', s)
    s = s.replace('&', ' and ')
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = s.strip('-')
    return s[:80]


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--write', action='store_true', help='actually fill the column')
    args = ap.parse_args()

    rows = rest('GET', 'opportunities?select=id,name,slug&order=created_at.asc', prefer='')

    # Every slug already in use is reserved, so the backfill never collides with
    # a grant that was slugged earlier.
    taken = {r['slug'] for r in rows if r.get('slug')}
    todo = [r for r in rows if not r.get('slug') and r.get('name')]

    print(f'{len(rows)} grants · {len(taken)} already slugged · {len(todo)} to fill\n')
    if not todo:
        print('Nothing to do — every grant already has a slug.')
        return

    plan = []
    for r in todo:
        base = slugify(r['name']) or 'grant'
        slug = base
        n = 2
        while slug in taken:
            slug = f'{base}-{n}'
            n += 1
        taken.add(slug)
        plan.append((r['id'], r['name'], slug))
        print(f'  {slug:<52} ← {r["name"][:44]}')

    if not args.write:
        print(f'\nDry run — nothing written. Re-run with --write to set {len(plan)} slugs.')
        return

    for rid, _, slug in plan:
        rest('PATCH', f'opportunities?id=eq.{rid}', {'slug': slug}, prefer='return=minimal')
    print(f'\n{len(plan)} slugs written. Grants now have permanent URLs.')


if __name__ == '__main__':
    main()
