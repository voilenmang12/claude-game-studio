#!/usr/bin/env bash
# Commit one change in every studio repo it touched: the workspace repo, local/ and local/project/ (each only when it
# is a git repo with changes). Game repos are not touched. docs/local-layer.md.
#   bash studio-commit.sh "<message>"            show the changes, then commit them
#   bash studio-commit.sh "<message>" --push     and push each repo that was committed
#   bash studio-commit.sh --status               show the changes only
# Stops at the first failure (for example the workspace commit hook refusing private content).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
MSG="" PUSH=0 STATUS=0
for a in "$@"; do
  case "$a" in
    --push) PUSH=1 ;;
    --status) STATUS=1 ;;
    -*) echo "unknown option $a" >&2; exit 2 ;;
    *) [ -z "$MSG" ] || { echo "one message only" >&2; exit 2; }; MSG="$a" ;;
  esac
done
[ -n "$MSG" ] || [ $STATUS -eq 1 ] || { echo 'usage: bash studio-commit.sh "<message>" [--push] | --status' >&2; exit 2; }

REPOS=()
for d in "$ROOT" "$ROOT/local" "$ROOT/local/project"; do
  [ -e "$d/.git" ] && REPOS+=("$d")
done

changed=()
for r in "${REPOS[@]}"; do
  s="$(git -C "$r" status --porcelain)"
  name="${r#"$ROOT"}"; name="${name#/}"; name="${name:-workspace}"
  if [ -n "$s" ]; then
    echo "== $name"
    printf '%s\n' "$s" | sed 's/^/   /'
    changed+=("$r")
  else
    echo "== $name: no changes"
  fi
done
[ $STATUS -eq 0 ] || exit 0
[ ${#changed[@]} -gt 0 ] || { echo "Nothing to commit."; exit 0; }

for r in "${changed[@]}"; do
  name="${r#"$ROOT"}"; name="${name#/}"; name="${name:-workspace}"
  git -C "$r" add -A
  git -C "$r" commit -q -m "$MSG" || { echo "commit failed in $name; the other repos after it are not committed" >&2; exit 1; }
  echo "committed $name: $(git -C "$r" log --oneline -1)"
  if [ $PUSH -eq 1 ]; then
    if git -C "$r" rev-parse --abbrev-ref '@{u}' >/dev/null 2>&1; then
      git -C "$r" push -q
    elif git -C "$r" remote get-url origin >/dev/null 2>&1; then
      git -C "$r" push -q -u origin HEAD
    else
      echo "   $name has no remote: not pushed"
      continue
    fi
    echo "   pushed $name"
  fi
done
