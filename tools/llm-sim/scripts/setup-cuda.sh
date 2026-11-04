#!/usr/bin/env bash
# Installs a CUDA toolkit (nvcc + headers + cuBLAS) into tools/llm-sim/.cache/cuda with conda. Nothing goes to system paths.
# Needed only because this PC has the NVIDIA driver but no CUDA toolkit.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
prefix="$here/.cache/cuda"
conda_bin="${CONDA_BIN:-$(command -v conda || echo "$HOME/miniconda3/bin/conda")}"
if [ -x "$prefix/bin/nvcc" ]; then echo "CUDA toolkit already at $prefix"; exit 0; fi
mkdir -p "$here/.cache"
"$conda_bin" create -y -p "$prefix" -c nvidia -c conda-forge --override-channels \
  cuda-nvcc cuda-cudart-dev cuda-nvrtc-dev cuda-cccl libcublas-dev cuda-driver-dev
echo "nvcc: $("$prefix/bin/nvcc" --version | tail -1)"
