"""Targets plus others: compose separated tracks, remix, export."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from .audio_io import fit_length, read_wav, write_wav
from .separation.prompt import Prompt


@dataclass
class Target:
    name: str
    prompt: Prompt


@dataclass
class TrackSet:
    sr: int
    tracks: dict[str, np.ndarray]   # one per target
    others: np.ndarray              # everything that is not a target

    @property
    def n_samples(self) -> int:
        return len(self.others)

    def remix(self, gains: dict[str, float] | None = None, others_gain: float = 0.0) -> np.ndarray:
        """Sum of tracks with a gain each (default 1.0); others default to removed (0.0)."""
        gains = gains or {}
        out = others_gain * self.others
        for name, x in self.tracks.items():
            out = out + gains.get(name, 1.0) * x
        return out.astype(np.float32)

    def export(self, out_dir: str | Path, n_samples: int | None = None) -> dict:
        """Write <name>.wav, others.wav, multitrack.wav and tracks.json; all exactly n_samples long."""
        out_dir = Path(out_dir)
        n = n_samples or self.n_samples
        names = list(self.tracks) + ["others"]
        arrays = [fit_length(x, n) for x in [*self.tracks.values(), self.others]]
        for name, x in zip(names, arrays):
            write_wav(out_dir / f"{name}.wav", x, self.sr)
        write_wav(out_dir / "multitrack.wav", np.stack(arrays, axis=1), self.sr)
        info = {"sr": self.sr, "n_samples": n, "tracks": list(self.tracks), "others": "others",
                "multitrack_channels": names}
        (out_dir / "tracks.json").write_text(json.dumps(info, indent=2))
        return info

    @classmethod
    def load(cls, out_dir: str | Path) -> "TrackSet":
        out_dir = Path(out_dir)
        info = json.loads((out_dir / "tracks.json").read_text())
        tracks = {n: read_wav(out_dir / f"{n}.wav")[0] for n in info["tracks"]}
        return cls(info["sr"], tracks, read_wav(out_dir / "others.wav")[0])


def extract_sequential(backend, audio: np.ndarray, sr: int, targets: list[Target]) -> TrackSet:
    """Target 1 from the mix, target 2 from the residual, ...; others = the last residual."""
    rest, tracks = audio, {}
    for t in targets:
        tracks[t.name], rest = backend.separate(rest, sr, t.prompt)
    return TrackSet(sr, tracks, rest)


def extract_parallel(backend, audio: np.ndarray, sr: int, targets: list[Target]) -> TrackSet:
    """Every target from the full mix; others = mix - sum(targets). Overlapping targets double count."""
    tracks = {t.name: backend.separate(audio, sr, t.prompt)[0] for t in targets}
    others = audio - np.sum(list(tracks.values()), axis=0) if tracks else audio.copy()
    return TrackSet(sr, tracks, others.astype(np.float32))


STRATEGIES = {"sequential": extract_sequential, "parallel": extract_parallel}
