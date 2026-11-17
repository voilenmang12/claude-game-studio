#!/usr/bin/env bash
# PreToolUse hook: runs project-boundary.mjs (a session writes only inside its own project). Without Node it
# lets the call through.
command -v node >/dev/null 2>&1 || exit 0
exec node "$(dirname "$0")/project-boundary.mjs"
