"""Waveform peaks, a tiny PNG writer and spectrograms for the dashboard."""

from __future__ import annotations

import struct
import zlib

import numpy as np


def peaks(x: np.ndarray, n: int) -> tuple[list[float], list[float]]:
    """Per-bin min and max over n bins covering the whole signal."""
    if len(x) == 0:
        return [0.0] * n, [0.0] * n
    edges = np.linspace(0, len(x), n + 1).astype(int)
    lo, hi = [], []
    for a, b in zip(edges[:-1], edges[1:]):
        seg = x[a:max(b, a + 1)]
        lo.append(round(float(seg.min()), 4))
        hi.append(round(float(seg.max()), 4))
    return lo, hi


def png_rgb(img: np.ndarray) -> bytes:
    h, w, _ = img.shape
    raw = b"".join(b"\x00" + img[y].tobytes() for y in range(h))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 6)) + chunk(b"IEND", b""))


def spectrogram_png(x: np.ndarray, sr: int = 16000, floor_db: float = -100.0, top_db: float = -20.0) -> bytes:
    n_fft, hop = 512, 320
    if len(x) < n_fft:
        x = np.pad(x, (0, n_fft - len(x)))
    win = np.hanning(n_fft).astype(np.float32)
    frames = 1 + (len(x) - n_fft) // hop
    idx = np.arange(n_fft)[None, :] + hop * np.arange(frames)[:, None]
    mag = np.abs(np.fft.rfft(x[idx] * win, axis=1)) / (n_fft / 4)
    db = 20 * np.log10(np.maximum(mag, 1e-10)).T[::-1]  # low frequencies at the bottom
    v = np.clip((db - floor_db) / (top_db - floor_db), 0, 1)
    # Dark blue -> purple -> orange -> pale yellow.
    stops = np.array([[0, 0, 40], [90, 20, 120], [220, 90, 40], [255, 245, 190]], dtype=np.float32)
    pos = v * (len(stops) - 1)
    lo = np.minimum(pos.astype(int), len(stops) - 2)
    frac = (pos - lo)[..., None]
    rgb = stops[lo] * (1 - frac) + stops[lo + 1] * frac
    return png_rgb(rgb.astype(np.uint8))
