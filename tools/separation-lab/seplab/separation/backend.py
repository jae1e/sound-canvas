from __future__ import annotations

from typing import Protocol

import numpy as np
from scipy.signal import butter, sosfiltfilt

from ..audio_io import read_wav
from ..mix import load_manifest
from .prompt import Prompt


class Backend(Protocol):
    name: str

    def separate(self, audio: np.ndarray, sr: int, prompt: Prompt) -> tuple[np.ndarray, np.ndarray]:
        """Return (target, residual), both with the same length as `audio`."""
        ...


class FakeBackend:
    """Oracle for tests: returns a known ground-truth stem as the target.

    The stem is chosen by prompt.description (matched against stem names). The stems must have
    the same length as the audio, so use it on whole files, not chunks. Residual = audio - target,
    so target + residual is exact by construction.
    """

    name = "fake"

    def __init__(self, stems: dict[str, np.ndarray]):
        self.stems = stems

    @classmethod
    def from_manifest(cls, manifest_path) -> "FakeBackend":
        m = load_manifest(manifest_path)
        stems: dict[str, np.ndarray] = {}
        for t in m["targets"]:
            x, _ = read_wav(f"{m['_dir']}/{t['path']}")
            stems[t["name"]] = x
            stems.setdefault(t.get("description", t["name"]), x)
        return cls(stems)

    def separate(self, audio, sr, prompt):
        key = prompt.description
        if key not in self.stems:
            if len(self.stems) == 1:
                key = next(iter(self.stems))
            else:
                raise KeyError(f"FakeBackend has no stem for {prompt.description!r}; known: {sorted(self.stems)}")
        stem = self.stems[key]
        if len(stem) != len(audio):
            raise ValueError("FakeBackend stems must match the audio length (do not use it with chunking)")
        return stem.astype(np.float32), (audio - stem).astype(np.float32)


class FilterBackend:
    """Chunk-safe fake: description "low" -> low-pass target, anything else -> high-pass target."""

    name = "fake-filter"

    def __init__(self, cutoff_hz: float = 1000.0):
        self.cutoff_hz = cutoff_hz

    def separate(self, audio, sr, prompt):
        btype = "lowpass" if prompt.description == "low" else "highpass"
        sos = butter(4, self.cutoff_hz, btype=btype, fs=sr, output="sos")
        target = sosfiltfilt(sos, audio).astype(np.float32) if len(audio) > 30 else np.zeros_like(audio)
        return target, (audio - target).astype(np.float32)
