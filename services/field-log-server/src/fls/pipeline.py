"""The final-transcription pipeline: gates, ASR with the language policy, alignment, stock-phrase guard."""

from __future__ import annotations

import logging

import numpy as np

from .conditioning import condition
from .engines.aligner import Aligner, safe_align
from .engines.base import FinalEngine, FinalResult
from .gate import silence_reason
from .langs import decode_with_policy
from .nospeech import NO_VOICE_MS, stock_phrase_verdict
from .vad import speech_spans

log = logging.getLogger("fls.pipeline")


def vad_analysis(raw: np.ndarray, cond: np.ndarray) -> tuple[int, list[tuple[int, int]]]:
    """VAD on the raw audio, and on the conditioned copy when raw finds little; the larger result wins
    (on the labelled set both separated speech from non-speech; conditioned helps very quiet speech)."""
    spans = speech_spans(raw)
    ms = sum(b - a for a, b in spans)
    if ms < 1500:
        spans_c = speech_spans(cond)
        ms_c = sum(b - a for a, b in spans_c)
        if ms_c > ms:
            return ms_c, spans_c
    return ms, spans


def gate_reason(raw: np.ndarray, peak_x100: int | None) -> FinalResult | None:
    g = silence_reason(raw, peak_x100)
    return FinalResult(text="", language="", no_speech=True, no_speech_reason="silent", path=g) if g else None


def transcribe_segment(engine: FinalEngine, aligner: Aligner | None, raw: np.ndarray, langs: list[str],
                       peak_x100: int | None = None, force: bool = False) -> FinalResult:
    if not force:
        gated = gate_reason(raw, peak_x100)
        if gated:
            return gated
    cond = condition(raw)
    sm, spans = vad_analysis(raw, cond)
    if not force and sm < NO_VOICE_MS:
        return FinalResult(text="", language="", no_speech=True, no_speech_reason="no_voice",
                           speech_ms=sm, path="gated:no-voice")
    res = decode_with_policy(engine, cond, langs, speech_ms=None if force else sm)
    res.speech_ms = sm
    if not res.no_speech:  # word timing never fails the job
        res.words = safe_align(aligner, cond, res.text, res.language, langs)
        if not force and stock_phrase_verdict(res.text, res.path, sm, res.words, spans):
            log.warning("stock-phrase guard: output suppressed speech_ms=%d path=%s", sm, res.path)
            return FinalResult(text="", language=res.language, no_speech=True, no_speech_reason="stock_phrase",
                               filtered_text=res.text, speech_ms=sm, path=res.path)
    if force:
        res.path = "forced-by-user"
    return res
