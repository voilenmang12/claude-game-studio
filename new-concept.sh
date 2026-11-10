#!/usr/bin/env bash
# Start a concept: a local folder for the brief, GDD, HTML playtest and name lock (docs/game-lifecycle.md, 1 to 5).
#   bash new-concept.sh <slug>          e.g. bash new-concept.sh market-rumble
# Makes concepts/<slug>/ with the CCGS layer of template/ (no engine set, so /prototype builds a browser game first)
# and the files in concept-kit/, then a local git repo with no remote.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="$ROOT/template"
KIT="$ROOT/concept-kit"

[ $# -eq 1 ] || { echo "Usage: bash new-concept.sh <slug>" >&2; exit 2; }
SLUG="$1"
printf '%s' "$SLUG" | grep -Eq '^[a-z0-9]+(-[a-z0-9]+)*$' || { echo "The slug is a working title in kebab-case: lowercase letters, digits and '-': $SLUG" >&2; exit 2; }
DST="$ROOT/concepts/$SLUG"
[ ! -e "$DST" ] || { echo "Already exists: $DST" >&2; exit 1; }
[ -f "$SRC/TEMPLATE_VERSION" ] && [ -d "$KIT" ] || { echo "Workspace incomplete: need template/ and concept-kit/" >&2; exit 1; }
VERSION="$(tr -d '[:space:]' < "$SRC/TEMPLATE_VERSION")"

mkdir -p "$DST"
# The CCGS layer only: no Unity files, no Unity engine settings.
tar -C "$SRC" -cf - .claude docs design/CLAUDE.md design/registry production .gitattributes .worktreeinclude \
  | tar -C "$DST" -xf -
# concept-kit/ wins: CLAUDE.md, project.yaml and technical-preferences.md with no engine, .gitignore, the documents.
tar -C "$KIT" -cf - . | tar -C "$DST" -xf -

[ -f "$ROOT/concepts/BACKLOG.md" ] || printf '# Idea backlog\n\nOne entry per idea: pitch, core decision, why try it, main risk, status (new, exploring, parked, killed) and date.\n' > "$ROOT/concepts/BACKLOG.md"

cd "$DST"
git init -q -b main
if git config user.email >/dev/null 2>&1; then
  git -c core.safecrlf=false add -A
  git commit -qm "chore: start concept $SLUG from template v$VERSION"
  COMMITTED="local git repo with a first commit (no remote)"
else
  COMMITTED="local git repo, not committed (git has no user.email)"
fi

cat <<EOF
Made $DST: $COMMITTED.

Next (docs/game-lifecycle.md):
  1. cd concepts/$SLUG && claude      then: make me a game <your idea>   (or /prototype)
  2. GDD draft: design/production-gdd.md sections 1-5
  3. HTML playtest: prototypes/$SLUG/ ; log each session in design/playtest-record.md ; verdict PROCEED/PIVOT/KILL
  4. GDD v1.0, then the name lock: design/name-lock.md (Status: locked)
  5. Unity Hub project in the workspace root, then: bash new-game.sh <Code>-<Name> --concept $SLUG
EOF
