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
                 predict_spans: bool = False, reranking_candidates: int = 1,
                 autocast: str | None = None, bf16_weights: bool = False):
        if "/" not in model:  # allow short names: large, base-tv, ...
            model = f"facebook/sam-audio-{model}"
        self.model_name = model
        self.device = device
        self.predict_spans = predict_spans
        self.reranking_candidates = reranking_candidates
        self.autocast = autocast  # None, "bf16" or "fp16": mixed precision to cut VRAM
        # Store the large sub-networks (DiT transformer, vision encoder) in bf16. Needs autocast.
        self.bf16_weights = bf16_weights
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
            from huggingface_hub import snapshot_download

            # sam_audio's BaseModel._from_pretrained still requires the `proxies` and
            # `resume_download` kwargs that huggingface_hub >= 1.0 no longer passes through
            # ModelHubMixin.from_pretrained. Download the snapshot ourselves and call the
            # loader directly with a local directory, which skips its own snapshot_download.
            local_dir = snapshot_download(self.model_name)
            # Rankers are only used when reranking_candidates > 1. The visual ranker is
            # ImageBind (non-commercial licence, separate install), so it is always off.
            # The text ranker (LAION-CLAP + facebook/sam-audio-judge) loads only on request.
            overrides = {"visual_ranker": None}
            if self.reranking_candidates <= 1:
                overrides["text_ranker"] = None
            if not self.predict_spans:
                overrides["span_predictor"] = None  # saves RAM/VRAM when spans are not predicted
            model = self._build_model(SAMAudio, local_dir, overrides)
            self._processor = SAMAudioProcessor.from_pretrained(self.model_name)
        except Exception as e:  # gated repo (401/403), no network, bad name, ...
            raise RuntimeError(ACCESS_HELP.format(name=self.model_name, err=e)) from e
        if self.bf16_weights:
            for name in ("transformer", "vision_encoder"):
                getattr(model, name).to(torch.bfloat16)
            if not self.autocast:
                self.autocast = "bf16"
        self._model = model.eval()
        self._torch = torch

    def _build_model(self, model_cls, local_dir: str, overrides: dict):
        """Memory-light replacement for sam_audio's BaseModel._from_pretrained.

        Upstream builds the model on the CPU in fp32 and then torch.load()s a full CPU copy of the
        checkpoint, which roughly doubles host RAM (about 14.6 GB RSS for the small model on
        2026-11-04, which triggered the OOM killer). Here the modules are created directly on the
        target device and the checkpoint is memory-mapped, so its pages are file-backed and
        reclaimable instead of anonymous RSS.
        """
        import json
        import os

        import torch

        with open(os.path.join(local_dir, "config.json")) as f:
            config = json.load(f)
        for key, value in overrides.items():
            if key in config:
                config[key] = value
        cfg = model_cls.config_cls(**config)
        with torch.device(self.device):
            model = model_cls(cfg)
        state_dict = torch.load(os.path.join(local_dir, "checkpoint.pt"), mmap=True,
                                weights_only=True, map_location="cpu")
        model.load_state_dict(state_dict, strict=True)  # upstream override skips HF-loaded parts
        del state_dict
        return model

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
        import contextlib
        amp = contextlib.nullcontext()
        if self.autocast:
            dtype = {"bf16": torch.bfloat16, "fp16": torch.float16}[self.autocast]
            amp = torch.autocast(device_type="cuda", dtype=dtype)
        with torch.inference_mode(), amp:
            result = self._model.separate(batch, predict_spans=self.predict_spans,
                                          reranking_candidates=self.reranking_candidates)
        out = []
        for t in (result.target, result.residual):
            x = resample(self._to_numpy(t), model_sr, sr)
            out.append(fit_length(x, len(audio)).astype(np.float32))
        return out[0], out[1]
