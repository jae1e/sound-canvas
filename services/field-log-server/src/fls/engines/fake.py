"""Deterministic engines for tests."""

from __future__ import annotations

import numpy as np

from .base import FinalResult, LiveEvent

SR = 16000


class FakeFinalEngine:
    name = "fake-final"

    def decode(self, audio: np.ndarray, sample_rate: int, context: str = "",
               language: str | None = None) -> FinalResult:
        rms = float(np.sqrt(np.mean(np.square(audio)))) if audio.size else 0.0
        if rms < 1e-4:
            return FinalResult(text="", language="", no_speech=True)
        ms = int(len(audio) * 1000 / sample_rate)
        return FinalResult(text=f"fake transcript {ms}ms", language=language or "en", no_speech=False)


class _FakeStream:
    """One word per 500 ms of speech; an utterance ends after 800 ms of silence."""

    WORD_MS = 500
    SILENCE_MS = 800
    MAX_MS = 20000

    def __init__(self) -> None:
        self.pos = 0  # samples fed
        self.utt = 0
        self.utt_start = None  # sample index
        self.speech_ms = 0
        self.silence_ms = 0
        self.last_text = ""
        self.words = 0
        self.last_speech_end = 0

    def _final(self) -> LiveEvent:
        ev = LiveEvent("final", self._text(), self.utt, self.utt_start * 1000 // SR,
                       self.last_speech_end * 1000 // SR)
        self.utt += 1
        self.utt_start = None
        self.speech_ms = self.silence_ms = self.words = 0
        self.last_text = ""
        return ev

    def _text(self) -> str:
        return " ".join(f"word{i + 1}" for i in range(self.words))

    def feed(self, pcm16: np.ndarray) -> list[LiveEvent]:
        out: list[LiveEvent] = []
        n = len(pcm16)
        ms = n * 1000 // SR
        loud = n > 0 and float(np.abs(pcm16.astype(np.float32)).mean()) > 300
        if loud:
            if self.utt_start is None:
                self.utt_start = self.pos
            self.speech_ms += ms
            self.silence_ms = 0
            self.last_speech_end = self.pos + n
            self.words = self.speech_ms // self.WORD_MS
            text = self._text()
            if text and text != self.last_text:
                self.last_text = text
                out.append(LiveEvent("partial", text, self.utt))
        elif self.utt_start is not None:
            self.silence_ms += ms
            if self.silence_ms >= self.SILENCE_MS:
                self.pos += n
                out.append(self._final())
                return out
        self.pos += n
        if self.utt_start is not None and (self.pos - self.utt_start) * 1000 // SR >= self.MAX_MS:
            out.append(self._final())
        return out

    def close(self) -> None:
        pass

    def finish(self) -> list[LiveEvent]:
        if self.utt_start is not None and self.words > 0:
            return [self._final()]
        return []


class FakeStreamingEngine:
    name = "fake-stream"
    available = True

    def preload(self) -> None:
        pass

    def __init__(self) -> None:
        self.opened: list[tuple[str, bool]] = []  # (language, condition) per stream, for tests

    def open_stream(self, language: str, condition: bool = True) -> _FakeStream:
        self.opened.append((language, condition))
        return _FakeStream()
