#!/usr/bin/env bash
# Export every ArtSource/**/*.pxo to Assets/Art/<same path>.png (+ .json) with the Pixelorama CLI.
# Run from the project root in Git Bash:
#   bash Tools/export-pixelorama.sh            # only files whose .pxo is newer than the export
#   bash Tools/export-pixelorama.sh --force    # re-export everything
#   bash Tools/export-pixelorama.sh ArtSource/Characters/hero.pxo   # one file
# Override the executable with PIXELORAMA_EXE if Pixelorama is installed elsewhere.
# Layout: keep the Pixelorama default spritesheet layout (Columns, 1 line) so Unity can slice it.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$ROOT/ArtSource"
DST_DIR="$ROOT/Assets/Art"
DEFAULT_EXE="${APPDATA:-}/Orama Interactive/Pixelorama/Pixelorama.exe"
EXE="${PIXELORAMA_EXE:-$DEFAULT_EXE}"

FORCE=0
FILES=()
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    *) FILES+=("$arg") ;;
  esac
done

[ -f "$EXE" ] || { echo "Pixelorama not found: $EXE (set PIXELORAMA_EXE)" >&2; exit 1; }
command -v cygpath >/dev/null || { echo "cygpath missing: run this in Git Bash on Windows." >&2; exit 1; }

if [ ${#FILES[@]} -eq 0 ]; then
  while IFS= read -r -d '' f; do FILES+=("$f"); done < <(find "$SRC_DIR" -name '*.pxo' -print0 | sort -z)
fi
[ ${#FILES[@]} -gt 0 ] || { echo "No .pxo files under ArtSource/."; exit 0; }

exported=0; skipped=0; failed=0
for f in "${FILES[@]}"; do
  abs="$(cd "$(dirname "$f")" && pwd)/$(basename "$f")"
  case "$abs" in
    "$SRC_DIR"/*) rel="${abs#"$SRC_DIR"/}" ;;
    *) echo "SKIP (not under ArtSource/): $f" >&2; failed=$((failed+1)); continue ;;
  esac
  base="${rel%.pxo}"
  out="$DST_DIR/$base.png"
  json="$DST_DIR/$base.json"

  if [ $FORCE -eq 0 ] && [ -f "$out" ] && [ -f "$json" ] && [ "$out" -nt "$abs" ]; then
    skipped=$((skipped+1)); continue
  fi

  mkdir -p "$(dirname "$out")"
  # Pixelorama asks before overwriting, which hangs in headless mode: remove the old export first.
  rm -f "$out" "$json"
  "$EXE" --headless --quit -- "$(cygpath -m "$abs")" --export --spritesheet --output "$(cygpath -m "$out")" --json >/dev/null 2>&1 || true

  if [ -f "$out" ] && [ -f "$json" ]; then
    echo "OK    $rel -> Assets/Art/$base.png"
    exported=$((exported+1))
  else
    missing=""
    [ -f "$out" ] || missing="png"
    [ -f "$json" ] || missing="${missing:+$missing + }json"
    echo "FAIL  $rel (missing $missing)" >&2
    failed=$((failed+1))
  fi
done

echo "Exported $exported, up to date $skipped, failed $failed."
[ $failed -eq 0 ] || exit 1
