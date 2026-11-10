#!/usr/bin/env bash
# Copy the template's shared files into an existing game. Commits nothing.
#   bash sync-template.sh <GameFolder> --dry-run   list what would change
#   bash sync-template.sh <GameFolder>             copy
# Shared files belong to the template: a game never edits them for its own sake (it files a template request).
# Game-owned files (CLAUDE.md, project.yaml, registries, profiles) are never overwritten; the changelog's
# Port steps say what to merge into them by hand.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="$ROOT/template"
NAME="${1:-}"
DRY=0
[ "${2:-}" = "--dry-run" ] && DRY=1
[ -n "$NAME" ] && [ -f "$ROOT/$NAME/project.yaml" ] || { echo "Usage: bash sync-template.sh <GameFolder> [--dry-run]" >&2; exit 2; }
DST="$ROOT/$NAME"

# Template-owned paths (folders are compared file by file).
SHARED=(
  .claude/agents .claude/skills .claude/hooks .claude/rules .claude/scripts .claude/statusline.sh
  .claude/docs .claude/genres .claude/engines
  studio-tests
  docs/engine-reference docs/WORKFLOW-GUIDE.md docs/CLAUDE.md docs/skill-flow-diagrams.md docs/migration-guide-v1.1.md
  docs/COLLABORATIVE-DESIGN-PRINCIPLE.md docs/CCGS-README.md docs/CCGS-UPGRADING.md docs/CCGS-CHANGELOG.md
  docs/CCGS-VERSION.txt
  Assets/Editor/Art
  Assets/Integration/PixelArt.md Assets/Integration/PixelArt.md.meta
  Assets/Integration/UIPrompting.md Assets/Integration/UIPrompting.md.meta
  Assets/Integration/UIPopupStandard.md Assets/Integration/UIPopupStandard.md.meta
  AgentScripts/ValidatePixelArtImport.cs
  Tools
  ArtSource/README.md
  design/template-requests/README.md
  .gitignore .mcp.json .worktreeinclude
)
# Inside the shared folders, files a game writes itself.
EXCEPT=(.claude/docs/technical-preferences.md)
# Game-owned files: created once if missing, then left alone.
GAME_FILES=(design/art/pixel-asset-project.json design/art/ui-prompt-profile.md design/asset-ledger.csv)

# Never overwrite local edits: stop if a file about to be replaced has uncommitted changes.
dirty="$(git -C "$DST" status --porcelain --untracked-files=no -- "${SHARED[@]}")"
if [ -n "$dirty" ]; then
  echo "Uncommitted changes in $NAME; commit or discard them first:" >&2
  echo "$dirty" >&2
  exit 1
fi

changes=()   # "update <path>" or "create <path>", relative to the template
add_created() {   # every file under template path $1
  if [ -d "$SRC/$1" ]; then
    while IFS= read -r -d '' f; do changes+=("create ${f#"$SRC"/}"); done < <(find "$SRC/$1" -type f -print0)
  else
    changes+=("create $1")
  fi
}

for p in "${SHARED[@]}"; do
  if [ -d "$SRC/$p" ]; then
    if [ ! -d "$DST/$p" ]; then add_created "$p"; continue; fi
    # One diff per folder; spawning a compare per file is slow in Git Bash.
    while IFS= read -r line; do
      case "$line" in
        "Files $SRC/"*" differ")
          f="${line#"Files $SRC/"}"; f="${f%% and "$DST"/*}"; changes+=("update $f") ;;
        "Only in $SRC/"*)
          d="${line#"Only in $SRC/"}"; add_created "${d%%: *}/${d#*: }" ;;
        "Only in $DST/"*)
          d="${line#"Only in $DST/"}"; f="${d%%: *}/${d#*: }"
          case "$f" in *.meta) ;; *) echo "only in game  $f" ;; esac ;;
      esac
    done < <(diff -rq "$SRC/$p" "$DST/$p" || true)
  elif [ ! -f "$DST/$p" ]; then
    changes+=("create $p")
  elif ! cmp -s "$SRC/$p" "$DST/$p"; then
    changes+=("update $p")
  fi
done
for f in "${GAME_FILES[@]}"; do
  [ -f "$DST/$f" ] || changes+=("create $f")
done

count=0
for c in ${changes[@]+"${changes[@]}"}; do
  f="${c#* }"
  skip=0
  for e in "${EXCEPT[@]}"; do [ "$f" = "$e" ] && skip=1; done
  [ $skip -eq 1 ] && continue
  printf '%-7s %s\n' "${c%% *}" "$f"
  count=$((count + 1))
  if [ $DRY -eq 0 ]; then
    mkdir -p "$(dirname "$DST/$f")"
    cp "$SRC/$f" "$DST/$f"
  fi
done

if [ $DRY -eq 1 ]; then echo "$count file(s) would change (dry run)."; else echo "$count file(s) changed. Review with git diff, then finish the Port steps."; fi
