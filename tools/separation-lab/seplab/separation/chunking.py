from __future__ import annotations

import numpy as np

from .prompt import Prompt


class ChunkedBackend:
    """Run any backend on overlapping chunks and join them with linear crossfades.

    TODO (spike question): nothing guarantees that a target keeps its identity across chunks.
    A text prompt may pick a different voice in each chunk; span prompts are re-based per chunk.
    """

    def __init__(self, backend, chunk_s: float = 30.0, overlap_s: float = 2.0):
        if chunk_s <= 2 * overlap_s:
            raise ValueError("chunk_s must be larger than 2 * overlap_s")
        self.backend, self.chunk_s, self.overlap_s = backend, chunk_s, overlap_s
        self.name = f"chunked-{backend.name}"

    def __getattr__(self, item):  # forward stats helpers (peak_gpu_mb, ...) to the wrapped backend
        return getattr(self.backend, item)

    def _chunk_prompt(self, prompt: Prompt, a: int, b: int, sr: int) -> Prompt | None:
        t0, t1 = a / sr, b / sr
        spans = [(s, max(x, t0) - t0, min(y, t1) - t0) for s, x, y in prompt.spans if y > t0 and x < t1]
        if prompt.spans and not any(s == "+" for s, _, _ in spans) and not prompt.description:
            return None  # span-only prompt with no positive span in this chunk: nothing to extract
        return Prompt(prompt.description, spans, prompt.masked_video)

    def separate(self, audio, sr, prompt):
        n = len(audio)
        size, ov = int(self.chunk_s * sr), int(self.overlap_s * sr)
        if n <= size:
            return self.backend.separate(audio, sr, prompt)
        target, residual = np.zeros(n, np.float32), np.zeros(n, np.float32)
        start = 0
        while True:
            end = min(start + size, n)
            chunk_prompt = self._chunk_prompt(prompt, start, end, sr)
            seg = audio[start:end]
            if chunk_prompt is None:
                t, r = np.zeros_like(seg), seg
            else:
                t, r = self.backend.separate(seg, sr, chunk_prompt)
            w = np.ones(end - start, np.float32)
            if start > 0:
                w[:ov] = np.linspace(0, 1, ov, endpoint=False, dtype=np.float32)
            if end < n:
                w[-ov:] = np.minimum(w[-ov:], np.linspace(1, 0, ov, endpoint=False, dtype=np.float32))
            target[start:end] += w * t
            residual[start:end] += w * r
            if end == n:
                return target, residual
            start = end - ov
