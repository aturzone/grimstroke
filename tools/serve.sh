#!/usr/bin/env bash
# Rebuild, then restart the workspace server.
#
# The server loads the renderer at start, so a CSS or markup change that is only built is a
# change the running server has never seen. Every "why is my fix not there" in this repo so
# far has been that.
set -euo pipefail
cd "$(dirname "$0")/.."
pnpm run build >/dev/null
# Whatever holds the port, by the port: a match on the command line once matched the shell
# running this script, and a stale server on the port kept serving the old stylesheet.
pid=$(ss -ltnpH "sport = :${PORT:-7777}" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2 || true)
if [ -n "$pid" ]; then kill $pid; sleep 0.3; fi
exec node dist/cli.js serve --port "${PORT:-7777}" --token "${TOKEN:-grimstroke-demo}"
