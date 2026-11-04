"""SAM Audio backend (Meta, gated checkpoints). Imports lazily; never used in tests.

API as of the upstream README (checked 2026-11-04):
  from sam_audio import SAMAudio, SAMAudioProcessor
  model = SAMAudio.from_pretrained("facebook/sam-audio-large"); processor = SAMAudioProcessor.from_pretrained(...)
  batch = processor(audios=[path_or_tensor], descriptions=[str], anchors=[[["+", s, e]]], masked_videos=[...]).to("cuda")
  result = model.separate(batch, predict_spans=bool, reranking_candidates=int)  # result.target, result.residual
  processor.audio_sampling_rate (48 kHz upstream)
"""
from __future__ import annotations

import numpy as np

from ..audio_io import fit_length, resample
from .prompt import Prompt

MODELS = [f"facebook/sam-audio-{size}{suffix}" for size in ("small", "base", "large") for suffix in ("", "-tv")]

ACCESS_HELP = (
    "Could not load SAM Audio checkpoint {name!r}: {err}\n"
    "The checkpoints are gated. Request access on the Hugging Face model page, then run `hf auth login` "
    "in your own terminal. See README.md. For tests use --backend fake."
)


class SamAudioBackend:
    def __init__(self, model: str = "facebook/sam-audio-large", device: str = "cuda",
                 predict_spans: bool = False, reranking_candidates: int = 1):
        if "/" not in model:  # allow short names: large, base-tv, ...
            model = f"facebook/sam-audio-{model}"
        self.model_name = model
        self.device = device
        self.predict_spans = predict_spans
        self.reranking_candidates = reranking_candidates
        self.name = f"sam:{model.split('/')[-1]}"
        self._model = None
        self._processor = None
        self._torch = None

    def _load(self) -> None:
        if self._model is not None:
            return
        try:
            import torch
            from sam_audio import SAMAudio, SAMAudioProcessor  # TODO: confirm names on the first real run
        except ImportError as e:
            raise RuntimeError(f"SAM Audio is not installed ({e}). Run `uv sync --extra sam`.") from e
        try:
            model = SAMAudio.from_pretrained(self.model_name)
            self._processor = SAMAudioProcessor.from_pretrained(self.model_name)
        except Exception as e:  # gated repo (401/403), no network, bad name, ...
            raise RuntimeError(ACCESS_HELP.format(name=self.model_name, err=e)) from e
        self._model = model.eval().to(self.device)
        self._torch = torch

    def reset_stats(self) -> None:
        if self._torch and self.device.startswith("cuda"):
            self._torch.cuda.reset_peak_memory_stats()

    def peak_gpu_mb(self) -> float | None:
        if self._torch and self.device.startswith("cuda"):
            return self._torch.cuda.max_memory_allocated() / 2**20
        return None

    @staticmethod
    def _to_numpy(t) -> np.ndarray:
        if isinstance(t, (list, tuple)):  # defensive: one tensor per batch item
            t = t[0]
        return t.detach().float().cpu().numpy().reshape(-1)  # TODO: confirm output shape (batch, ch, T) vs (ch, T)

    def separate(self, audio: np.ndarray, sr: int, prompt: Prompt) -> tuple[np.ndarray, np.ndarray]:
        self._load()
        torch, proc = self._torch, self._processor
        model_sr = int(proc.audio_sampling_rate)
        wav = torch.from_numpy(resample(audio, sr, model_sr)).unsqueeze(0)  # (1, T); processor averages channels
        kwargs = {"audios": [wav], "descriptions": [prompt.description]}
        if prompt.spans:
            kwargs["anchors"] = [[[s, a, b] for s, a, b in prompt.spans]]
        if prompt.masked_video is not None:
            # TODO: build with processor.mask_videos([frames], [mask]) and pass the video as `audios`.
            kwargs["masked_videos"] = [prompt.masked_video]
        batch = proc(**kwargs).to(self.device)
        with torch.inference_mode():
            result = self._model.separate(batch, predict_spans=self.predict_spans,
                                          reranking_candidates=self.reranking_candidates)
        out = []
        for t in (result.target, result.residual):
            x = resample(self._to_numpy(t), model_sr, sr)
            out.append(fit_length(x, len(audio)).astype(np.float32))
        return out[0], out[1]
