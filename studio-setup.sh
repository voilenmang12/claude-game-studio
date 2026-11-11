#!/usr/bin/env bash
# Set up this machine for the studio in one place: tools, sign-ins and Codex Asset Studio (docs/setup.md).
# The /studio-setup skill runs it step by step; you can run it yourself too.
#   bash studio-setup.sh                       check everything and print what is left to do (changes nothing)
#   bash studio-setup.sh --choose <id>...      save the optional parts you use ("setup" in local/studio.config.json)
#   bash studio-setup.sh --install <id>        install one tool (winget, npm or the Unity CLI)
#   bash studio-setup.sh --login <id>          sign in to one service; it asks you, so run it in your own terminal
#   bash studio-setup.sh --asset-studio [dir]  clone Codex Asset Studio (default: next to this workspace), install its
#                                              Python packages, run its doctor, write assetStudioDir
#   bash studio-setup.sh --autostart           start the Asset Studio worker at Windows sign-in, and now
#   bash studio-setup.sh --smoke               Asset Studio smoke test: one real image job (uses image quota)
# Required: git node python unity. Optional: github vercel codex agy assetstudio pixelorama.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
CONFIG="local/studio.config.json"
CAS_URL="https://github.com/voilenmang12/codex-asset-studio.git"
REQUIRED=(git node python unity)
OPTIONAL=(github vercel codex agy assetstudio pixelorama)
UNITY_PIN="$(grep -o -m1 '6000\.[0-9]*\.[0-9]*f[0-9]*' template/CLAUDE.md || true)"
WINDOWS=0; case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) WINDOWS=1 ;; esac

die() { echo "ERROR: $*" >&2; exit 1; }
cfg() {   # cfg <key>: a value from local/studio.config.json, empty when missing
  [ -f "$CONFIG" ] || return 0
  node -e 'const c=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const v=c[process.argv[2]];process.stdout.write(v==null?"":Array.isArray(v)?v.join(" "):String(v))' "$CONFIG" "$1"
}
cfg_set() {   # cfg_set <key> <json value>
  [ -f "$CONFIG" ] || die "no $CONFIG: run bash studio-doctor.sh --init first"
  node -e 'const fs=require("fs");const p=process.argv[1];const c=JSON.parse(fs.readFileSync(p,"utf8"));c[process.argv[2]]=JSON.parse(process.argv[3]);fs.writeFileSync(p,JSON.stringify(c,null,2)+"\n")' "$CONFIG" "$1" "$2"
}
find_cmd() {   # find_cmd <name> [fallback paths...]: prints the command to run, or nothing
  local n="$1"; shift
  if command -v "$n" >/dev/null 2>&1; then echo "$n"; return; fi
  for p in "$@"; do [ -x "$p" ] && { echo "$p"; return; }; done
}
python_cmd() {
  for c in python python3 "py -3"; do
    $c -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1 && { echo "$c"; return; }
  done
}
unity_cmd() { find_cmd unity "${LOCALAPPDATA:-/nonexistent}/Unity/bin/unity" "${LOCALAPPDATA:-/nonexistent}/Unity/bin/unity.exe"; }
agy_cmd() { find_cmd agy "${LOCALAPPDATA:-/nonexistent}/agy/bin/agy.exe"; }
cas_dir() { local d; d="$(cfg assetStudioDir)"; echo "${d:-$(cd "$ROOT/.." && pwd)/codex-asset-studio}"; }
cas_api() { local a; a="$(cfg assetStudioApi)"; echo "${a:-${ASSET_STUDIO_API:-http://127.0.0.1:3941}}"; }
startup_cmd() { echo "${APPDATA:-}/Microsoft/Windows/Start Menu/Programs/Startup/codex-asset-studio.cmd"; }
cas_health() { curl -s -m 3 "$(cas_api)/health" 2>/dev/null; }
autostart_on() {
  [ -f "$(startup_cmd)" ] && return 0
  [ $WINDOWS -eq 1 ] && schtasks //Query //FO CSV //V 2>/dev/null | grep -qi "start-on-logon.ps1"
}

# ---- check
todo=0
row() { printf '%-5s %-12s %s\n' "$1" "$2" "$3"; }
ok() { row ok "$1" "$2"; }
need() { row TODO "$1" "$2"; [ -n "${3:-}" ] && printf '%18s-> %s\n' "" "$3"; todo=$((todo + 1)); }

check_git() {
  local g; g="$(find_cmd git)"; [ -n "$g" ] || { need git "Git is not installed" "bash studio-setup.sh --install git"; return; }
  ok git "$(git --version)"
  if [ -n "$(git config --global user.name)" ] && [ -n "$(git config --global user.email)" ]; then
    ok git "identity: $(git config --global user.name)"
  else
    need git "no commit identity (user.name, user.email)" "bash studio-setup.sh --login git"
  fi
}
check_node() {
  command -v node >/dev/null 2>&1 || { need node "Node.js is not installed" "bash studio-setup.sh --install node"; return; }
  local v; v="$(node -v)"
  if node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>20||(a===20&&b>=11)?0:1)'; then ok node "$v"
  else need node "$v is older than 20.11" "bash studio-setup.sh --install node"; fi
}
check_python() {
  local py; py="$(python_cmd)"
  [ -n "$py" ] || { need python "Python 3.10 or later is not installed" "bash studio-setup.sh --install python"; return; }
  ok python "$($py --version 2>&1)"
  $py -c 'import PIL' >/dev/null 2>&1 && ok python "Pillow" || need python "Pillow is missing (Tools/ui-kit-check.py)" "bash studio-setup.sh --install pillow"
}
check_unity() {
  [ -f "/c/Program Files/Unity Hub/Unity Hub.exe" ] || [ $WINDOWS -eq 0 ] && ok unity "Unity Hub" \
    || need unity "Unity Hub is not installed (you create each game's project in it)" "bash studio-setup.sh --install unityhub"
  local u; u="$(unity_cmd)"
  [ -n "$u" ] || { need unity "Unity CLI is not installed" "bash studio-setup.sh --install unity-cli"; return; }
  ok unity "Unity CLI $("$u" --version 2>/dev/null)"
  local auth lic eds
  auth="$("$u" auth status --json 2>/dev/null)"
  echo "$auth" | grep -q '"loggedIn": *true' && ok unity "signed in" || need unity "not signed in" "bash studio-setup.sh --login unity"
  lic="$("$u" license status --json 2>/dev/null)"
  echo "$lic" | grep -q '"active": *true' && ok unity "license active" \
    || need unity "no active license" "Unity Hub → Preferences → Licenses → Add (Unity Personal is free)"
  if [ -n "$UNITY_PIN" ]; then
    eds="$("$u" editors -i --json 2>/dev/null)"
    echo "$eds" | grep -q "\"$UNITY_PIN\"" && ok unity "Editor $UNITY_PIN" \
      || need unity "Editor $UNITY_PIN (the template's version) is not installed" "bash studio-setup.sh --install unity-editor"
  fi
}
check_github() {
  command -v gh >/dev/null 2>&1 || { need github "GitHub CLI is not installed" "bash studio-setup.sh --install github"; return; }
  if gh auth status >/dev/null 2>&1; then ok github "$(gh api user -q .login 2>/dev/null || echo signed in)"
  else need github "GitHub CLI is not signed in" "bash studio-setup.sh --login github"; fi
}
check_vercel() {
  command -v vercel >/dev/null 2>&1 || { need vercel "Vercel CLI is not installed" "bash studio-setup.sh --install vercel"; return; }
  local who; who="$(timeout 40 vercel whoami 2>/dev/null </dev/null | tail -n1)"
  if [ -n "$who" ]; then ok vercel "$who"; else need vercel "Vercel CLI is not signed in" "bash studio-setup.sh --login vercel"; return; fi
  [ -n "$(cfg vercelScope)" ] && ok vercel "scope $(cfg vercelScope)" \
    || need vercel "no vercelScope in $CONFIG (your Vercel team or user name)" "vercel teams ls, then set vercelScope"
}
check_codex() {
  command -v codex >/dev/null 2>&1 || { need codex "Codex CLI is not installed" "bash studio-setup.sh --install codex"; return; }
  ok codex "$(codex --version 2>/dev/null)"
  timeout 30 codex login status 2>&1 </dev/null | grep -qi "Logged in using ChatGPT" && ok codex "signed in with ChatGPT" \
    || { need codex "not signed in with ChatGPT (Asset Studio makes images with it)" "bash studio-setup.sh --login codex"; return; }
  timeout 30 codex features list 2>/dev/null </dev/null | grep -q '^image_generation' && ok codex "ImageGen available" \
    || need codex "this Codex CLI has no image_generation" "bash studio-setup.sh --install codex (update)"
}
check_agy() {
  local a; a="$(agy_cmd)"
  [ -n "$a" ] || { need agy "AGY (Antigravity CLI) is not installed" "bash studio-setup.sh --install agy"; return; }
  local models; models="$(timeout 60 "$a" models 2>/dev/null </dev/null | grep -c $'\t' || true)"
  if [ "${models:-0}" -gt 0 ]; then ok agy "signed in ($models models)"; else need agy "AGY is not signed in" "bash studio-setup.sh --login agy"; fi
}
check_assetstudio() {
  local d; d="$(cas_dir)"
  if [ ! -f "$d/asset-connector/server.mjs" ]; then need assetstudio "not set up in $d" "bash studio-setup.sh --asset-studio"; return; fi
  ok assetstudio "$d"
  [ -n "$(cfg assetStudioDir)" ] || need assetstudio "assetStudioDir is not set in $CONFIG" "bash studio-setup.sh --asset-studio \"$d\""
  local h; h="$(cas_health)"
  if echo "$h" | grep -q '"enabled": *true'; then ok assetstudio "worker running at $(cas_api)"
  elif [ -n "$h" ]; then need assetstudio "$(cas_api) answers but has no worker (manual mode)" "restart it with --worker"
  else need assetstudio "worker not running at $(cas_api)" "bash studio-setup.sh --autostart"; fi
  if [ $WINDOWS -eq 1 ]; then
    autostart_on && ok assetstudio "starts at sign-in" || need assetstudio "does not start at sign-in" "bash studio-setup.sh --autostart"
  fi
}
check_pixelorama() {
  local exe="" p
  for p in "${APPDATA:-}/Orama Interactive/Pixelorama/Pixelorama.exe" "/c/Program Files/Pixelorama/Pixelorama.exe"; do [ -f "$p" ] && exe="$p"; done
  command -v pixelorama >/dev/null 2>&1 && exe="pixelorama"
  [ -n "$exe" ] && ok pixelorama "$exe" || need pixelorama "Pixelorama 1.2.x is not installed" "bash studio-setup.sh --install pixelorama"
  [ -d tools/pixelorama-mcp/server/node_modules/@modelcontextprotocol/sdk ] && ok pixelorama "MCP server packages" \
    || need pixelorama "MCP server packages are missing" "bash studio-setup.sh --install pixelorama-server"
  curl -s -m 2 http://127.0.0.1:7373/health >/dev/null 2>&1 && ok pixelorama "PixMcpBridge answers on 7373" \
    || row info pixelorama "bridge not answering (open Pixelorama with PixMcpBridge enabled: tools/pixelorama-mcp/README.md)"
}

check_all() {
  local chosen; chosen=" $(cfg setup) "
  case "$chosen" in *" assetstudio "*) chosen="$chosen codex " ;; esac   # Asset Studio makes images with Codex CLI
  [ -d local ] && ok local "local/ layer" || need local "no local/ layer" "bash studio-doctor.sh --init"
  for c in "${REQUIRED[@]}"; do "check_$c"; done
  for c in "${OPTIONAL[@]}"; do
    case "$chosen" in
      *" $c "*) "check_$c" ;;
      *) if [ -z "$(cfg setup)" ]; then row "?" "$c" "optional, not chosen yet (bash studio-setup.sh --choose ...)"; else row skip "$c" "not chosen"; fi ;;
    esac
  done
  echo
  [ $todo -eq 0 ] && echo "All set." || echo "$todo to do."
}

# ---- install
winget_install() {
  [ $WINDOWS -eq 1 ] || die "install $2 with your package manager, then run this check again"
  command -v winget >/dev/null 2>&1 || die "winget is missing; install $2 by hand"
  winget install --id "$1" -e --accept-source-agreements --accept-package-agreements
  echo "Installed $2. Open a new terminal (and restart Claude Code) so PATH picks it up."
}
install() {
  case "${1:-}" in
    git) winget_install Git.Git Git ;;
    node) winget_install OpenJS.NodeJS.LTS "Node.js LTS" ;;
    python) winget_install Python.Python.3.12 "Python 3.12" ;;
    pillow) local py; py="$(python_cmd)"; [ -n "$py" ] || die "install python first"; $py -m pip install Pillow ;;
    unityhub) winget_install Unity.UnityHub "Unity Hub" ;;
    unity-cli) echo "Install the Unity CLI by Unity's own instructions (search the Unity docs for \"Unity CLI\"), then run"
               echo "unity skill install claude-code. It is not in winget."; exit 3 ;;
    unity-editor) local u; u="$(unity_cmd)"; [ -n "$u" ] || die "install the Unity CLI first"
                  [ -n "$UNITY_PIN" ] || die "no Unity version in template/CLAUDE.md"; "$u" install "$UNITY_PIN" ;;
    github) winget_install GitHub.cli "GitHub CLI" ;;
    vercel) npm install -g vercel ;;
    codex) npm install -g @openai/codex ;;
    agy) echo "Install AGY, the Antigravity CLI, from Google's Antigravity download page, then run agy install once."; exit 3 ;;
    pixelorama) echo "Download Pixelorama 1.2.x from https://github.com/Orama-Interactive/Pixelorama/releases, then add"
                echo "tools/pixelorama-mcp/PixMcpBridge.pck as its extension (tools/pixelorama-mcp/README.md)."; exit 3 ;;
    pixelorama-server) npm ci --omit=dev --prefix tools/pixelorama-mcp/server ;;
    *) die "--install: git node python pillow unityhub unity-cli unity-editor github vercel codex agy pixelorama pixelorama-server" ;;
  esac
}

# ---- sign in (interactive: it waits for you)
login() {
  local id="${1:-}"
  if [ ! -t 0 ]; then
    echo "Sign-in asks you questions, so it needs your terminal. In the Claude Code prompt type:"
    echo "  ! bash studio-setup.sh --login $id"
    exit 4
  fi
  case "$id" in
    git) local n e; read -r -p "Name for your commits: " n; read -r -p "Email for your commits: " e
         [ -n "$n" ] && [ -n "$e" ] || die "both are needed"
         git config --global user.name "$n"; git config --global user.email "$e" ;;
    github) gh auth login --web --git-protocol https && gh auth setup-git ;;
    unity) "$(unity_cmd)" auth login ;;
    vercel) vercel login ;;
    codex) codex login ;;
    agy) echo "AGY opens; sign in with your Google account, then type /quit (or press Ctrl+C) to come back."; "$(agy_cmd)" ;;
    *) die "--login: git github unity vercel codex agy" ;;
  esac
  echo "Done. Check: bash studio-setup.sh"
}

# ---- Codex Asset Studio
asset_studio() {
  local d="${1:-$(cas_dir)}"
  [ -d local ] || die "no local/ layer: bash studio-doctor.sh --init"
  if [ -f "$d/asset-connector/server.mjs" ]; then
    echo "Asset Studio is already in $d."
  else
    [ ! -e "$d" ] || [ -z "$(ls -A "$d" 2>/dev/null)" ] || die "$d exists and is not Asset Studio; pick another folder"
    git clone "$CAS_URL" "$d" || die "clone failed"
  fi
  local py; py="$(python_cmd)"; [ -n "$py" ] || die "install python first"
  local lines; lines="$(grep -E '^python -m pip install ' "$d/README.md" || true)"
  [ -n "$lines" ] || die "no 'python -m pip install' lines in $d/README.md; follow its Quick start by hand"
  while IFS= read -r l; do
    echo "+ ${l/python/$py}"
    eval "$py ${l#python }" || die "pip failed: $l"
  done <<< "$lines"
  (cd "$d" && node asset-connector/setup.mjs doctor) || die "Asset Studio doctor failed: fix what it lists, then run this again"
  local abs; abs="$(cd "$d" && pwd -W 2>/dev/null || pwd)"
  cfg_set assetStudioDir "\"${abs//\\//}\""
  echo "assetStudioDir = ${abs//\\//} (in $CONFIG). Next: bash studio-setup.sh --autostart"
}
autostart() {
  local d; d="$(cas_dir)"; [ -f "$d/asset-connector/start-on-logon.ps1" ] || die "Asset Studio is not set up: --asset-studio"
  [ $WINDOWS -eq 1 ] || die "on this OS, start it yourself: cd \"$d\" && node asset-connector/server.mjs --worker"
  local ps1; ps1="$(cygpath -w "$d/asset-connector/start-on-logon.ps1")"
  if autostart_on; then echo "Already starts at sign-in."
  else
    printf '@echo off\r\npowershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%s"\r\n' "$ps1" > "$(startup_cmd)"
    echo "Starts at sign-in: $(startup_cmd)"
  fi
  if cas_health | grep -q '"enabled": *true'; then echo "Worker already running."; return; fi
  (powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$ps1" >/dev/null 2>&1 &)
  for _ in $(seq 1 20); do cas_health | grep -q '"enabled": *true' && { echo "Worker running at $(cas_api)."; return; }; sleep 1; done
  die "worker did not answer at $(cas_api); read $d/asset-connector/data/windows-worker.stderr.log"
}
smoke() {
  local d; d="$(cas_dir)"; [ -f "$d/asset-connector/setup.mjs" ] || die "Asset Studio is not set up: --asset-studio"
  (cd "$d" && node asset-connector/setup.mjs smoke)
}

case "${1:-}" in
  ""|--check) check_all ;;
  --choose) shift; for c in "$@"; do case " ${OPTIONAL[*]} " in *" $c "*) ;; *) die "--choose: ${OPTIONAL[*]}" ;; esac; done
            cfg_set setup "$(printf '%s\n' "$@" | node -e 'process.stdout.write(JSON.stringify(require("fs").readFileSync(0,"utf8").split("\n").filter(Boolean)))')"
            echo "setup = $* (in $CONFIG)" ;;
  --install) install "${2:-}" ;;
  --login) login "${2:-}" ;;
  --asset-studio) asset_studio "${2:-}" ;;
  --autostart) autostart ;;
  --smoke) smoke ;;
  *) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
