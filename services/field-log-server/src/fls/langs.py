"""Language lists and the final-engine language policy (contract section 7)."""

from __future__ import annotations

from dataclasses import replace
from typing import Any

import numpy as np

from .engines.base import FinalEngine, FinalResult

DEFAULT_LANGUAGES = ["ko", "en"]

# ISO 639-1 (or 639-3 where there is no 2-letter code) -> Qwen3-ASR language name.
# The names are exactly the entries of qwen_asr.inference.utils.SUPPORTED_LANGUAGES.
ISO_TO_QWEN = {
    "zh": "Chinese", "en": "English", "yue": "Cantonese", "ar": "Arabic", "de": "German",
    "fr": "French", "es": "Spanish", "pt": "Portuguese", "id": "Indonesian", "it": "Italian",
    "ko": "Korean", "ru": "Russian", "th": "Thai", "vi": "Vietnamese", "ja": "Japanese",
    "tr": "Turkish", "hi": "Hindi", "ms": "Malay", "nl": "Dutch", "sv": "Swedish",
    "da": "Danish", "fi": "Finnish", "pl": "Polish", "cs": "Czech", "fil": "Filipino",
    "fa": "Persian", "el": "Greek", "ro": "Romanian", "hu": "Hungarian", "mk": "Macedonian",
}
QWEN_TO_ISO = {v.lower(): k for k, v in ISO_TO_QWEN.items()}


def normalize_languages(value: Any) -> list[str]:
    """Ordered, de-duplicated list of supported ISO codes; the default when empty or invalid."""
    out: list[str] = []
    if isinstance(value, list):
        for v in value:
            if isinstance(v, str) and v.lower() in ISO_TO_QWEN and v.lower() not in out:
                out.append(v.lower())
    return out or list(DEFAULT_LANGUAGES)


def qwen_name_to_iso(name: str) -> str:
    codes = [QWEN_TO_ISO.get(p.strip().lower(), p.strip().lower()[:3]) for p in (name or "").split(",")]
    return ",".join(c for c in codes if c)


def context_hint(languages: list[str]) -> str:
    names = [ISO_TO_QWEN[c] for c in languages]
    return "Languages in priority order: " + ", ".join(names) + "."


def decode_with_policy(engine: FinalEngine, audio: np.ndarray, languages: list[str],
                       sr: int = 16000) -> FinalResult:
    """One language: forced. Several: auto with a hint, re-decoded forced to the first if the
    detected languages are not all in the list. `path` records what happened."""
    first = languages[0]
    if len(languages) == 1:
        return replace(engine.decode(audio, sr, "", first), path=f"forced:{first}")
    res = engine.decode(audio, sr, context_hint(languages), None)
    detected = [c for c in res.language.split(",") if c]
    if res.no_speech or all(c in languages for c in detected):
        return replace(res, path="auto")
    again = engine.decode(audio, sr, "", first)
    return replace(again, path=f"auto({res.language})->forced:{first}")
