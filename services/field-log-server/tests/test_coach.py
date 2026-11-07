from __future__ import annotations

import io
import threading
import time

import numpy as np
import soundfile as sf
from fastapi.testclient import TestClient

from fls import auth
from fls.app import create_app
from fls.coach import purge_coach_jobs
from fls.engines import FakeFinalEngine, FakeStreamingEngine
from fls.engines.aligner import FakeAligner
from fls.engines.base import FinalResult


class BlockingEngine(FakeFinalEngine):
    def __init__(self):
        self.entered = threading.Event()
        self.release = threading.Event()

    def decode(self, audio, sample_rate, context="", language=None):
        self.entered.set()
        assert self.release.wait(3)
        return FinalResult(text="kept filler um", language=language or "en", no_speech=False)


def wav(seconds=1, sr=16000):
    b = io.BytesIO()
    sf.write(b, np.full(int(seconds * sr), .15, dtype=np.float32), sr, format="WAV", subtype="PCM_16")
    return b.getvalue()


def coach_device(client):
    db = client.app.state.fls.db
    code = auth.create_pairing_code(db)
    r = client.post("/v1/enroll", json={"pairing_code": code, "device": {"app_package": "com.jae1e.voicelifecompanion"}})
    data = r.json()
    return data["device_id"], {"Authorization": "Bearer " + data["token"]}


def wait_job(client, headers, job_id):
    deadline = time.time() + 5
    while time.time() < deadline:
        r = client.get(f"/v1/coach/transcripts/{job_id}", headers=headers).json()
        if r["state"] in ("done", "no_speech", "failed"):
            return r
        time.sleep(.01)
    raise AssertionError("coach job did not finish")


def test_enqueue_idempotency_state_transitions_and_scope(tmp_path, monkeypatch):
    import fls.coach as coach

    monkeypatch.setattr(coach, "speech_spans", lambda audio: [(0, len(audio) * 1000 // 16000)])
    engine = BlockingEngine()
    app = create_app(tmp_path / "data", engine, FakeStreamingEngine(), FakeAligner())
    with TestClient(app) as client:
        _, h = coach_device(client)
        audio = wav()
        first = client.post("/v1/coach/transcribe?lang=auto&take_id=t1", content=audio,
                            headers={**h, "Content-Type": "audio/wav"})
        assert first.status_code == 202 and first.json()["state"] == "queued"
        again = client.post("/v1/coach/transcribe?lang=en&take_id=t1", content=audio,
                            headers={**h, "Content-Type": "audio/wav"})
        assert again.json()["job_id"] == first.json()["job_id"]
        assert engine.entered.wait(3)
        assert client.get(f"/v1/coach/transcripts/{first.json()['job_id']}", headers=h).json()["state"] == "running"
        engine.release.set()
        result = wait_job(client, h, first.json()["job_id"])
        assert result["state"] == "done"
        assert result["duration_ms"] == 1000
        assert result["words"]
        assert result["text"] == "kept filler um"

        ordinary_code = auth.create_pairing_code(client.app.state.fls.db)
        ordinary = client.post("/v1/enroll", json={"pairing_code": ordinary_code, "device": {}}).json()
        other_h = {"Authorization": "Bearer " + ordinary["token"]}
        assert client.post("/v1/coach/transcribe?take_id=x", content=audio,
                           headers={**other_h, "Content-Type": "audio/wav"}).status_code == 403
        assert client.get(f"/v1/coach/transcripts/{first.json()['job_id']}", headers=other_h).status_code == 403
        assert client.get("/v1/coach/transcripts/missing", headers=h).status_code == 404
        assert client.delete("/v1/coach/transcripts/missing", headers=h).status_code == 404


def test_chunking_and_absolute_word_times(tmp_path, monkeypatch):
    import fls.coach as coach

    # VAD reports two speech windows separated by a pause; grouping caps chunks at 30 s.
    monkeypatch.setattr(coach, "speech_spans", lambda audio: [(0, 20000), (35000, 60000)])
    app = create_app(tmp_path / "data", FakeFinalEngine(), FakeStreamingEngine(), FakeAligner())
    with TestClient(app) as client:
        _, h = coach_device(client)
        audio = wav(65)
        r = client.post("/v1/coach/transcribe?lang=en&take_id=chunked", content=audio,
                        headers={**h, "Content-Type": "audio/wav"})
        result = wait_job(client, h, r.json()["job_id"])
        assert result["state"] == "done"
        assert result["duration_ms"] == 65000
        assert len(result["words"]) == 6
        assert result["words"][0]["start_ms"] == 0
        assert result["words"][3]["start_ms"] >= 35000
        assert len(client.app.state.fls.aligner.calls) == 2
        assert all(samples <= 30 * 16000 for samples, _, _ in client.app.state.fls.aligner.calls)


def test_validation_and_purge(tmp_path):
    app = create_app(tmp_path / "data", FakeFinalEngine(), FakeStreamingEngine(), FakeAligner())
    with TestClient(app) as client:
        _, h = coach_device(client)
        assert client.post("/v1/coach/transcribe?take_id=x", content=b"bad",
                           headers={**h, "Content-Type": "audio/wav"}).status_code == 415
        assert client.post("/v1/coach/transcribe?take_id=x", content=wav(1, 8000),
                           headers={**h, "Content-Type": "audio/wav"}).status_code == 415
        assert client.post("/v1/coach/transcribe?take_id=x", content=wav(),
                           headers={**h, "Content-Type": "application/octet-stream"}).status_code == 415
        from fls.app import COACH_MAX_BYTES
        assert client.post("/v1/coach/transcribe?take_id=large", content=b"0" * (COACH_MAX_BYTES + 1),
                           headers={**h, "Content-Type": "audio/wav"}).status_code == 413
        r = client.post("/v1/coach/transcribe?take_id=old", content=wav(), headers={**h, "Content-Type": "audio/wav"})
        st = client.app.state.fls
        st.db.execute("UPDATE coach_jobs SET created_ms=1 WHERE job_id=?", (r.json()["job_id"],))
        assert purge_coach_jobs(st.db, st.store, now=30 * 24 * 60 * 60 * 1000 + 2) == 1
        assert client.get(f"/v1/coach/transcripts/{r.json()['job_id']}", headers=h).status_code == 404
