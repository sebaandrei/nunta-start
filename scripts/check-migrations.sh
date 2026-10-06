#!/usr/bin/env bash
# PR-time guard for supabase/migrations. No secrets, no cloud.
# Applied migrations are immutable: only ADDED files are allowed, and added
# versions must be newer than the newest one on the base branch.
# Usage: scripts/check-migrations.sh [base-ref]   (default: origin/main)
set -euo pipefail

base="${1:-origin/main}"
dir=supabase/migrations
fail=0
added=""

max=$(git ls-tree --name-only "$base" "$dir/" | sed 's|.*/||' | cut -c1-14 | sort | tail -n 1)

while IFS=$'\t' read -r status path rest; do
  [ -n "$status" ] || continue
  if [ "$status" = "A" ]; then
    added+="$path"$'\n'
    prefix=$(basename "$path" | cut -c1-14)
    if [ -n "$max" ] && [[ "$prefix" < "$max" || "$prefix" == "$max" ]]; then
      echo "::error file=$path::Out-of-order migration: version $prefix is not newer than $max already on $base. Rename it with a newer timestamp."
      fail=1
    fi
  else
    echo "::error file=${rest:-$path}::Applied migrations are immutable: add a new migration instead (change $status on $path)."
    fail=1
  fi
done < <(git diff --name-status --find-renames "$base...HEAD" -- "$dir")

if [ -z "$added" ]; then
  echo "No new migrations in this PR."
else
  echo "New migrations in this PR:"
  printf '%s' "$added"
  echo "Reminder: on merge they are applied to STAGING automatically; production needs manual approval."
fi
exit "$fail"
