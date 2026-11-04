"""Small WAV helpers. Audio is mono float32 numpy arrays of shape (n,)."""
from __future__ import annotations

from math import gcd
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly


def read_wav(path: str | Path) -> tuple[np.ndarray, int]:
    """Read a file and mix it down to mono float32."""
    x, sr = sf.read(str(path), dtype="float32", always_2d=True)
    return x.mean(axis=1), int(sr)


def write_wav(path: str | Path, x: np.ndarray, sr: int) -> None:
    """Write float32 WAV (no quantisation, so sums stay exact). x is (n,) or (n, ch)."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(path), np.asarray(x, dtype=np.float32), sr, subtype="FLOAT")


def fit_length(x: np.ndarray, n: int) -> np.ndarray:
    """Zero-pad or trim the first axis so that the result has exactly n samples."""
    if len(x) == n:
        return x
    if len(x) > n:
        return x[:n]
    pad = [(0, n - len(x))] + [(0, 0)] * (x.ndim - 1)
    return np.pad(x, pad)


def resample(x: np.ndarray, sr_in: int, sr_out: int) -> np.ndarray:
    if sr_in == sr_out:
        return x
    g = gcd(sr_in, sr_out)
    return resample_poly(x, sr_out // g, sr_in // g).astype(np.float32)
