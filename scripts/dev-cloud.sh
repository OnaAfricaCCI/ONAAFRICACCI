#!/usr/bin/env bash
#
# Run the app against a DISPOSABLE CLOUD Supabase test project (no Docker), for
# the auth + UI click-through. Reads the test project's keys from `.env.test`
# (git-ignored) and overrides the production values in the shell, so your real
# .env.local is left untouched.
#
#   npm run dev:cloud
#
# Auth magic-link emails are sent by Supabase to a REAL inbox (use your own
# email). In the test project, add http://localhost:3000/** to Authentication →
# URL Configuration → Redirect URLs first. See the runbook.
#
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env.test ]; then
  set -a; . ./.env.test; set +a
else
  echo "✗ No .env.test found (see the runbook)." >&2
  exit 1
fi

: "${SUPABASE_URL:?set SUPABASE_URL in .env.test}"
case "$SUPABASE_URL" in
  *fperytyukppkkjjfkwgl*)
    echo "✗ Refusing to run against the real onafunds project. Use a TEST project." >&2
    exit 1;;
esac

export NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:?set SUPABASE_ANON_KEY in .env.test}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?set SUPABASE_SERVICE_ROLE_KEY in .env.test}"
export NEXT_PUBLIC_SITE_URL="http://localhost:3000"

echo "▶ App → cloud TEST project: ${NEXT_PUBLIC_SUPABASE_URL}"
echo "▶ Open http://localhost:3000 — magic-link emails go to your real inbox."
echo
npm run dev
