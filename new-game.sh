#!/usr/bin/env bash
# Make a game repo from a Unity project, template/ and your local/ layer (docs/game-lifecycle.md, stage 6).
#   bash new-game.sh <GameFolder> --concept <slug>   the normal road: the concept's name must be locked
#   bash new-game.sh <GameFolder> --no-concept       only for an existing game brought into the workspace
# The Unity project: with local/project/ (a Unity project every game starts from) the script copies it to
# <GameFolder>; without it, create <GameFolder> in the workspace root first with Unity Hub (Unity 6000.6.7f1,
# "Universal 2D"), named exactly as the Folder line of the concept's design/name-lock.md.
# Then, later wins: template/ (files the project already has are kept and listed as "keep"), local/seed/,
# local/overlay/ (docs/local-layer.md). Run in Git Bash (Windows) or any bash.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="$ROOT/template"
LOCAL="$ROOT/local"
fail() { echo "$1" >&2; exit 1; }

NAME="${1:-}"; shift || true
CONCEPT=""; NO_CONCEPT=0
while [ $# -gt 0 ]; do
  case "$1" in
    --concept) CONCEPT="${2:-}"; shift 2 ;;
    --no-concept) NO_CONCEPT=1; shift ;;
    *) fail "Unknown option: $1" ;;
  esac
done
[ -n "$NAME" ] || fail "Usage: bash new-game.sh <GameFolder> --concept <slug> | --no-concept"
[ -n "$CONCEPT" ] || [ $NO_CONCEPT -eq 1 ] || fail "Name the concept: --concept <slug> (or --no-concept for an existing game)."
DST="$ROOT/$NAME"

printf '%s' "$NAME" | grep -Eq '^[A-Za-z0-9_-]+$' || fail "Folder names use letters, digits, '-' and '_' only (no spaces): $NAME"
case "$NAME" in template|tools|licenses|docs|concepts|concept-kit|local|local.example) fail "Reserved folder name: $NAME" ;; esac
[ -f "$SRC/TEMPLATE_VERSION" ] || fail "Template not found: $SRC"

BASE=0
if [ ! -d "$DST/ProjectSettings" ]; then
  [ -d "$LOCAL/project/ProjectSettings" ] \
    || fail "No Unity project at $DST. Create it with Unity Hub first (location: $ROOT, name: $NAME), or put a base project in local/project/."
  [ ! -e "$DST" ] || fail "$DST exists but is not a Unity project; move it away or make it one."
  BASE=1
fi

CONCEPT_NOTE=""; PRODUCT=""
if [ -n "$CONCEPT" ]; then
  C="$ROOT/concepts/$CONCEPT"
  [ -d "$C" ] || fail "No concept at $C"
  LOCK="$C/design/name-lock.md"
  grep -q '^- Status: locked' "$LOCK" 2>/dev/null || fail "The name of $CONCEPT is not locked (design/name-lock.md, stage 5)."
  FOLDER="$(sed -n 's/^- Folder: `\([^`]*\)`.*/\1/p' "$LOCK" | head -n1)"
  [ "$FOLDER" = "$NAME" ] || fail "design/name-lock.md locks the folder as '$FOLDER', not '$NAME'."
  PRODUCT="$(sed -n 's/^- Product name: *//p' "$LOCK" | head -n1 | sed 's/ *(.*$//; s/`//g')"
  if [ -d "$C/.git" ]; then
    [ -z "$(git -C "$C" status --porcelain)" ] || fail "The concept has uncommitted changes; commit them in $C first."
    CONCEPT_NOTE="Concept: concepts/$CONCEPT at $(git -C "$C" rev-parse --short HEAD)"
  else
    CONCEPT_NOTE="Concept: concepts/$CONCEPT (no git history)"
  fi
fi

VERSION="$(tr -d '[:space:]' < "$SRC/TEMPLATE_VERSION")"

# ---- 1. the Unity project from local/project/ (generated and per-user folders left out)
if [ $BASE -eq 1 ]; then
  mkdir -p "$DST"
  tar -C "$LOCAL/project" \
    --exclude='./Library' --exclude='./Temp' --exclude='./Logs' --exclude='./obj' --exclude='./UserSettings' \
    --exclude='./Builds' --exclude='./.git' --exclude='./.idea' --exclude='./.vs' --exclude='*.csproj' \
    --exclude='*.sln' \
    -cf - . | tar -C "$DST" -xf -
  # A new game gets its own product GUID, so it never shares saves or analytics with the base project.
  PS="$DST/ProjectSettings/ProjectSettings.asset"
  if [ -f "$PS" ]; then
    GUID="$(od -An -tx1 -N16 /dev/urandom | tr -d ' \n')"
    awk -v guid="$GUID" '/^  productGUID: / { print "  productGUID: " guid; next } { print }' "$PS" > "$PS.tmp" \
      && mv "$PS.tmp" "$PS"
  fi
fi

# ---- 2. template/: copy what the project does not have
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

# ---- 3. local/seed/ then local/overlay/: your files win over the template's
layered=0
for layer in seed overlay; do
  [ -d "$LOCAL/$layer" ] || continue
  while IFS= read -r -d '' file; do
    rel="${file#"$LOCAL/$layer"/}"
    [ "$rel" = "README.md" ] && continue
    mkdir -p "$(dirname "$DST/$rel")"
    cp "$file" "$DST/$rel"
    echo "$layer $rel"
    layered=$((layered + 1))
  done < <(find "$LOCAL/$layer" -type f -print0)
done

# ---- 4. the product name from the lock
PS="$DST/ProjectSettings/ProjectSettings.asset"
if [ -n "$PRODUCT" ] && [ -f "$PS" ]; then
  awk -v product="$PRODUCT" '/^  productName: / { print "  productName: " product; next } { print }' "$PS" > "$PS.tmp" \
    && mv "$PS.tmp" "$PS"
fi

# ---- 5. the concept's design and playtest (committed files only, so no dist/ or node_modules/);
# the template's design/CLAUDE.md stays.
from_concept=0
if [ -n "$CONCEPT" ]; then
  if [ -d "$C/.git" ]; then
    list_concept() { git -C "$C" ls-files -z -- design prototypes references; }
  else
    list_concept() { (cd "$C" && find design prototypes references -type f -print0 2>/dev/null) || true; }
  fi
  while IFS= read -r -d '' rel; do
    [ "$rel" = "design/CLAUDE.md" ] && continue
    mkdir -p "$(dirname "$DST/$rel")"
    cp "$C/$rel" "$DST/$rel"
    from_concept=$((from_concept + 1))
  done < <(list_concept)
fi

cd "$DST"
if [ -d .git ]; then
  COMMITTED="existing git repo: review and commit the new files yourself"
else
  git init -q -b main
  if git config user.email >/dev/null 2>&1; then
    git -c core.safecrlf=false add -A
    if [ -n "$CONCEPT_NOTE" ]; then
      git commit -qm "chore: start $NAME from template v$VERSION" -m "$CONCEPT_NOTE"
    else
      git commit -qm "chore: start $NAME from template v$VERSION"
    fi
    COMMITTED="git repo created with a first commit (no remote yet)"
  else
    COMMITTED="git repo created, not committed (git has no user.email)"
  fi
fi

FROM="template v$VERSION"
[ $BASE -eq 1 ] && FROM="local/project/ + $FROM"
cat <<EOF
Made $DST from $FROM: $copied template files copied, $kept kept, $layered from local/, $from_concept from the concept.
$COMMITTED.

Next (docs/game-lifecycle.md):
  1. Open the project in Unity and let it import (the Editor scripts need com.unity.nuget.newtonsoft-json).
  2. Player Settings from design/name-lock.md (company, application identifier, save key; the product name is set
     when the concept has one), then commit: chore: set product identity
  3. GitHub repo, private: bash publish-game.sh $NAME
  4. Start Claude Code in the game folder: claude  ->  /start
  5. Set the target platforms and the build command (project.yaml, .claude/docs/technical-preferences.md), unless
     local/seed/ or local/overlay/ already does.
EOF
