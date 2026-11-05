#!/usr/bin/env bash
# Launch the local web demo inside a memory-capped scope (the machine shares 29 GiB of RAM with other apps).
# Usage: ./run-demo.sh [--port 7860] [--backend sam|filter] [--max-seconds 600]
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p data/tmp runs/web
export TMPDIR="$PWD/data/tmp" GRADIO_TEMP_DIR="$PWD/data/tmp/gradio" GRADIO_ANALYTICS_ENABLED=False
export HF_HUB_DISABLE_TELEMETRY=1
free -h | sed -n 1,2p
exec systemd-run --user --scope -p MemoryMax=14G -p MemorySwapMax=0 \
  uv run --no-sync python -m seplab.web.app "$@"
