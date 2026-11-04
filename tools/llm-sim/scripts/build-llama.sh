#!/usr/bin/env bash
# Clones llama.cpp at the pinned tag and builds llama-server, llama-bench and llama-cli twice:
#   .cache/build-cuda  (CUDA, arch 89 = RTX 4090; override with CUDA_ARCH)   .cache/build-cpu  (CPU only)
# Usage: scripts/build-llama.sh [cuda|cpu|all]   (default: all). Nothing is installed outside .cache.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
what="${1:-all}"
mkdir -p "$CACHE_DIR"
if [ ! -d "$LLAMA_SRC/.git" ]; then
  git clone --depth 1 --branch "$LLAMA_TAG" https://github.com/ggml-org/llama.cpp "$LLAMA_SRC"
else
  current="$(git -C "$LLAMA_SRC" describe --tags --exact-match 2>/dev/null || true)"
  if [ "$current" != "$LLAMA_TAG" ]; then
    git -C "$LLAMA_SRC" fetch --depth 1 origin "refs/tags/$LLAMA_TAG:refs/tags/$LLAMA_TAG"
    git -C "$LLAMA_SRC" checkout -q "$LLAMA_TAG"
  fi
fi
targets=(--target llama-server --target llama-bench --target llama-cli)
common=(-DCMAKE_BUILD_TYPE=Release -DLLAMA_CURL=OFF -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_EXAMPLES=OFF -DLLAMA_BUILD_SERVER=ON -DLLAMA_BUILD_TOOLS=ON)
if [ "$what" = cpu ] || [ "$what" = all ]; then
  cmake -S "$LLAMA_SRC" -B "$BUILD_CPU" "${common[@]}" -DGGML_CUDA=OFF -DGGML_NATIVE=ON
  cmake --build "$BUILD_CPU" -j "$(nproc)" "${targets[@]}"
fi
if [ "$what" = cuda ] || [ "$what" = all ]; then
  [ -x "$CUDA_PREFIX/bin/nvcc" ] || "$LLM_SIM_DIR/scripts/setup-cuda.sh"
  export PATH="$CUDA_PREFIX/bin:$PATH"
  cmake -S "$LLAMA_SRC" -B "$BUILD_CUDA" "${common[@]}" -DGGML_CUDA=ON -DGGML_NATIVE=ON \
    -DCMAKE_CUDA_ARCHITECTURES="${CUDA_ARCH:-89}" -DCUDAToolkit_ROOT="$CUDA_PREFIX" -DCMAKE_CUDA_COMPILER="$CUDA_PREFIX/bin/nvcc"
  cmake --build "$BUILD_CUDA" -j "$(nproc)" "${targets[@]}"
fi
echo "llama.cpp $LLAMA_TAG built ($what)."
