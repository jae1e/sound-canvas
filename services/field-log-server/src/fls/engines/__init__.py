"""Pluggable ASR engines."""

from __future__ import annotations

from .base import FinalEngine, FinalResult, LiveEvent, LiveStream, StreamingEngine
from .fake import FakeFinalEngine, FakeStreamingEngine

__all__ = [
    "FinalEngine", "FinalResult", "LiveEvent", "LiveStream", "StreamingEngine",
    "FakeFinalEngine", "FakeStreamingEngine", "make_final_engine", "make_live_engine",
]


def make_final_engine(name: str) -> FinalEngine:
    if name == "fake":
        return FakeFinalEngine()
    if name == "qwen3":
        from .qwen3 import Qwen3FinalEngine

        return Qwen3FinalEngine()
    raise ValueError(f"unknown final engine: {name}")


def make_live_engine(name: str, models_dir) -> StreamingEngine | None:
    if name == "none":
        return None
    if name == "fake":
        return FakeStreamingEngine()
    if name == "nemotron":
        from .nemotron import NemotronStreamingEngine

        return NemotronStreamingEngine(models_dir)
    raise ValueError(f"unknown live engine: {name}")


def make_aligner(final_engine_name: str):
    if final_engine_name == "fake":
        from .aligner import FakeAligner

        return FakeAligner()
    from .aligner import Qwen3Aligner

    return Qwen3Aligner()
