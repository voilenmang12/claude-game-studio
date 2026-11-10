#!/usr/bin/env bash
# Create the game's own GitHub repo, add it as origin and push main (docs/game-lifecycle.md, stage 7).
#   bash publish-game.sh <GameFolder>                  repo name from design/name-lock.md, private
#   bash publish-game.sh <GameFolder> --repo owner/name
# Private by default. A public game repo is the user's decision, and is refused while Assets/Plugins exists
# (paid Asset Store plugins must not be published).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
NAME="${1:-}"; shift || true
REPO=""; VIS="--private"
while [ $# -gt 0 ]; do
  case "$1" in
    --repo) REPO="${2:-}"; shift 2 ;;
    --public) VIS="--public"; shift ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done
DST="$ROOT/$NAME"
[ -n "$NAME" ] && [ -d "$DST/.git" ] || { echo "Usage: bash publish-game.sh <GameFolder> [--repo owner/name] [--public]" >&2; exit 2; }

fail() { echo "$1" >&2; exit 1; }
LOCK="$DST/design/name-lock.md"
if [ -f "$LOCK" ]; then
  grep -q '^- Status: locked' "$LOCK" || fail "design/name-lock.md is not locked; lock the name first."
  [ -n "$REPO" ] || REPO="$(sed -n 's/^- Repo: `\([^`]*\)`.*/\1/p' "$LOCK" | head -n1)"
fi
[ -n "$REPO" ] || fail "No repo name: pass --repo owner/name or fill the Repo line in design/name-lock.md."
printf '%s' "$REPO" | grep -Eq '^[A-Za-z0-9-]+/[A-Za-z0-9._-]+$' || fail "Not a repo name (owner/name): $REPO"

git -C "$DST" rev-parse -q --verify HEAD >/dev/null || fail "$NAME has no commit yet."
[ -z "$(git -C "$DST" status --porcelain)" ] || fail "$NAME has uncommitted changes; commit them first."
[ -z "$(git -C "$DST" remote)" ] || fail "$NAME already has a remote: $(git -C "$DST" remote -v | head -n1)"
if [ "$VIS" = "--public" ] && [ -d "$DST/Assets/Plugins" ]; then
  fail "Refusing --public: $NAME has Assets/Plugins (paid plugins must stay private). Make it public yourself if its licenses allow."
fi
command -v gh >/dev/null || fail "GitHub CLI (gh) not found."
gh auth status >/dev/null 2>&1 || fail "gh is not signed in: run gh auth login."
if gh repo view "$REPO" >/dev/null 2>&1; then fail "Repo already exists: $REPO"; fi

gh repo create "$REPO" "$VIS" --source "$DST" --remote origin --push
echo "Created $REPO (${VIS#--}) and pushed main. Check: git -C $NAME remote -v"
