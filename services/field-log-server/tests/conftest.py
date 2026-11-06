from __future__ import annotations

import hashlib
import io
import json
import time
import uuid
from pathlib import Path

import numpy as np
import pytest
import soundfile as sf
from fastapi.testclient import TestClient

from fls import auth
from fls.app import create_app
from fls.canon import record_hash
from fls.engines import FakeFinalEngine, FakeStreamingEngine

VECTORS = json.loads((Path(__file__).parent / "vectors" / "canonical.json").read_text())


def wav_bytes(seconds: float = 1.0, amp: float = 0.3, sr: int = 16000) -> bytes:
    t = np.arange(int(seconds * sr)) / sr
    x = (amp * np.sin(2 * np.pi * 440 * t)).astype(np.float32)
    buf = io.BytesIO()
    sf.write(buf, x, sr, format="WAV", subtype="PCM_16")
    return buf.getvalue()


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


class Device:
    """A paired test device that can build chained events."""

    def __init__(self, client: TestClient, db, device_id: str, token: str):
        self.client, self.db, self.id, self.token = client, db, device_id, token
        self.seq = 0
        self.prev = ""

    @property
    def h(self):
        return {"Authorization": f"Bearer {self.token}"}

    def event(self, type_: str, payload: dict, seq: int | None = None, prev: str | None = None) -> dict:
        seq = self.seq + 1 if seq is None else seq
        env = {
            "event_id": str(uuid.uuid4()), "device_id": self.id, "seq": seq, "type": type_,
            "wall_ms": 1794000000000 + seq, "elapsed_us": 1000 * seq, "boot_count": 1,
            "payload": payload, "prev_hash": self.prev if prev is None else prev,
        }
        env["record_hash"] = record_hash(env)
        return env

    def commit(self, ev: dict) -> None:
        self.seq, self.prev = ev["seq"], ev["record_hash"]

    def post(self, *events: dict):
        return self.client.post("/v1/events", json={"events": list(events)}, headers=self.h)

    def put(self, data: bytes, mime: str = "audio/wav"):
        return self.client.put(f"/v1/objects/{sha(data)}", content=data,
                               headers={**self.h, "Content-Type": mime})

    def segment_payload(self, memo: str, seg: str, data: bytes, index: int = 0) -> dict:
        return {"memo_id": memo, "recording_id": "rec1", "segment_id": seg, "index": index,
                "object_sha256": sha(data), "bytes": len(data), "format": "wav_pcm16_16k_mono",
                "start_elapsed_us": 0, "end_elapsed_us": 1000000, "start_wall_ms": 1794000000000,
                "duration_ms": 1000, "peak_dbfs_x100": -1000, "clipped_samples": 0,
                "hf_ratio_4k_ppm": 5000, "flags": [], "recovered": False}

    def wait_done(self, memo: str, n: int = 1, timeout: float = 10.0) -> list[dict]:
        end = time.time() + timeout
        while time.time() < end:
            segs = self.client.get(f"/v1/memos/{memo}/transcript", headers=self.h).json()["segments"]
            if len(segs) >= n and all(s["status"] in ("done", "failed") for s in segs):
                return segs
            time.sleep(0.05)
        raise AssertionError("transcription did not finish")


@pytest.fixture
def client(tmp_path):
    app = create_app(tmp_path / "data", FakeFinalEngine(), FakeStreamingEngine())
    with TestClient(app) as c:
        yield c


def pair(client: TestClient) -> Device:
    st = client.app.state.fls
    code = auth.create_pairing_code(st.db)
    r = client.post("/v1/enroll", json={"pairing_code": code, "device": {"model": "T"}})
    assert r.status_code == 200, r.text
    j = r.json()
    return Device(client, st.db, j["device_id"], j["token"])


@pytest.fixture
def dev(client) -> Device:
    return pair(client)


@pytest.fixture
def dev2(client) -> Device:
    return pair(client)


@pytest.fixture(autouse=True)
def fake_vad(monkeypatch, request):
    """Test tones are not speech for Silero, so use a fake VAD: any non-silent audio counts as speech.
    Tests that need the real model are marked `real_vad`."""
    if request.node.get_closest_marker("real_vad"):
        return
    import fls.pipeline as pipeline
    import fls.jobs as jobs

    def fake(audio, threshold=0.5):
        return [(0, int(len(audio) * 1000 / 16000))] if len(audio) and float(np.abs(audio).max()) > 1e-3 else []

    monkeypatch.setattr(pipeline, "speech_spans", fake)
    monkeypatch.setattr("fls.vad.speech_spans", fake)
