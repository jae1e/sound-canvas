#!/usr/bin/env bash
# Shared paths for the llm-sim scripts. Everything large lives under .cache (gitignored).
LLM_SIM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE_DIR="$LLM_SIM_DIR/.cache"
# Pinned llama.cpp release tag (ggml-org/llama.cpp). Bump deliberately; results are only comparable within one tag.
LLAMA_TAG="${LLAMA_TAG:-b12098}"
LLAMA_SRC="$CACHE_DIR/llama.cpp"
BUILD_CUDA="$CACHE_DIR/build-cuda"
BUILD_CPU="$CACHE_DIR/build-cpu"
MODELS_DIR="$CACHE_DIR/models"
RUN_DIR="$CACHE_DIR/run"
CUDA_PREFIX="$CACHE_DIR/cuda"
