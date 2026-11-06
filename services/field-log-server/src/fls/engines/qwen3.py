"""Qwen3-ASR-1.7B final engine (lazy load, kept resident)."""

from __future__ import annotations

import logging
import threading

import numpy as np

from .base import FinalResult

log = logging.getLogger("fls.qwen3")

LANG_CODES = {
    "korean": "ko", "english": "en", "japanese": "ja", "chinese": "zh", "cantonese": "yue",
    "german": "de", "french": "fr", "spanish": "es", "italian": "it", "portuguese": "pt",
    "russian": "ru", "arabic": "ar", "hindi": "hi", "thai": "th", "vietnamese": "vi",
    "indonesian": "id", "turkish": "tr",
}


def map_languages(name: str) -> str:
    codes = []
    for part in (name or "").split(","):
        p = part.strip().lower()
        if not p:
            continue
        codes.append(LANG_CODES.get(p, p[:3]))
    return ",".join(codes)


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

    def transcribe(self, audio: np.ndarray, sample_rate: int, context: str = "") -> FinalResult:
        assert sample_rate == 16000
        model = self._load()
        res = model.transcribe(audio=(audio.astype(np.float32), 16000), context=context, language=None)
        r = res[0]
        text = (r.text or "").strip()
        return FinalResult(text=text, language=map_languages(r.language or ""), no_speech=not text)
