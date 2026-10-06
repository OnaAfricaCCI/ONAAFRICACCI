#!/usr/bin/env bash
#
# Verify the grant-seeker DB + RLS against a DISPOSABLE CLOUD Supabase project
# (no Docker). Reads the test project's keys from a local, git-ignored
# `.env.test`, then runs the integration tests against it.
#
#   npm run verify:cloud
#
# .env.test must contain (from the test project → Settings → API):
#   SUPABASE_URL=https://<ref>.supabase.co
#   SUPABASE_ANON_KEY=...
#   SUPABASE_SERVICE_ROLE_KEY=...
#
# NEVER point this at the real onafunds project — the tests create and delete
# auth users and rows.
#
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env.test ]; then
  set -a; . ./.env.test; set +a
else
  echo "✗ No .env.test found. Create it with the TEST project's SUPABASE_URL," >&2
  echo "  SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY. See the runbook." >&2
  exit 1
fi

: "${SUPABASE_URL:?set SUPABASE_URL in .env.test}"
: "${SUPABASE_ANON_KEY:?set SUPABASE_ANON_KEY in .env.test}"
: "${SUPABASE_SERVICE_ROLE_KEY:?set SUPABASE_SERVICE_ROLE_KEY in .env.test}"

case "$SUPABASE_URL" in
  *fperytyukppkkjjfkwgl*)
    echo "✗ Refusing to run: SUPABASE_URL points at the real onafunds project." >&2
    echo "  Use a separate, disposable TEST project." >&2
    exit 1;;
esac

export RUN_DB_TESTS=1
echo "▶ Running DB + RLS integration tests against ${SUPABASE_URL} …"
echo
npm run test:db
