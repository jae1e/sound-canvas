"""No-speech decisions: VAD gate and the stock-phrase guard (contract section 4, no_speech_reason).

Thresholds (tuned on the labelled set described in the README; see tests/test_nospeech.py):
- NO_VOICE_MS: under this much VAD speech the model is not called. Synthetic non-speech (pink noise at
  -60..-20 dBFS, clicks, taps, clipped bursts, fan rumble, handling noise) gave 0 ms; the shortest real
  utterances (TTS "네", 0.44 s) gave 444 ms.
- OUT_OF_LIST_NO_VOICE_MS: auto detection returned a language outside the memo's list; with less speech
  than this the forced re-decode (which invents a stock greeting) is skipped.
- Stock-phrase guard: applies only when the normalised output is in STOCK_PHRASES.
"""

from __future__ import annotations

import re
import unicodedata

NO_VOICE_MS = 250
OUT_OF_LIST_NO_VOICE_MS = 500

# Stock-phrase thresholds. The coordinator's starting point was 1200 ms; real short phrases measured here
# ("감사합니다" 730-760 ms, "Thank you" 540-640 ms, "네" 444 ms) must survive, so the plain duration rule
# is split: below STOCK_ABS_MIN_MS a blip cannot carry a phrase; up to STOCK_SHORT_MS the aligned words
# must cover STOCK_SHORT_COVERAGE of the speech (or alignment is missing).
STOCK_ABS_MIN_MS = 400
STOCK_SHORT_MS = 1200
STOCK_SHORT_COVERAGE = 0.6
STOCK_OUT_OF_LIST_MS = 2500
STOCK_MIN_COVERAGE = 0.3

# Normalised (lowercase, letters and digits only) phrases that ASR models invent on non-speech audio.
# Add new entries here as they show up in the logs.
STOCK_PHRASES = frozenset({
    # ko
    "감사합니다", "안녕하세요", "시청해주셔서감사합니다", "구독과좋아요", "네", "아", "음", "어", "예",
    # en
    "thankyou", "thanksforwatching", "you", "bye", "okay",
    # zh / ja
    "谢谢", "謝謝", "ありがとうございました",
})


def normalize_phrase(text: str) -> str:
    t = unicodedata.normalize("NFKC", text).lower()
    return "".join(ch for ch in t if unicodedata.category(ch)[0] in ("L", "N"))


def is_stock_phrase(text: str) -> bool:
    return normalize_phrase(text) in STOCK_PHRASES


def coverage(words: list[dict] | None, spans: list[tuple[int, int]]) -> float | None:
    """Fraction of the VAD speech time that aligned words overlap (None without words or speech)."""
    total = sum(b - a for a, b in spans)
    if not words or total <= 0:
        return None
    covered = 0
    for a, b in spans:
        iv = sorted((max(a, w["start_ms"]), min(b, w["end_ms"])) for w in words if w["end_ms"] > a and w["start_ms"] < b)
        cur = a
        for s, e in iv:
            s = max(s, cur)
            if e > s:
                covered += e - s
                cur = e
    return min(1.0, covered / total)


def stock_phrase_verdict(text: str, path: str, speech_ms: int | None, words: list[dict] | None,
                         spans: list[tuple[int, int]]) -> bool:
    """True when the output is a stock phrase that the audio does not support."""
    if not is_stock_phrase(text) or speech_ms is None:
        return False
    cov = coverage(words, spans)
    if speech_ms < STOCK_ABS_MIN_MS:
        return True
    if path.startswith("auto(") and speech_ms < STOCK_OUT_OF_LIST_MS:
        return True
    if speech_ms < STOCK_SHORT_MS and (cov is None or cov < STOCK_SHORT_COVERAGE):
        return True
    return cov is not None and cov < STOCK_MIN_COVERAGE


# Live draft: drop stock-phrase finals from very quiet utterances.
LIVE_STOCK_MAX_RMS_DBFS = -45.0
