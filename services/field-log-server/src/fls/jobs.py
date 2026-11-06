"""Persisted transcription queue with one worker thread (one job at a time).

Final jobs (table `jobs`) always run before comparison jobs (rows of `alt_transcripts`
with status 'queued'), so a dashboard comparison never delays a real transcript.
"""

from __future__ import annotations

import json
import logging
import threading
import time
from typing import Callable

import numpy as np

from .audio import load_16k_mono
from .canon import canonical
from .conditioning import condition
from .config import MAX_JOB_RETRIES
from .db import Database, now_ms
from .engines.aligner import Aligner, safe_align
from .engines.base import FinalEngine, StreamingEngine
from .engines.base import FinalResult
from .gate import silence_reason
from .nospeech import NO_VOICE_MS
from .pipeline import gate_reason, transcribe_segment, vad_analysis
from .langs import (DEFAULT_LANGUAGES, ISO_TO_QWEN, decode_with_policy, guarded_decode,
                    normalize_languages)
from .store import ObjectStore

log = logging.getLogger("fls.jobs")

# Engine slots for comparison variants. A Whisper large-v3 (faster-whisper) engine can be added here
# later as ("whisper-large-v3", ...); it is intentionally not downloaded or wired yet.
FUTURE_ENGINE_SLOTS = ("whisper-large-v3",)


def variant_list(languages: list[str]) -> list[tuple[str, str]]:
    return [
        ("qwen3", "raw"),
        ("qwen3", "conditioned"),
        ("qwen3", f"forced-{languages[0]}"),
        ("nemotron-replay", "conditioned"),
        ("nemotron-replay", "raw"),
    ]


def uses_raw_audio(engine: str, variant: str) -> bool:
    """True when this variant's text was produced from the raw (unconditioned) audio."""
    return variant == "raw"


def replay_stream(live: StreamingEngine, audio: np.ndarray, language: str,
                  condition_input: bool) -> tuple[str, list[dict]]:
    """Feed stored audio through a fresh streaming recognizer (as fast as it decodes).

    Returns the joined final text and the utterance spans [{text, start_ms, end_ms}]."""
    pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2")
    pcm = np.concatenate([pcm, np.zeros(8000, dtype="<i2")])  # let trailing tokens flush
    stream = live.open_stream(language, condition_input)
    finals = []
    try:
        for i in range(0, len(pcm), 1600):
            finals += [e for e in stream.feed(pcm[i:i + 1600]) if e.kind == "final"]
        finals += [e for e in stream.finish() if e.kind == "final"]
    finally:
        stream.close()
    finals = [e for e in finals if e.text]
    return " ".join(e.text for e in finals), [
        {"text": e.text, "start_ms": e.start_ms, "end_ms": e.end_ms} for e in finals]


class Worker:
    def __init__(self, db: Database, store: ObjectStore, engine: FinalEngine,
                 live_engine: StreamingEngine | None = None,
                 aligner: Aligner | None = None,
                 on_change: Callable[[], None] | None = None):
        self.db, self.store, self.engine, self.live = db, store, engine, live_engine
        self.aligner = aligner
        self.on_change = on_change or (lambda: None)
        self._wake = threading.Event()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        t = now_ms()
        with self.db.tx() as c:
            c.execute("UPDATE jobs SET status='queued', updated_server_ms=? WHERE status='running'", (t,))
            c.execute("UPDATE transcripts SET status='queued', updated_server_ms=? WHERE status='running'", (t,))
            c.execute("UPDATE alt_transcripts SET status='queued', updated_server_ms=? WHERE status='running'", (t,))
        self._thread = threading.Thread(target=self._run, name="fls-worker", daemon=True)
        self._thread.start()
        self._wake.set()

    def stop(self) -> None:
        self._stop.set()
        self._wake.set()
        if self._thread:
            self._thread.join(timeout=30)

    def notify(self) -> None:
        self._wake.set()

    # ------------------------------------------------------------------ claiming
    def _claim(self):
        with self.db.tx() as c:
            job = c.execute("SELECT * FROM jobs WHERE status='queued' ORDER BY id LIMIT 1").fetchone()
            if job is not None:
                t = now_ms()
                c.execute("UPDATE jobs SET status='running', attempts=attempts+1, updated_server_ms=? WHERE id=?",
                          (t, job["id"]))
                c.execute("UPDATE transcripts SET status='running', updated_server_ms=? "
                          "WHERE device_id=? AND segment_id=?", (t, job["device_id"], job["segment_id"]))
                return "final", job
            alt = c.execute("SELECT * FROM alt_transcripts WHERE status='queued' "
                            "ORDER BY created_server_ms, rowid LIMIT 1").fetchone()
            if alt is not None:
                c.execute("UPDATE alt_transcripts SET status='running', attempts=attempts+1, updated_server_ms=? "
                          "WHERE device_id=? AND segment_id=? AND engine=? AND variant=?",
                          (now_ms(), alt["device_id"], alt["segment_id"], alt["engine"], alt["variant"]))
                return "alt", alt
        return None, None

    def _run(self) -> None:
        while not self._stop.is_set():
            kind, job = self._claim()
            if job is None:
                self._wake.wait(timeout=5)
                self._wake.clear()
                continue
            self.on_change()
            try:
                (self._process if kind == "final" else self._process_alt)(job)
            finally:
                self.on_change()

    def _languages(self, dev: str, segment_id: str) -> list[str]:
        row = self.db.one(
            "SELECT m.languages FROM segments s LEFT JOIN memos m ON m.device_id=s.device_id "
            "AND m.memo_id=s.memo_id WHERE s.device_id=? AND s.segment_id=?", (dev, segment_id))
        try:
            return normalize_languages(json.loads(row["languages"])) if row and row["languages"] else list(DEFAULT_LANGUAGES)
        except ValueError:
            return list(DEFAULT_LANGUAGES)

    def _peak_x100(self, dev: str, segment_id: str) -> int | None:
        row = self.db.one("SELECT peak_dbfs_x100 FROM segments WHERE device_id=? AND segment_id=?", (dev, segment_id))
        return row["peak_dbfs_x100"] if row else None

    # ------------------------------------------------------------------ final jobs
    def _process(self, job) -> None:
        dev, seg, sha = job["device_id"], job["segment_id"], job["object_sha256"]
        t0 = time.monotonic()
        try:
            raw = load_16k_mono(self.store.path(sha))
            dur = len(raw) / 16000
            langs = self._languages(dev, seg)
            res = transcribe_segment(self.engine, self.aligner, raw, langs, self._peak_x100(dev, seg),
                                     force=bool(job["force"]))
            proc = time.monotonic() - t0
            rtf = round(proc / dur, 4) if dur > 0 else None
            t = now_ms()
            with self.db.tx() as c:
                c.execute(
                    "UPDATE transcripts SET status='done', engine=?, text=?, language=?, no_speech=?, "
                    "confidence=?, words=?, rtf=?, detect_path=?, no_speech_reason=?, speech_ms=?, filtered_text=?, "
                    "error=NULL, updated_server_ms=? WHERE device_id=? AND segment_id=?",
                    (self.engine.name, res.text, res.language, 1 if res.no_speech else 0,
                     res.confidence, canonical(res.words) if res.words is not None else None,
                     None if rtf is None else str(rtf), res.path, res.no_speech_reason, res.speech_ms,
                     res.filtered_text, t, dev, seg),
                )
                c.execute("UPDATE jobs SET status='done', error=NULL, updated_server_ms=? "
                          "WHERE id=? AND status='running'", (t, job["id"]))
            log.info("job done segment=%s audio_s=%.2f proc_s=%.2f rtf=%s path=%s", seg, dur, proc, rtf, res.path)
        except Exception as e:  # noqa: BLE001 - any engine failure goes through the retry path
            msg = f"{type(e).__name__}: {str(e)[:200]}"
            t = now_ms()
            # `job` was read before the attempt counter increment, so attempts+1 is this attempt.
            final = (job["attempts"] + 1) > MAX_JOB_RETRIES
            with self.db.tx() as c:
                if final:
                    c.execute("UPDATE jobs SET status='failed', error=?, updated_server_ms=? "
                              "WHERE id=? AND status='running'", (msg, t, job["id"]))
                    c.execute("UPDATE transcripts SET status='failed', engine=?, error=?, "
                              "updated_server_ms=? WHERE device_id=? AND segment_id=?",
                              (self.engine.name, msg, t, dev, seg))
                else:
                    c.execute("UPDATE jobs SET status='queued', error=?, updated_server_ms=? "
                              "WHERE id=? AND status='running'", (msg, t, job["id"]))
                    c.execute("UPDATE transcripts SET status='queued', updated_server_ms=? "
                              "WHERE device_id=? AND segment_id=?", (t, dev, seg))
            log.warning("job failed segment=%s attempt=%d final=%s err=%s", seg, job["attempts"] + 1,
                        final, msg)

    # ------------------------------------------------------------------ comparison jobs
    def _process_alt(self, row) -> None:
        dev, seg, engine, variant = row["device_id"], row["segment_id"], row["engine"], row["variant"]
        t0 = time.monotonic()
        try:
            srow = self.db.one("SELECT object_sha256 FROM segments WHERE device_id=? AND segment_id=?", (dev, seg))
            if srow is None:
                raise RuntimeError("segment not found")
            raw = load_16k_mono(self.store.path(srow["object_sha256"]))
            dur = len(raw) / 16000
            langs = self._languages(dev, seg)
            lang, path = "", ""
            words, kind = None, "words"
            used = raw if uses_raw_audio(engine, variant) else condition(raw)
            gated = silence_reason(raw, self._peak_x100(dev, seg))
            sm = None
            if not gated:
                sm, _ = vad_analysis(raw, condition(raw))
                if sm < NO_VOICE_MS:
                    gated = "gated:no-voice"
            if gated:
                text, lang, path = "", "", gated
            elif engine == "qwen3" and variant in ("raw", "conditioned"):
                res = decode_with_policy(self.engine, used, langs, speech_ms=sm)
                text, lang, path = res.text, res.language, res.path
            elif engine == "qwen3" and variant.startswith("forced-"):
                iso = variant[len("forced-"):]
                if iso not in ISO_TO_QWEN:
                    raise ValueError("unsupported language")
                res = guarded_decode(self.engine, used, 16000, "", iso)
                text, lang, path = res.text, res.language, f"forced:{iso}"
            elif engine == "nemotron-replay":
                if self.live is None or not self.live.available:
                    raise RuntimeError("live engine unavailable")
                # One language: force it. Several: automatic mode (forcing the first gives an empty
                # draft for speech in another language of the list).
                stream_lang = langs[0] if len(langs) == 1 else "auto"
                text, spans = replay_stream(self.live, raw, stream_lang, variant == "conditioned")
                lang, path = stream_lang, f"stream:{stream_lang}"
                words, kind = spans, "utterances"
            else:
                raise ValueError(f"unknown variant {engine}/{variant}")
            proc = time.monotonic() - t0
            rtf = round(proc / dur, 4) if dur > 0 else None
            if words is None and text:
                words = safe_align(self.aligner, used, text, lang, langs)
            upd = ("UPDATE alt_transcripts SET status='done', language=?, detect_path=?, text=?, rtf=?, "
                   "processing_ms=?, words=?, words_kind=?, error=NULL, updated_server_ms=? "
                   "WHERE device_id=? AND segment_id=? AND engine=? AND variant=?")
            self.db.execute(upd, (lang, path, text, None if rtf is None else str(rtf), int(proc * 1000),
                                  canonical(words) if words else None, kind if words else None,
                                  now_ms(), dev, seg, engine, variant))
            log.info("compare done segment=%s variant=%s/%s proc_s=%.2f", seg, engine, variant, proc)
        except Exception as e:  # noqa: BLE001
            msg = f"{type(e).__name__}: {str(e)[:200]}"
            self.db.execute("UPDATE alt_transcripts SET status='failed', error=?, updated_server_ms=? "
                            "WHERE device_id=? AND segment_id=? AND engine=? AND variant=?",
                            (msg, now_ms(), dev, seg, engine, variant))
            log.warning("compare failed segment=%s variant=%s/%s err=%s", seg, engine, variant, msg)
