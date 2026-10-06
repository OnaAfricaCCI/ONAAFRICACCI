#!/usr/bin/env bash
#
# Run the Next.js app against the LOCAL Supabase stack, so you can click through
# sign-in, save, onboarding, recommendations and deletion with real auth and a
# real database — without touching the hosted project or the production keys in
# .env.local (these shell exports take precedence over the .env file).
#
#   npm run dev:local
#
# Auth magic-link emails land in Inbucket (printed below), not a real inbox.
# The profile-ready confirmation email uses Resend; it is left UNCONFIGURED here
# (so it records 'failed: email-not-configured' and the profile still saves). To
# exercise a real send, export RESEND_API_KEY and PROFILE_FROM before running,
# and use a test recipient — never a real user.
#
set -euo pipefail
cd "$(dirname "$0")/.."

if ! docker info >/dev/null 2>&1; then
  echo "✗ Start Docker (Docker Desktop / 'colima start') first." >&2
  exit 1
fi

echo "▶ Ensuring the local Supabase stack is up…"
npx supabase start >/dev/null 2>&1 || true
eval "$(npx supabase status -o env 2>/dev/null)"

export NEXT_PUBLIC_SUPABASE_URL="${API_URL}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${ANON_KEY}"
export SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY}"
export NEXT_PUBLIC_SITE_URL="http://localhost:3000"

echo "▶ App → local Supabase: ${NEXT_PUBLIC_SUPABASE_URL}"
echo "▶ Magic-link + confirmation emails: ${INBUCKET_URL:-http://localhost:54324}"
echo "▶ Open the app at http://localhost:3000"
echo
npm run dev
