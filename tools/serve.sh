#!/usr/bin/env bash
# Rebuild, then restart the workspace server.
#
# The server loads the renderer at start, so a CSS or markup change that is only built is a
# change the running server has never seen. Every "why is my fix not there" in this repo so
# far has been that.
set -euo pipefail
cd "$(dirname "$0")/.."
pnpm run build >/dev/null
pkill -f "dist/cli.js serve --port ${PORT:-7777}" 2>/dev/null || true
sleep 0.3
exec node dist/cli.js serve --port "${PORT:-7777}" --token "${TOKEN:-grimstroke-demo}"
