#!/usr/bin/env bash
# Puts a playable test build on Vercel and prints its URL, so it can be opened on a phone or sent to a tester
# (docs/test-deploys.md). Works for a concept's HTML playtest (concepts/<slug>/prototypes/<name>/) and for a
# Unity WebGL build (<Game>/Builds/WebGL/): it copies the folder to a temporary stage, adds a vercel.json with the
# headers a compressed Unity build needs, and deploys the stage. Nothing is written into the source folder.
#
#   bash deploy-test.sh <folder> [--project <name>] [--prod] [--dry-run]
#
#   --project <name>  Vercel project (default: <slug>-playtest for a concept, the game folder in lowercase plus
#                     -test for a game). Created on the first deploy.
#   --prod            production deployment: the stable URL https://<project>.vercel.app, public to anyone with it.
#                     Only when the user asks. Without it the deployment is a preview with its own URL, which
#                     Vercel's default protection shows only to people signed in to the Vercel account (a new
#                     project too: its first deployment does not get the public domain).
#   --dry-run         stage and print the files and headers, deploy nothing.
#
# Sign-in, once per machine: `vercel login` (the user does it), or a token in VERCEL_TOKEN; VERCEL_SCOPE picks a team
# (default: vercelScope in local/studio.config.json).
# The last line is "TEST_URL=<url>", for whoever runs this from a chat (Remote Control) to pass on.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
die() { echo "deploy-test: $*" >&2; exit 1; }
USAGE="usage: bash deploy-test.sh <folder> [--project <name>] [--prod] [--dry-run]"
if [ -z "${VERCEL_SCOPE:-}" ] && [ -f "$ROOT/local/studio.config.json" ]; then
  VERCEL_SCOPE="$(node -e 'const c = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); console.log(c.vercelScope || "")' \
    "$ROOT/local/studio.config.json")" || die "local/studio.config.json is not valid JSON"
fi

SRC="" PROJECT="" PROD=0 DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --project) PROJECT="${2:-}"; [ -n "$PROJECT" ] || die "--project needs a name"; shift 2 ;;
    --prod) PROD=1; shift ;;
    --dry-run) DRY=1; shift ;;
    -h|--help) sed -n '2,18p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) die "unknown option $1. $USAGE" ;;
    *) [ -z "$SRC" ] || die "one folder only. $USAGE"; SRC="$1"; shift ;;
  esac
done
[ -n "$SRC" ] || die "$USAGE"
[ -d "$SRC" ] || die "$SRC is not a folder"
SRC="$(cd "$SRC" && pwd)"
[ -f "$SRC/index.html" ] || die "$SRC has no index.html. Give the playtest folder or the WebGL build folder."

# ---- project name from the folder's place in the workspace
if [ -z "$PROJECT" ]; then
  REL="${SRC#"$ROOT"/}"
  [ "$REL" != "$SRC" ] || die "$SRC is outside the workspace; give --project <name>"
  case "$REL" in
    concepts/*) PROJECT="$(echo "$REL" | cut -d/ -f2)-playtest" ;;
    *) PROJECT="$(echo "$REL" | cut -d/ -f1)-test" ;;
  esac
fi
PROJECT="$(echo "$PROJECT" | tr '[:upper:]_' '[:lower:]-')"
echo "$PROJECT" | grep -Eq '^[a-z0-9][a-z0-9-]{0,62}$' \
  || die "project name \"$PROJECT\": lowercase letters, digits and - (63 at most)"
case "$PROJECT" in *---*) die "project name \"$PROJECT\" must not contain ---" ;; esac

# ---- what kind of build
KIND=html ENC=""
if ls "$SRC"/Build/*.loader.js >/dev/null 2>&1; then
  KIND=unity
  if ls "$SRC"/Build/*.br >/dev/null 2>&1; then ENC=br
  elif ls "$SRC"/Build/*.gz >/dev/null 2>&1; then ENC=gzip
  fi
fi

# Vercel refuses source files over 100 MB on the Hobby plan; a web game build is far below that.
BIG="$(find "$SRC" -type f -size +100M 2>/dev/null | head -3)"
[ -z "$BIG" ] || die "files over 100 MB: $BIG"

# ---- stage
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/deploy-test.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT
cp -R "$SRC/." "$STAGE/"
rm -rf "$STAGE/.vercel" "$STAGE/.git"

header() {
  printf '    { "source": "%s", "headers": [ { "key": "Content-Encoding", "value": "%s" }, { "key": "Content-Type", "value": "%s" } ] },\n' "$1" "$2" "$3"
}
{
  echo '{'
  echo '  "framework": null, "buildCommand": "", "installCommand": "", "outputDirectory": ".",'
  echo '  "headers": ['
  if [ -n "$ENC" ]; then
    X=$([ "$ENC" = br ] && echo br || echo gz)
    header "/Build/(.*)\\\\.wasm\\\\.$X" "$ENC" "application/wasm"
    header "/Build/(.*)\\\\.js\\\\.$X" "$ENC" "application/javascript"
    header "/Build/(.*)\\\\.data\\\\.$X" "$ENC" "application/octet-stream"
    header "/Build/(.*)\\\\.symbols\\\\.json\\\\.$X" "$ENC" "application/octet-stream"
  fi
  echo '    { "source": "/(.*)", "headers": [ { "key": "Cache-Control", "value": "no-cache" } ] }'
  echo '  ]'
  echo '}'
} > "$STAGE/vercel.json"
node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$STAGE/vercel.json" \
  || die "internal error: bad vercel.json"

SIZE="$(du -sh "$STAGE" | cut -f1)"
FILES="$(find "$STAGE" -type f | wc -l | tr -d ' ')"
echo "Source:  $SRC"
echo "Kind:    $KIND${ENC:+ ($ENC compressed)}  ($FILES files, $SIZE)"
if [ "$PROD" = 1 ]; then echo "Target:  project $PROJECT, production (public to anyone with the URL)"
else echo "Target:  project $PROJECT, preview (signed-in Vercel users only)"
fi

if [ "$DRY" = 1 ]; then
  echo "--- vercel.json"; cat "$STAGE/vercel.json"
  echo "Dry run: nothing deployed."
  exit 0
fi

command -v vercel >/dev/null 2>&1 || die "Vercel CLI missing: npm i -g vercel"
# Never let the CLI start its own sign-in: from a chat (Remote Control) nobody would see the code it prints.
vercel whoami ${VERCEL_SCOPE:+--scope "$VERCEL_SCOPE"} </dev/null >/dev/null 2>&1 \
  || die 'not signed in to Vercel. The user runs `vercel login` once on this machine, or sets VERCEL_TOKEN.'

ARGS=(deploy "$STAGE" --yes --project "$PROJECT" --create-if-missing --verify)
[ -z "${VERCEL_SCOPE:-}" ] || ARGS+=(--scope "$VERCEL_SCOPE")
if [ "$PROD" = 1 ]; then
  ARGS+=(--prod)
elif ! vercel project inspect "$PROJECT" ${VERCEL_SCOPE:+--scope "$VERCEL_SCOPE"} </dev/null >/dev/null 2>&1; then
  # A new project's first deployment is always production; keep the public domain off it.
  ARGS+=(--prod --skip-domain)
fi

OUT="$(vercel "${ARGS[@]}" </dev/null)" || die "vercel deploy failed (output above)"
URL="$(printf '%s' "$OUT" | node -e '
  let s = "";
  process.stdin.on("data", c => s += c).on("end", () => {
    const d = JSON.parse(s.slice(s.indexOf("{"))).deployment || {};
    const u = (process.argv[1] === "1" && d.productionUrl) || d.url || "";
    console.log(u && !u.startsWith("http") ? "https://" + u : u);
  });' "$PROD")" || die "could not read the deploy result: $OUT"
[ -n "$URL" ] || die "no URL in the deploy result: $OUT"
[ "$PROD" = 1 ] || echo "Preview: only people signed in to this Vercel account can open it (a phone too, once signed in)."
echo "TEST_URL=$URL"
