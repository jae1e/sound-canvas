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
from .engines.base import FinalEngine, StreamingEngine
from .langs import DEFAULT_LANGUAGES, ISO_TO_QWEN, decode_with_policy, normalize_languages
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


def replay_stream(live: StreamingEngine, audio: np.ndarray, language: str, condition_input: bool) -> str:
    """Feed stored audio through a fresh streaming recognizer (as fast as it decodes)."""
    pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2")
    pcm = np.concatenate([pcm, np.zeros(8000, dtype="<i2")])  # let trailing tokens flush
    stream = live.open_stream(language, condition_input)
    texts: list[str] = []
    try:
        for i in range(0, len(pcm), 1600):
            texts += [e.text for e in stream.feed(pcm[i:i + 1600]) if e.kind == "final"]
        texts += [e.text for e in stream.finish() if e.kind == "final"]
    finally:
        stream.close()
    return " ".join(t for t in texts if t)


class Worker:
    def __init__(self, db: Database, store: ObjectStore, engine: FinalEngine,
                 live_engine: StreamingEngine | None = None,
                 on_change: Callable[[], None] | None = None):
        self.db, self.store, self.engine, self.live = db, store, engine, live_engine
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

    # ------------------------------------------------------------------ final jobs
    def _process(self, job) -> None:
        dev, seg, sha = job["device_id"], job["segment_id"], job["object_sha256"]
        t0 = time.monotonic()
        try:
            raw = load_16k_mono(self.store.path(sha))
            dur = len(raw) / 16000
            res = decode_with_policy(self.engine, condition(raw), self._languages(dev, seg))
            proc = time.monotonic() - t0
            rtf = round(proc / dur, 4) if dur > 0 else None
            t = now_ms()
            with self.db.tx() as c:
                c.execute(
                    "UPDATE transcripts SET status='done', engine=?, text=?, language=?, no_speech=?, "
                    "confidence=?, words=?, rtf=?, detect_path=?, error=NULL, updated_server_ms=? "
                    "WHERE device_id=? AND segment_id=?",
                    (self.engine.name, res.text, res.language, 1 if res.no_speech else 0,
                     res.confidence, canonical(res.words) if res.words is not None else None,
                     None if rtf is None else str(rtf), res.path, t, dev, seg),
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
            if engine == "qwen3" and variant in ("raw", "conditioned"):
                res = decode_with_policy(self.engine, raw if variant == "raw" else condition(raw), langs)
                text, lang, path = res.text, res.language, res.path
            elif engine == "qwen3" and variant.startswith("forced-"):
                iso = variant[len("forced-"):]
                if iso not in ISO_TO_QWEN:
                    raise ValueError("unsupported language")
                res = self.engine.decode(condition(raw), 16000, "", iso)
                text, lang, path = res.text, res.language, f"forced:{iso}"
            elif engine == "nemotron-replay":
                if self.live is None or not self.live.available:
                    raise RuntimeError("live engine unavailable")
                text = replay_stream(self.live, raw, langs[0], variant == "conditioned")
                lang, path = langs[0], f"stream:{langs[0]}"
            else:
                raise ValueError(f"unknown variant {engine}/{variant}")
            proc = time.monotonic() - t0
            rtf = round(proc / dur, 4) if dur > 0 else None
            upd = ("UPDATE alt_transcripts SET status='done', language=?, detect_path=?, text=?, rtf=?, "
                   "processing_ms=?, error=NULL, updated_server_ms=? "
                   "WHERE device_id=? AND segment_id=? AND engine=? AND variant=?")
            self.db.execute(upd, (lang, path, text, None if rtf is None else str(rtf), int(proc * 1000),
                                  now_ms(), dev, seg, engine, variant))
            log.info("compare done segment=%s variant=%s/%s proc_s=%.2f", seg, engine, variant, proc)
        except Exception as e:  # noqa: BLE001
            msg = f"{type(e).__name__}: {str(e)[:200]}"
            self.db.execute("UPDATE alt_transcripts SET status='failed', error=?, updated_server_ms=? "
                            "WHERE device_id=? AND segment_id=? AND engine=? AND variant=?",
                            (msg, now_ms(), dev, seg, engine, variant))
            log.warning("compare failed segment=%s variant=%s/%s err=%s", seg, engine, variant, msg)
