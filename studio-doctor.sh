#!/usr/bin/env bash
# Check the workspace before you pull a new version, or after you clone it (docs/local-layer.md).
#   bash studio-doctor.sh            check: local/ layer, workspace files you changed, the commit hook, upstream
#   bash studio-doctor.sh --init     first time: make local/ from local.example/ and turn on the commit hook
#   bash studio-doctor.sh --fetch    also fetch the upstream repo and list the newer template versions
# Changes nothing except with --init. Run in Git Bash (Windows) or any bash.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
INIT=0 FETCH=0
for a in "$@"; do
  case "$a" in
    --init) INIT=1 ;;
    --fetch) FETCH=1 ;;
    *) echo "usage: bash studio-doctor.sh [--init] [--fetch]" >&2; exit 2 ;;
  esac
done
UPSTREAM_URL="https://github.com/voilenmang12/claude-game-studio"
warn=0
ok() { echo "ok    $*"; }
bad() { echo "WARN  $*"; warn=$((warn + 1)); }
info() { echo "      $*"; }

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "Not a git checkout of the workspace: $ROOT" >&2; exit 1; }

# ---- --init
if [ $INIT -eq 1 ]; then
  if [ -e local ]; then
    echo "local/ exists; left as it is."
  else
    cp -R local.example local
    echo "made local/ from local.example/. Fill in local/RULES.md and local/studio.config.json; then make it a git"
    echo "repo of its own (private if it will hold paid plugins): cd local && git init -b main"
  fi
  git config core.hooksPath tools/hooks
  echo "turned on the commit hook (git config core.hooksPath tools/hooks)."
  echo
fi

# ---- local/
if [ ! -d local ]; then
  bad "no local/ layer: bash studio-doctor.sh --init"
else
  ok "local/ exists"
  for f in RULES.md studio.config.json; do [ -f "local/$f" ] || bad "local/$f is missing (see local.example/)"; done
  if [ -f local/studio.config.json ]; then
    node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' local/studio.config.json 2>/dev/null \
      && ok "local/studio.config.json is valid JSON" || bad "local/studio.config.json is not valid JSON"
  fi
  if [ -d local/.git ]; then
    ok "local/ is a git repo of its own"
    remote="$(git -C local remote get-url origin 2>/dev/null || true)"
    if [ -z "$remote" ]; then
      info "local/ has no remote: back it up with a private repo when you are ready"
    elif command -v gh >/dev/null 2>&1; then
      vis="$(gh repo view "$remote" --json visibility -q .visibility 2>/dev/null || true)"
      case "$vis" in
        PRIVATE|INTERNAL) ok "local/ remote is $vis: $remote" ;;
        PUBLIC) bad "local/ remote is PUBLIC: $remote. Make it private if it holds paid plugins or personal data." ;;
        *) info "local/ remote: $remote (visibility not checked)" ;;
      esac
    else
      info "local/ remote: $remote (install gh to check that it is private)"
    fi
    [ -z "$(git -C local status --porcelain)" ] || info "local/ has uncommitted changes"
  else
    info "local/ is not a git repo: cd local && git init -b main"
  fi
  [ -d local/project ] && [ ! -d local/project/ProjectSettings ] && [ -n "$(ls -A local/project | grep -v '^README.md$' || true)" ] \
    && bad "local/project/ has files but no ProjectSettings/: new-game.sh only uses it as a whole Unity project"
fi
[ -z "$(git ls-files local)" ] && ok "nothing from local/ is tracked by the workspace repo" \
  || bad "the workspace repo tracks files under local/: git rm -r --cached local"

# ---- workspace files you changed (they conflict on the next pull)
changed="$(git status --porcelain --untracked-files=no)"
if [ -z "$changed" ]; then
  ok "no workspace file changed"
else
  bad "workspace files changed; move your own changes to local/ before you pull (docs/local-layer.md):"
  printf '%s\n' "$changed" | sed 's/^/        /'
fi
ahead="$(git rev-list --count '@{u}..HEAD' 2>/dev/null || echo 0)"
[ "$ahead" = 0 ] || info "$ahead local commit(s) on top of the tracked branch: they will be merged with the next pull"

# ---- commit hook
[ "$(git config core.hooksPath || true)" = "tools/hooks" ] && ok "commit hook on (tools/hooks/pre-commit)" \
  || bad "commit hook off: git config core.hooksPath tools/hooks"

# ---- upstream
src=""
for r in upstream origin; do
  u="$(git remote get-url "$r" 2>/dev/null || true)"
  case "$u" in *voilenmang12/claude-game-studio*) src="$r"; break ;; esac
done
if [ -z "$src" ]; then
  bad "no remote points to the public repo: git remote add upstream $UPSTREAM_URL"
else
  ok "updates come from remote '$src'"
  if [ $FETCH -eq 1 ]; then
    git fetch -q --tags "$src"
    cur="v$(tr -d '[:space:]' < template/TEMPLATE_VERSION)"
    newer="$(git tag -l 'v*' --sort=v:refname | awk -v c="$cur" 'f; $0 == c { f = 1 }')"
    if [ -z "$newer" ]; then
      ok "template $cur is the newest version"
    else
      bad "newer versions than $cur: $(echo $newer). Read their Port steps in template/TEMPLATE_CHANGELOG.md, then: git merge $(echo "$newer" | tail -n1)"
    fi
  fi
fi

echo
[ $warn -eq 0 ] && echo "All good." || echo "$warn warning(s)."
