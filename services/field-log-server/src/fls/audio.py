"""Audio loading and resampling helpers."""

from __future__ import annotations

from math import gcd
from pathlib import Path

import numpy as np
import soundfile as sf


def resample(x: np.ndarray, sr: int, target: int = 16000) -> np.ndarray:
    if sr == target or x.size == 0:
        return x
    try:
        from scipy.signal import resample_poly

        g = gcd(sr, target)
        return resample_poly(x, target // g, sr // g).astype(np.float32)
    except ImportError:
        # Fallback: moving-average anti-alias filter when downsampling, then linear interpolation.
        if sr > target:
            k = max(1, int(round(sr / target)))
            x = np.convolve(x, np.ones(k, dtype=np.float32) / k, mode="same")
        n_out = int(round(len(x) * target / sr))
        t = np.linspace(0, len(x) - 1, n_out)
        return np.interp(t, np.arange(len(x)), x).astype(np.float32)


def load_16k_mono(path: Path | str) -> np.ndarray:
    data, sr = sf.read(str(path), dtype="float32", always_2d=True)
    mono = data.mean(axis=1) if data.shape[1] > 1 else data[:, 0]
    return resample(np.ascontiguousarray(mono, dtype=np.float32), sr, 16000)


def degrade(x: np.ndarray, attenuate_db: float = 0.0, lf_noise_dbfs: float | None = None, seed: int = 0) -> np.ndarray:
    """Make quiet, rumbly test audio: attenuate, then add 30-150 Hz noise at the given RMS level."""
    from scipy.signal import butter, sosfilt

    y = x * 10 ** (attenuate_db / 20)
    if lf_noise_dbfs is not None:
        n = np.random.default_rng(seed).standard_normal(len(y))
        n = sosfilt(butter(2, [30, 150], "bandpass", fs=16000, output="sos"), n)
        n *= 10 ** (lf_noise_dbfs / 20) / max(float(np.sqrt(np.mean(n * n))), 1e-9)
        y = y + n
    return np.clip(y, -1, 1).astype(np.float32)
