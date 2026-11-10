#!/usr/bin/env bash
# Apply template/ to a Unity project in the workspace and make it a game repo.
#   bash new-game.sh <GameFolder>
# Create <GameFolder> in the workspace root first with Unity Hub (Unity 6000.6.7f1, "Universal 2D"), or use an
# existing Unity project there. Files the project already has are kept and listed as "keep"; merge those by hand.
# Run in Git Bash (Windows) or any bash.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="$ROOT/template"

if [ $# -lt 1 ]; then
  echo "Usage: bash new-game.sh <GameFolder>" >&2
  exit 2
fi
NAME="$1"
DST="$ROOT/$NAME"

if ! printf '%s' "$NAME" | grep -Eq '^[A-Za-z0-9_-]+$'; then
  echo "Folder names use letters, digits, '-' and '_' only (no spaces): $NAME" >&2
  exit 2
fi
case "$NAME" in template|tools|licenses) echo "Reserved folder name: $NAME" >&2; exit 2 ;; esac
[ -f "$SRC/TEMPLATE_VERSION" ] || { echo "Template not found: $SRC" >&2; exit 1; }
[ -d "$DST/ProjectSettings" ] || {
  echo "No Unity project at $DST. Create it with Unity Hub first (location: $ROOT, name: $NAME)." >&2
  exit 1
}

VERSION="$(tr -d '[:space:]' < "$SRC/TEMPLATE_VERSION")"

copied=0; kept=0
while IFS= read -r -d '' file; do
  rel="${file#"$SRC"/}"
  if [ -e "$DST/$rel" ]; then
    echo "keep    $rel"
    kept=$((kept + 1))
  else
    mkdir -p "$(dirname "$DST/$rel")"
    cp "$file" "$DST/$rel"
    copied=$((copied + 1))
  fi
done < <(find "$SRC" -type f -print0)

cd "$DST"
if [ -d .git ]; then
  COMMITTED="existing git repo: review and commit the new files yourself"
else
  git init -q -b main
  if git config user.email >/dev/null 2>&1; then
    git add -A
    git commit -qm "chore: start $NAME from template v$VERSION"
    COMMITTED="git repo created with a first commit"
  else
    COMMITTED="git repo created, not committed (git has no user.email)"
  fi
fi

cat <<EOF
Applied template v$VERSION to $DST: $copied files copied, $kept kept.
$COMMITTED.

Next:
  1. Open the project in Unity and let it import (the Editor scripts need com.unity.nuget.newtonsoft-json).
  2. Start Claude Code in the game folder: claude
     /start  ->  /brainstorm  ->  /art-bible  ->  /create-epics  ->  /create-stories  ->  /dev-story
  3. Set the target platforms and the build command (project.yaml, .claude/docs/technical-preferences.md).
  4. Art: fill design/art/pixel-asset-project.json and design/art/ui-prompt-profile.md before the first asset job
     (Assets/Integration/PixelArt.md, Assets/Integration/UIPrompting.md).
EOF
