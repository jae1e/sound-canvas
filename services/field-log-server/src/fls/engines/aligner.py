"""Forced alignment: word timestamps for a known text (Qwen3-ForcedAligner-0.6B)."""

from __future__ import annotations

import logging
import threading
from typing import Protocol

import numpy as np

from ..langs import ISO_TO_QWEN

log = logging.getLogger("fls.aligner")


class Aligner(Protocol):
    name: str

    def align(self, audio: np.ndarray, text: str, language: str) -> list[dict]:
        """Return [{text, start_ms, end_ms}] for 16 kHz float audio; `language` is an ISO code."""


class Qwen3Aligner:
    name = "qwen3-forced-aligner-0.6b"
    MODEL_ID = "Qwen/Qwen3-ForcedAligner-0.6B"

    def __init__(self) -> None:
        self._model = None
        self._lock = threading.Lock()  # lazy load and one alignment at a time

    def _load(self):
        if self._model is None:
            import torch
            from qwen_asr import Qwen3ForcedAligner

            log.info("loading %s", self.MODEL_ID)
            self._model = Qwen3ForcedAligner.from_pretrained(
                self.MODEL_ID, dtype=torch.bfloat16, device_map="cuda:0")
            log.info("aligner loaded")
        return self._model

    def align(self, audio: np.ndarray, text: str, language: str) -> list[dict]:
        with self._lock:
            model = self._load()
            res = model.align(audio=(audio.astype(np.float32), 16000), text=text,
                              language=ISO_TO_QWEN[language])
        return [{"text": it.text, "start_ms": int(round(it.start_time * 1000)),
                 "end_ms": int(round(it.end_time * 1000))} for it in res[0].items]


class FakeAligner:
    """Deterministic: whitespace words spread evenly over the audio."""

    name = "fake-aligner"

    def __init__(self) -> None:
        self.calls: list[tuple[int, str, str]] = []

    def align(self, audio: np.ndarray, text: str, language: str) -> list[dict]:
        self.calls.append((len(audio), text, language))
        words = text.split()
        dur = int(len(audio) * 1000 / 16000)
        n = max(len(words), 1)
        return [{"text": w, "start_ms": dur * i // n, "end_ms": dur * (i + 1) // n}
                for i, w in enumerate(words)]


def pick_language(detected: str, memo_languages: list[str]) -> str | None:
    """Alignment language: Korean if ko was detected, else the first detected, else the memo's first."""
    codes = [c for c in (detected or "").split(",") if c]
    for c in (["ko"] if "ko" in codes else []) + codes + memo_languages[:1]:
        if c in ISO_TO_QWEN:
            return c
    return None


def safe_align(aligner: Aligner | None, audio: np.ndarray, text: str, detected: str,
               memo_languages: list[str]) -> list[dict] | None:
    """Words, or None when there is no aligner, no text, or the alignment fails (never raises)."""
    if aligner is None or not text.strip():
        return None
    lang = pick_language(detected, memo_languages)
    if lang is None:
        return None
    try:
        return aligner.align(audio, text, lang)
    except Exception as e:  # noqa: BLE001 - alignment must never fail a job
        log.warning("alignment failed lang=%s err=%s", lang, type(e).__name__)
        return None
