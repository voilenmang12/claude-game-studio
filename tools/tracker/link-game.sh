#!/usr/bin/env bash
# Give a game its project in the task tracker and write it into the game's project.yaml (tracker.project_id,
# tracker.actor). new-game.sh runs it; run it by hand for a game made before, or when the tracker was down.
#   bash tools/tracker/link-game.sh <GameFolder> [--title "<title>"]
# Project id: the folder in kebab case (CG07-StarFarm -> cg07-star-farm); actor: claude-<code>
# (claude-cg07). A project with that id that already exists is reused, and a project.yaml that already names a
# project is left as it is. Changes project.yaml only; the caller commits it.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
NAME="${1:-}"; shift || true
TITLE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --title) TITLE="${2:-}"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done
[ -n "$NAME" ] && [ -f "$ROOT/$NAME/project.yaml" ] || { echo "Usage: bash tools/tracker/link-game.sh <GameFolder> [--title \"<title>\"]" >&2; exit 2; }
case "$NAME" in local/*|template|concepts/*) echo "$NAME is not a game; only games get a tracker project." >&2; exit 2 ;; esac
YAML="$ROOT/$NAME/project.yaml"
grep -q '^tracker:' "$YAML" || { echo "$YAML has no tracker: section (template 3.04 or later)." >&2; exit 2; }

current="$(awk '/^tracker:/{t=1;next} t&&/^[^ ]/{t=0} t&&/^  project_id:/{gsub(/^  project_id: *|"|'"'"'| *#.*$/,""); print; exit}' "$YAML")"
if [ -n "$current" ]; then
  echo "$NAME is already linked to tracker project $current."
  exit 0
fi

ID="$(printf '%s' "$NAME" | sed -E 's/([a-z0-9])([A-Z])/\1-\2/g' | tr '[:upper:]_' '[:lower:]-')"
CODE="$(printf '%s' "$NAME" | sed -E 's/-.*//' | tr '[:upper:]' '[:lower:]')"
ACTOR="claude-$CODE"
if [ -z "$TITLE" ]; then
  product="$(sed -n 's/^  productName: *//p' "$ROOT/$NAME/ProjectSettings/ProjectSettings.asset" 2>/dev/null | head -n1 | tr -d '\r')"
  TITLE="$(printf '%s' "$NAME" | sed -E 's/-.*//') ${product:-$(printf '%s' "$NAME" | sed -E 's/^[^-]*-//; s/([a-z0-9])([A-Z])/\1 \2/g')}"
fi

CLI="${NHANH_CLI:-$HOME/.claude/skills/nhanh-project-tracking/scripts/nhanh.mjs}"
[ -f "$CLI" ] || CLI="$ROOT/project-task-tracking/skills/nhanh-project-tracking/scripts/nhanh.mjs"
[ -f "$CLI" ] || { echo "No tracker CLI: bash studio-setup.sh --tracker, then run this again." >&2; exit 3; }
command -v node >/dev/null 2>&1 || { echo "No Node.js on PATH." >&2; exit 3; }

REPO="$(cd "$ROOT/$NAME" && pwd -W 2>/dev/null || pwd)"
node "$CLI" --actor "$ACTOR" project.create "id=$ID" "title=$TITLE" "repo=$REPO" stage=production >/dev/null \
  || { echo "The tracker did not create the project (is it running? bash studio-setup.sh --tracker-start)." >&2; exit 3; }

# Write the two values in place, keeping the file's line endings.
awk -v BINMODE=3 -v id="$ID" -v actor="$ACTOR" '
  { cr = sub(/\r$/, "") }
  /^tracker:/ { t = 1 }
  t && /^[^ ]/ && !/^tracker:/ { t = 0 }
  t && /^  project_id:/ { $0 = "  project_id: \"" id "\"" }
  t && /^  actor:/ { $0 = "  actor: \"" actor "\"" }
  { printf "%s%s\n", $0, (cr ? "\r" : "") }' "$YAML" > "$YAML.tmp" && mv "$YAML.tmp" "$YAML"

echo "Linked $NAME to tracker project $ID (\"$TITLE\", actor $ACTOR); project.yaml updated, not committed."
