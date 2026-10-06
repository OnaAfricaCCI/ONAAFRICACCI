#!/usr/bin/env bash
#
# Verify the grant-seeker DB + RLS end to end against a LOCAL Supabase stack.
# Starts Supabase, applies the migrations, then runs the owner-isolation /
# unauthenticated-denial / duplicate-save / draft-resume / delete-keeps-saved
# integration tests against it. Touches nothing hosted.
#
#   npm run verify:local
#
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "✗ Docker is required (install Docker Desktop or Colima, then retry)." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "✗ The Docker daemon isn't running. Start Docker Desktop / 'colima start', then retry." >&2
  exit 1
fi

echo "▶ Starting the local Supabase stack (first run pulls images, ~a minute)…"
npx supabase start >/dev/null

echo "▶ Resetting the local database to apply all migrations…"
npx supabase db reset >/dev/null

echo "▶ Reading the local keys…"
# `supabase status -o env` prints API_URL / ANON_KEY / SERVICE_ROLE_KEY / INBUCKET_URL …
eval "$(npx supabase status -o env 2>/dev/null)"

export SUPABASE_URL="${API_URL:-http://127.0.0.1:54321}"
export SUPABASE_ANON_KEY="${ANON_KEY:?could not read local ANON_KEY}"
export SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:?could not read local SERVICE_ROLE_KEY}"
export RUN_DB_TESTS=1

echo "▶ Running the DB + RLS integration tests…"
echo
npm run test:db

echo
echo "✓ Done. The local stack is still running:"
echo "    Studio:   ${STUDIO_URL:-http://localhost:54323}"
echo "    Inbucket: ${INBUCKET_URL:-http://localhost:54324}   (auth magic-link emails arrive here)"
echo "    API:      ${SUPABASE_URL}"
echo
echo "  To verify auth + the UI, run:  npm run dev:local   (see docs/local-verification-runbook.md)"
echo "  To stop everything:            npx supabase stop"
