#!/usr/bin/env bash
# Collect one live snapshot. Intended for cron; see README "Collecting on a schedule".
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# cron starts with a minimal PATH. Keep the npm/gh locations that a normal login
# shell would have, without hard-coding this machine's home directory.
export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

printf '[%s] collection started\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
npm run --silent collect
printf '[%s] collection finished\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
