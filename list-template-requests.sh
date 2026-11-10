#!/usr/bin/env bash
# List the template request tickets of every game (design/template-requests/TR-*.md) with the status the
# game's file shows and the status in template/TEMPLATE_CHANGELOG.md ("Template requests" table).
#   bash list-template-requests.sh          every ticket
#   bash list-template-requests.sh --open   only tickets not yet released or rejected by the template
# Prints observations only; the user decides each ticket (template/design/template-requests/README.md).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG="$ROOT/template/TEMPLATE_CHANGELOG.md"
OPEN=0
[ "${1:-}" = "--open" ] && OPEN=1

shopt -s nullglob
rows=0
printf '%-13s %-20s %-16s %-24s %s\n' ID GAME "GAME STATUS" "TEMPLATE STATUS" TITLE
for f in "$ROOT"/*/design/template-requests/TR-*.md; do
  game="$(basename "$(dirname "$(dirname "$(dirname "$f")")")")"
  [ "$game" = "template" ] && continue
  id="$(basename "$f" | grep -Eo '^TR-[A-Za-z0-9]+-[0-9]{3}' || true)"
  [ -n "$id" ] || { echo "bad file name (want TR-<code>-<NNN>-<slug>.md): $f" >&2; continue; }
  title="$(sed -n '1s/^# *TR-[^:]*: *//p' "$f")"
  gstatus="$(sed -n 's/^- Status: *//p' "$f" | head -n1)"
  row="$(grep -E "^\| *$id *\|" "$LOG" || true)"
  if [ -n "$row" ]; then
    tstatus="$(printf '%s' "$row" | awk -F'|' '{ s = $5; gsub(/^ +| +$/, "", s); print s }')"
  else
    tstatus="not in table"
  fi
  if [ $OPEN -eq 1 ]; then
    case "$tstatus" in released*|rejected) continue ;; esac
  fi
  printf '%-13s %-20s %-16s %-24s %s\n' "$id" "$game" "${gstatus:-?}" "$tstatus" "$title"
  rows=$((rows + 1))
done
echo "$rows ticket(s)."
