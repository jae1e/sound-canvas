"""Per-speaker level and 'dryness' proxies for the camera-holder heuristic (close, loud, dry voice).

All features are computed on the mixture, over the segments a diarizer assigned to one speaker.
"""
from __future__ import annotations

import numpy as np

EPS = 1e-12


def _frame_db(x: np.ndarray, sr: int, frame_s: float = 0.02) -> np.ndarray:
    hop = int(frame_s * sr)
    n = len(x) // hop
    if n == 0:
        return np.zeros(0)
    f = np.asarray(x[: n * hop], dtype=np.float64).reshape(n, hop)
    return 10 * np.log10(np.mean(f**2, axis=1) + EPS)


def _cut(x: np.ndarray, sr: int, segs: list[tuple[float, float]]) -> np.ndarray:
    parts = [x[int(s * sr): int(e * sr)] for s, e in segs if e > s]
    return np.concatenate(parts) if parts else np.zeros(0, dtype=x.dtype)


def level_db(x: np.ndarray, sr: int, segs) -> float:
    """RMS level (dB) of the speaker's frames, using the loudest 80% of frames to ignore pauses."""
    db = _frame_db(_cut(x, sr, segs), sr)
    if len(db) == 0:
        return -120.0
    return float(10 * np.log10(np.mean(10 ** (np.sort(db)[len(db) // 5:] / 10))))


def dynamic_range_db(x: np.ndarray, sr: int, segs) -> float:
    """p90 - p10 of frame energy inside the speaker's segments. Reverb and noise fill the valleys, so a drier,
    closer voice has a larger value."""
    db = _frame_db(_cut(x, sr, segs), sr)
    return float(np.percentile(db, 90) - np.percentile(db, 10)) if len(db) > 10 else 0.0


def high_band_ratio(x: np.ndarray, sr: int, segs, split_hz: float = 3000.0) -> float:
    """Share of energy above split_hz. Distance and room absorption remove high frequencies."""
    y = _cut(x, sr, segs)
    if len(y) < 512:
        return 0.0
    spec = np.abs(np.fft.rfft(y * np.hanning(len(y)))) ** 2
    freqs = np.fft.rfftfreq(len(y), 1 / sr)
    return float(spec[freqs >= split_hz].sum() / (spec.sum() + EPS))


def tail_drop_db(x: np.ndarray, sr: int, segs, min_gap_s: float = 0.5) -> float:
    """Mean energy drop (dB) from the last 0.25 s of a segment to the 0.05-0.30 s after it, over segments
    followed by at least min_gap_s without any of the speaker's own speech. A dry voice drops faster."""
    segs = sorted(segs)
    drops = []
    for i, (s, e) in enumerate(segs):
        nxt = segs[i + 1][0] if i + 1 < len(segs) else len(x) / sr
        if nxt - e < min_gap_s or e - s < 0.5:
            continue
        inside = x[int((e - 0.25) * sr): int(e * sr)]
        after = x[int((e + 0.05) * sr): int((e + 0.30) * sr)]
        if len(inside) and len(after):
            drops.append(10 * np.log10(np.mean(inside**2) + EPS) - 10 * np.log10(np.mean(after**2) + EPS))
    return float(np.mean(drops)) if drops else 0.0


def rank_speakers(features: dict[str, dict[str, float]], keys=("level_db", "dynamic_range_db")) -> list[str]:
    """Order speakers by the sum of z-scores of the given features (higher is closer and drier)."""
    names = list(features)
    if len(names) < 2:
        return names
    score = {n: 0.0 for n in names}
    for k in keys:
        v = np.array([features[n][k] for n in names], dtype=float)
        sd = v.std() or 1.0
        for n, z in zip(names, (v - v.mean()) / sd):
            score[n] += float(z)
    return sorted(names, key=lambda n: -score[n])
