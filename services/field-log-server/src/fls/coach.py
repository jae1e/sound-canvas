"""Whole-take Voice Coach transcription using the Field Voice Log pipeline."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

from .audio import load_16k_mono
from .engines.aligner import Aligner
from .engines.base import FinalEngine
from .langs import DEFAULT_LANGUAGES
from .pipeline import transcribe_segment
from .vad import speech_spans
from .db import Database, now_ms
from .store import ObjectStore

MAX_CHUNK_SAMPLES = 30 * 16000


@dataclass
class CoachResult:
    text: str
    language: str
    words: list[dict]
    duration_ms: int
    no_speech: bool


def _chunks(audio: np.ndarray) -> list[tuple[int, int]]:
    """Group speech spans at VAD pauses, splitting continuous speech at 30 seconds."""
    spans = [(a * 16, b * 16) for a, b in speech_spans(audio)]
    if not spans:
        return []
    chunks: list[tuple[int, int]] = []
    start, end = spans[0]
    for next_start, next_end in spans[1:]:
        if next_end - start <= MAX_CHUNK_SAMPLES:
            end = next_end
            continue
        while end - start > MAX_CHUNK_SAMPLES:
            chunks.append((start, start + MAX_CHUNK_SAMPLES))
            start += MAX_CHUNK_SAMPLES
        if next_start - start > MAX_CHUNK_SAMPLES:
            chunks.append((start, end))
            start, end = next_start, next_end
        else:
            end = next_end
    while end - start > MAX_CHUNK_SAMPLES:
        chunks.append((start, start + MAX_CHUNK_SAMPLES))
        start += MAX_CHUNK_SAMPLES
    if end > start:
        chunks.append((start, end))
    return chunks


def transcribe_take(engine: FinalEngine, aligner: Aligner | None, path: Path, lang: str) -> CoachResult:
    audio = load_16k_mono(path)
    duration_ms = int(round(len(audio) * 1000 / 16000))
    chunks = _chunks(audio)
    langs = [lang] if lang in ("ko", "en") else list(DEFAULT_LANGUAGES)
    texts: list[str] = []
    words: list[dict] = []
    languages: list[str] = []
    any_speech = False
    for start, end in chunks:
        res = transcribe_segment(engine, aligner, audio[start:end], langs)
        if res.language:
            languages.extend(c for c in res.language.split(",") if c)
        if not res.no_speech and res.text:
            any_speech = True
            texts.append(res.text.strip())
            for word in res.words or []:
                words.append({"w": word.get("text", word.get("w", "")),
                              "start_ms": start * 1000 // 16000 + int(word["start_ms"]),
                              "end_ms": start * 1000 // 16000 + int(word["end_ms"])})
    language = ",".join(dict.fromkeys(languages))
    return CoachResult(" ".join(texts), language, words, duration_ms, not any_speech)


def delete_unreferenced_object(db: Database, store: ObjectStore, sha: str) -> None:
    """Remove a content object once no FVL or coach record points at it."""
    refs = db.one("SELECT 1 FROM segments WHERE object_sha256=? UNION ALL "
                  "SELECT 1 FROM photos WHERE object_sha256=? UNION ALL "
                  "SELECT 1 FROM coach_jobs WHERE object_sha256=? LIMIT 1", (sha, sha, sha))
    if refs is not None:
        return
    store.path(sha).unlink(missing_ok=True)
    db.execute("DELETE FROM object_owners WHERE sha256=?", (sha,))
    db.execute("DELETE FROM objects WHERE sha256=?", (sha,))


def purge_coach_jobs(db: Database, store: ObjectStore, now: int | None = None) -> int:
    """Purge coach takes after 30 days and release their object when it has no other owner."""
    cutoff = (now if now is not None else now_ms()) - 30 * 24 * 60 * 60 * 1000
    rows = db.query("SELECT job_id, object_sha256 FROM coach_jobs WHERE created_ms<=?", (cutoff,))
    if not rows:
        return 0
    with db.tx() as c:
        c.execute("DELETE FROM coach_jobs WHERE created_ms<=?", (cutoff,))
    for row in rows:
        delete_unreferenced_object(db, store, row["object_sha256"])
    return len(rows)
