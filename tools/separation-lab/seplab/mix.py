"""Deterministic synthetic mixture builder with ground-truth stems."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from scipy.signal import fftconvolve

from .audio_io import fit_length, read_wav, resample, write_wav


@dataclass
class Interferer:
    path: str
    snr_db: float = 0.0       # target power relative to this interferer: +x means the interferer is x dB quieter
    offset_s: float = 0.0     # where the interferer starts inside the mixture
    rir: str | None = None    # optional per-interferer room impulse response


def _load(path: str, sr: int) -> np.ndarray:
    x, s = read_wav(path)
    return resample(x, s, sr)


def _reverb(x: np.ndarray, rir_path: str, sr: int) -> np.ndarray:
    rir = _load(rir_path, sr)
    if not np.any(rir):
        raise ValueError(f"RIR {rir_path} is silent")
    out = fftconvolve(x, rir)[: len(x)]
    # Keep the level of the dry signal so that SNR settings stay meaningful.
    return (out * (np.sqrt(np.mean(x**2) / (np.mean(out**2) + 1e-12)))).astype(np.float32)


def _power(x: np.ndarray) -> float:
    return float(np.mean(x.astype(np.float64) ** 2)) + 1e-12


def build_mixture(
    target: str,
    interferers: list[Interferer],
    out_dir: str | Path,
    sr: int = 16000,
    seed: int = 0,
    target_rir: str | None = None,
    description: str = "",
    spans: list[tuple[str, float, float]] | None = None,
    target_name: str = "target",
) -> dict:
    """Write mixture.wav, target.wav, interferer_<i>.wav, others.wav and manifest.json to out_dir.

    The mixture has the target's length. A shorter interferer is looped, a longer one is cropped at a
    seeded random start. Stems are the exact components of the mixture (after RIR, gain and offset).
    """
    out_dir = Path(out_dir)
    rng = np.random.default_rng(seed)
    t = _load(target, sr)
    if target_rir:
        t = _reverb(t, target_rir, sr)
    n = len(t)

    stems = []
    for spec in interferers:
        x = _load(spec.path, sr)
        if len(x) == 0:
            raise ValueError(f"empty interferer: {spec.path}")
        start = int(round(spec.offset_s * sr))
        length = max(n - start, 0)
        if len(x) < length:
            x = np.tile(x, int(np.ceil(length / len(x))))
        if len(x) > length:
            crop = int(rng.integers(0, len(x) - length + 1))
            x = x[crop : crop + length]
        if spec.rir:
            x = _reverb(x, spec.rir, sr)
        full = np.zeros(n, dtype=np.float32)
        full[start : start + len(x)] = x[:length]
        # Scale so that 10*log10(P_target / P_interferer) == snr_db, using power over the active region.
        active = full[start:] if length else full
        gain = np.sqrt(_power(t) / (_power(active) * 10 ** (spec.snr_db / 10)))
        stems.append((full * gain).astype(np.float32))

    others = np.sum(stems, axis=0).astype(np.float32) if stems else np.zeros(n, dtype=np.float32)
    mixture = t + others
    peak = float(np.max(np.abs(mixture))) if n else 0.0
    scale = 0.95 / peak if peak > 0.95 else 1.0   # one common gain keeps mixture == sum of stems
    t, others, mixture = t * scale, others * scale, mixture * scale
    stems = [s * scale for s in stems]

    out_dir.mkdir(parents=True, exist_ok=True)
    write_wav(out_dir / "mixture.wav", mixture, sr)
    write_wav(out_dir / "target.wav", t, sr)
    write_wav(out_dir / "others.wav", others, sr)
    inter_entries = []
    for i, (spec, s) in enumerate(zip(interferers, stems)):
        write_wav(out_dir / f"interferer_{i}.wav", s, sr)
        inter_entries.append({"path": f"interferer_{i}.wav", "source": spec.path, "snr_db": spec.snr_db,
                              "offset_s": spec.offset_s, "rir": spec.rir})
    manifest = {
        "seed": seed,
        "sr": sr,
        "n_samples": n,
        "gain": scale,
        "mixture": "mixture.wav",
        "others": "others.wav",
        "targets": [{"name": target_name, "path": "target.wav", "source": target, "rir": target_rir,
                     "description": description or target_name, "spans": [list(s) for s in (spans or [])]}],
        "interferers": inter_entries,
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return manifest


def load_manifest(path: str | Path) -> dict:
    """Load a clip manifest and resolve file names relative to its folder."""
    path = Path(path)
    m = json.loads(path.read_text())
    m["_dir"] = str(path.parent)
    return m
