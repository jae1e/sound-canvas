"""Qwen3-ASR-1.7B final engine (lazy load, kept resident)."""

from __future__ import annotations

import logging
import threading

import numpy as np

from ..langs import ISO_TO_QWEN, qwen_name_to_iso
from .base import FinalResult

log = logging.getLogger("fls.qwen3")

class Qwen3FinalEngine:
    name = "qwen3-asr-1.7b"
    MODEL_ID = "Qwen/Qwen3-ASR-1.7B"

    def __init__(self) -> None:
        self._model = None
        self._lock = threading.Lock()

    def _load(self):
        with self._lock:
            if self._model is None:
                import torch
                from qwen_asr import Qwen3ASRModel

                log.info("loading %s", self.MODEL_ID)
                self._model = Qwen3ASRModel.from_pretrained(
                    self.MODEL_ID,
                    dtype=torch.bfloat16,
                    device_map="cuda:0",
                    max_inference_batch_size=1,
                    max_new_tokens=512,
                )
                log.info("model loaded")
        return self._model

    def decode(self, audio: np.ndarray, sample_rate: int, context: str = "",
               language: str | None = None) -> FinalResult:
        assert sample_rate == 16000
        model = self._load()
        forced = ISO_TO_QWEN[language] if language else None
        res = model.transcribe(audio=(audio.astype(np.float32), 16000), context=context, language=forced)
        r = res[0]
        text = (r.text or "").strip()
        lang = qwen_name_to_iso(r.language or "") or (language or "")
        return FinalResult(text=text, language=lang, no_speech=not text)
