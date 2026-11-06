"""Engine interfaces."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

import numpy as np


@dataclass
class FinalResult:
    text: str
    language: str  # ISO codes joined with ",", "" when unknown
    no_speech: bool
    confidence: int | None = None
    words: list[dict] | None = None
    no_speech_reason: str | None = None  # silent | no_voice | stock_phrase | echo
    speech_ms: int | None = None
    filtered_text: str | None = None  # suppressed output (stock_phrase or echo only)
    path: str = ""  # language-decision path, filled by langs.decode_with_policy


class FinalEngine(Protocol):
    name: str  # engine id reported in TranscriptSegment.engine

    def decode(self, audio: np.ndarray, sample_rate: int, context: str = "",
               language: str | None = None) -> FinalResult:
        """Decode one array. `language` is an ISO code to force, or None for auto detection."""



@dataclass
class LiveEvent:
    kind: str  # "partial" or "final"
    text: str
    utterance: int
    start_ms: int = 0
    end_ms: int = 0
    rms_dbfs: float | None = None  # raw-audio RMS of the utterance (finals), for the stock-phrase filter


class LiveStream(Protocol):
    def feed(self, pcm16: np.ndarray) -> list[LiveEvent]:
        """Feed int16 samples at 16 kHz; return events produced (blocking, CPU-bound)."""

    def finish(self) -> list[LiveEvent]:
        """Flush at end of stream."""

    def close(self) -> None:
        """Release engine resources (always called)."""


class StreamingEngine(Protocol):
    name: str
    available: bool

    def preload(self) -> None: ...

    def open_stream(self, language: str, condition: bool = True) -> LiveStream: ...
