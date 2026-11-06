"""Persisted final-transcription queue with one worker thread (one job at a time)."""

from __future__ import annotations

import logging
import threading
import time

from .audio import load_16k_mono
from .canon import canonical
from .config import MAX_JOB_RETRIES
from .db import Database, now_ms
from .engines.base import FinalEngine
from .store import ObjectStore

log = logging.getLogger("fls.jobs")


class Worker:
    def __init__(self, db: Database, store: ObjectStore, engine: FinalEngine):
        self.db, self.store, self.engine = db, store, engine
        self._wake = threading.Event()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        with self.db.tx() as c:
            c.execute("UPDATE jobs SET status='queued', updated_server_ms=? WHERE status='running'", (now_ms(),))
            c.execute(
                "UPDATE transcripts SET status='queued', updated_server_ms=? WHERE status='running'",
                (now_ms(),),
            )
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

    def _claim(self):
        with self.db.tx() as c:
            job = c.execute("SELECT * FROM jobs WHERE status='queued' ORDER BY id LIMIT 1").fetchone()
            if job is None:
                return None
            t = now_ms()
            c.execute("UPDATE jobs SET status='running', attempts=attempts+1, updated_server_ms=? WHERE id=?",
                      (t, job["id"]))
            c.execute("UPDATE transcripts SET status='running', updated_server_ms=? "
                      "WHERE device_id=? AND segment_id=?", (t, job["device_id"], job["segment_id"]))
            return job

    def _run(self) -> None:
        while not self._stop.is_set():
            job = self._claim()
            if job is None:
                self._wake.wait(timeout=5)
                self._wake.clear()
                continue
            self._process(job)

    def _process(self, job) -> None:
        dev, seg, sha = job["device_id"], job["segment_id"], job["object_sha256"]
        t0 = time.monotonic()
        try:
            audio = load_16k_mono(self.store.path(sha))
            dur = len(audio) / 16000
            res = self.engine.transcribe(audio, 16000, "")
            proc = time.monotonic() - t0
            rtf = round(proc / dur, 4) if dur > 0 else None
            t = now_ms()
            with self.db.tx() as c:
                c.execute(
                    "UPDATE transcripts SET status='done', engine=?, text=?, language=?, no_speech=?, "
                    "confidence=?, words=?, rtf=?, error=NULL, updated_server_ms=? "
                    "WHERE device_id=? AND segment_id=?",
                    (self.engine.name, res.text, res.language, 1 if res.no_speech else 0,
                     res.confidence, canonical(res.words) if res.words is not None else None,
                     None if rtf is None else str(rtf), t, dev, seg),
                )
                c.execute("UPDATE jobs SET status='done', error=NULL, updated_server_ms=? WHERE id=?",
                          (t, job["id"]))
            log.info("job done segment=%s audio_s=%.2f proc_s=%.2f rtf=%s", seg, dur, proc, rtf)
        except Exception as e:  # noqa: BLE001 - any engine failure goes through the retry path
            msg = f"{type(e).__name__}: {str(e)[:200]}"
            t = now_ms()
            # `job` was read before the attempt counter increment, so attempts+1 is this attempt.
            final = (job["attempts"] + 1) > MAX_JOB_RETRIES
            with self.db.tx() as c:
                if final:
                    c.execute("UPDATE jobs SET status='failed', error=?, updated_server_ms=? WHERE id=?",
                              (msg, t, job["id"]))
                    c.execute("UPDATE transcripts SET status='failed', engine=?, error=?, "
                              "updated_server_ms=? WHERE device_id=? AND segment_id=?",
                              (self.engine.name, msg, t, dev, seg))
                else:
                    c.execute("UPDATE jobs SET status='queued', error=?, updated_server_ms=? WHERE id=?",
                              (msg, t, job["id"]))
                    c.execute("UPDATE transcripts SET status='queued', updated_server_ms=? "
                              "WHERE device_id=? AND segment_id=?", (t, dev, seg))
            log.warning("job failed segment=%s attempt=%d final=%s err=%s", seg, job["attempts"] + 1,
                        final, msg)
