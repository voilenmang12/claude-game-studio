#!/usr/bin/env bash
# Stop hook: runs goal-check.mjs (autonomous goals, no model judge). Without Node it allows the stop.
command -v node >/dev/null 2>&1 || exit 0
exec node "$(dirname "$0")/goal-check.mjs"
