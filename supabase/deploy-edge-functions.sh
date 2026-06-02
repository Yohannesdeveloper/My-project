#!/usr/bin/env bash
set -euo pipefail

if [ -z "${SUPABASE_PROJECT_REF:-}" ]; then
  echo "Missing SUPABASE_PROJECT_REF env var (e.g. abcdefghijklmn)"
  exit 1
fi

# Uses the Supabase CLI config in the current directory.
# You can create one with:
#   npx supabase login
#   npx supabase init
#
# Then deploy the committed edge function(s):
npx supabase functions deploy overdue-tasks --project-ref "$SUPABASE_PROJECT_REF"

