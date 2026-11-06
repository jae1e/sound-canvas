#!/usr/bin/env bash
# Run the server as a transient systemd user unit with a memory cap.
# Usage: scripts/start.sh [fls serve args...]   (default: --final-engine qwen3 --live-engine nemotron)
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
ARGS=("$@")
if [ ${#ARGS[@]} -eq 0 ]; then ARGS=(--final-engine qwen3 --live-engine nemotron); fi
systemd-run --user --unit=field-log-server \
  -p MemoryMax=12G -p MemorySwapMax=0 \
  --working-directory="$DIR" \
  "$(command -v uv)" run --no-sync fls serve "${ARGS[@]}"
echo "started; logs: scripts/logs.sh   stop: scripts/stop.sh"
