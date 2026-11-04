#!/usr/bin/env bash
# Starts or stops a llama-server for one model from models.json.
#   scripts/server.sh start <model-id> <gpu|cpu> [port]   (CPU uses 4 threads, a rough phone-class proxy)
#   scripts/server.sh stop  [port]
#   scripts/server.sh status [port]
# Binds to 127.0.0.1 only. Greedy decoding is requested per call by the client (temperature 0).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
cmd="${1:-}"; shift || true
mkdir -p "$RUN_DIR"
case "$cmd" in
  start)
    id="${1:?model id}"; dev="${2:-gpu}"; port="${3:-8080}"
    gguf="$(node "$LLM_SIM_DIR/scripts/models.mjs" path "$id")"
    [ -f "$gguf" ] || { echo "missing $gguf; run: node scripts/models.mjs download $id" >&2; exit 1; }
    if [ "$dev" = gpu ]; then bin="$BUILD_CUDA/bin/llama-server"; extra=(-ngl 99); else bin="$BUILD_CPU/bin/llama-server"; extra=(-ngl 0 -t 4); fi
    [ -x "$bin" ] || { echo "missing $bin; run scripts/build-llama.sh" >&2; exit 1; }
    "$0" stop "$port" >/dev/null 2>&1 || true
    # --parallel 1 and a fixed context keep latency numbers comparable between runs.
    nohup "$bin" -m "$gguf" --host 127.0.0.1 --port "$port" -c 8192 --parallel 1 --no-webui "${extra[@]}" > "$RUN_DIR/server-$port.log" 2>&1 &
    echo $! > "$RUN_DIR/server-$port.pid"
    for _ in $(seq 1 120); do
      if curl -sf "http://127.0.0.1:$port/health" >/dev/null 2>&1; then echo "llama-server up on :$port ($id, $dev)"; exit 0; fi
      sleep 1
    done
    echo "llama-server did not become healthy; see $RUN_DIR/server-$port.log" >&2; exit 1 ;;
  stop)
    port="${1:-8080}"
    if [ -f "$RUN_DIR/server-$port.pid" ]; then kill "$(cat "$RUN_DIR/server-$port.pid")" 2>/dev/null || true; rm -f "$RUN_DIR/server-$port.pid"; fi
    echo "stopped :$port" ;;
  status)
    port="${1:-8080}"
    curl -sf "http://127.0.0.1:$port/health" && echo || { echo "down"; exit 1; } ;;
  *) echo "usage: server.sh start <id> <gpu|cpu> [port] | stop [port] | status [port]" >&2; exit 2 ;;
esac
