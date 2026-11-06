"""Nemotron 3.5 ASR Streaming 0.6B (sherpa-onnx int8, 160 ms chunks) live engine.

Model notes (verified against the extracted tarball and sherpa-onnx 2.0.1):
- Loaded with OnlineRecognizer.from_transducer; no model_type is needed.
- Language is a per-stream option: stream.set_option("language", "en" | "ko" | "auto").
- sherpa's get_result() drops word spaces for Korean, so the text is rebuilt from tokens
  (the model emits " " tokens). Tag tokens like "<ko-KR>" are stripped.
"""

from __future__ import annotations

import logging
import queue
import re
import threading
from pathlib import Path

import numpy as np

from .base import LiveEvent

log = logging.getLogger("fls.nemotron")

MODEL_DIR_NAME = "sherpa-onnx-nemotron-3.5-asr-streaming-0.6b-160ms-int8-2026-06-11"
MODEL_URL = (
    "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/"
    + MODEL_DIR_NAME + ".tar.bz2"
)
REQUIRED = ("tokens.txt", "encoder.int8.onnx", "decoder.int8.onnx", "joiner.int8.onnx")
TAG = re.compile(r"<[^<>\s]+>")
SR = 16000


def model_dir(models: Path) -> Path:
    return models / MODEL_DIR_NAME


def model_ready(models: Path) -> bool:
    d = model_dir(models)
    return all((d / f).is_file() for f in REQUIRED)


def tokens_to_text(tokens: list[str]) -> str:
    text = "".join(t for t in tokens if not TAG.fullmatch(t.strip()))
    return re.sub(r"\s+", " ", text).strip()


class _Stream:
    def __init__(self, engine: "NemotronStreamingEngine", rec, language: str):
        self.engine, self.rec = engine, rec
        self.s = rec.create_stream()
        self.s.set_option("language", language)
        self.pos = 0  # samples fed
        self.utt = 0
        self.utt_base = 0  # sample position of the last reset
        self.last_text = ""
        self.closed = False

    def _times(self) -> tuple[int, int]:
        try:
            ts = list(self.rec.timestamps(self.s))
        except Exception:  # noqa: BLE001
            ts = []
        base = self.utt_base * 1000 // SR
        if ts:
            return base + int(ts[0] * 1000), base + int(ts[-1] * 1000)
        return base, self.pos * 1000 // SR

    def _drain(self, final: bool) -> list[LiveEvent]:
        out: list[LiveEvent] = []
        while self.rec.is_ready(self.s):
            self.rec.decode_stream(self.s)
        text = tokens_to_text(self.rec.tokens(self.s))
        endpoint = final or self.rec.is_endpoint(self.s)
        if endpoint:
            if text:
                a, b = self._times()
                out.append(LiveEvent("final", text, self.utt, a, b))
                self.utt += 1
            self.last_text = ""
            self.rec.reset(self.s)
            self.utt_base = self.pos
        elif text and text != self.last_text:
            self.last_text = text
            out.append(LiveEvent("partial", text, self.utt))
        return out

    def feed(self, pcm16: np.ndarray) -> list[LiveEvent]:
        x = pcm16.astype(np.float32) / 32768.0
        self.pos += len(x)
        self.s.accept_waveform(SR, x)
        return self._drain(final=False)

    def finish(self) -> list[LiveEvent]:
        # Pad with silence so the last tokens are flushed, then close the input.
        self.s.accept_waveform(SR, np.zeros(SR // 2, dtype=np.float32))
        self.s.input_finished()
        return self._drain(final=True)

    def close(self) -> None:
        if not self.closed:
            self.closed = True
            self.engine._release(self.rec)


class NemotronStreamingEngine:
    name = "nemotron-3.5-asr-streaming-0.6b-160ms-int8"

    def __init__(self, models: Path, slots: int = 2, num_threads: int = 2):
        self.models = models
        self.num_threads = num_threads
        self._pool: "queue.Queue" = queue.Queue()
        self._slots = slots
        self._loaded = False
        self._lock = threading.Lock()

    @property
    def available(self) -> bool:
        return model_ready(self.models)

    def preload(self) -> None:
        """Create one recognizer per slot (separate recognizers, nothing shared across streams)."""
        with self._lock:
            if self._loaded or not self.available:
                return
            import sherpa_onnx as so

            d = model_dir(self.models)
            for _ in range(self._slots):
                self._pool.put(so.OnlineRecognizer.from_transducer(
                    tokens=str(d / "tokens.txt"),
                    encoder=str(d / "encoder.int8.onnx"),
                    decoder=str(d / "decoder.int8.onnx"),
                    joiner=str(d / "joiner.int8.onnx"),
                    num_threads=self.num_threads,
                    enable_endpoint_detection=True,
                    rule1_min_trailing_silence=0.8,
                    rule2_min_trailing_silence=0.8,
                    rule3_min_utterance_length=20.0,
                ))
            self._loaded = True
            log.info("nemotron recognizers loaded slots=%d", self._slots)

    def open_stream(self, language: str) -> _Stream:
        self.preload()
        try:
            rec = self._pool.get_nowait()
        except queue.Empty:
            raise RuntimeError("no free streaming slot") from None
        try:
            return _Stream(self, rec, language if language in ("ko", "en") else "auto")
        except BaseException:
            self._pool.put(rec)
            raise

    def _release(self, rec) -> None:
        self._pool.put(rec)
