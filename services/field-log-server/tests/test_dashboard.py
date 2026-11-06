import io
import json
import time

import numpy as np
import pytest
import soundfile as sf
from fastapi.testclient import TestClient

from fls.cer import cer
from fls.dashboard import create_dashboard
from conftest import sha, wav_bytes
from test_flow import segment_event
from test_languages import create_memo


@pytest.fixture
def dash(client):
    app = create_dashboard(client.app.state.fls)
    with TestClient(app, base_url="http://127.0.0.1:8790") as c:
        yield c


def seeded(dev, memo="m1", seg="s1", seconds=1.0):
    data = wav_bytes(seconds)
    dev.put(data)
    dev.post(create_memo(dev, memo), segment_event(dev, memo, seg, data))
    dev.wait_done(memo)
    return data


def test_cer_values():
    assert cer("안녕 하세요", "안녕하세요.")["cer"] == 0
    assert cer("Hello, World", "hello world")["cer"] == 0
    r = cer("abcd", "abxd")
    assert r["distance"] == 1 and r["ref_len"] == 4 and r["cer"] == 0.25
    assert cer("", "x")["cer"] is None
    assert cer("abc", "")["cer"] == 1.0


def test_host_guard_and_index(client, dash):
    assert dash.get("/").status_code == 200 and "autoplay" not in dash.get("/").text
    bad = TestClient(create_dashboard(client.app.state.fls), base_url="http://evil.example:8790")
    assert bad.get("/dash/api/memos").status_code == 403


def test_memo_list_and_detail(client, dev, dash):
    seeded(dev)
    lst = dash.get("/dash/api/memos").json()["memos"]
    assert len(lst) == 1 and lst[0]["segment_count"] == 1 and lst[0]["final_status"] == "done"
    d = dash.get("/dash/api/memos/m1").json()
    s = d["segments"][0]
    assert s["final"]["text"] == "fake transcript 1000ms" and s["peak_dbfs"] == -10.0 and s["audio_present"]
    assert d["languages"] == ["ko", "en"]


def test_peaks_and_range(client, dev, dash):
    seeded(dev)
    p = dash.get("/dash/api/segments/s1/peaks?n=100").json()
    assert p["n"] == 100 and len(p["min"]) == len(p["max"]) == 100 and p["duration_ms"] == 1000
    assert 0.25 < max(p["max"]) <= 0.31 and -0.31 <= min(p["min"]) < -0.25
    c = dash.get("/dash/api/segments/s1/peaks?n=100&conditioned=1").json()
    assert max(c["max"]) > max(p["max"])  # conditioning raised the level
    assert dash.get("/dash/api/segments/s1/peaks?n=5").status_code == 422
    assert dash.get("/dash/api/segments/s1/peaks?n=9999").status_code == 422
    assert dash.get("/dash/api/segments/nope/peaks").status_code == 404
    png = dash.get("/dash/api/segments/s1/spectrogram.png")
    assert png.status_code == 200 and png.content[:8] == b"\x89PNG\r\n\x1a\n"


def test_audio_http_range(client, dev, dash):
    data = seeded(dev)
    r = dash.get(f"/dash/api/objects/{sha(data)}", headers={"Range": "bytes=0-99"})
    assert r.status_code == 206 and r.content == data[:100]
    assert r.headers["content-range"] == f"bytes 0-99/{len(data)}"
    cw = dash.get("/dash/api/segments/s1/conditioned.wav")
    assert cw.status_code == 200 and cw.headers["accept-ranges"] == "bytes"
    x, sr = sf.read(io.BytesIO(cw.content))
    assert sr == 16000 and len(x) == 16000
    part = dash.get("/dash/api/segments/s1/conditioned.wav", headers={"Range": "bytes=-10"})
    assert part.status_code == 206 and part.content == cw.content[-10:]
    assert dash.get("/dash/api/segments/s1/conditioned.wav", headers={"Range": "bytes=999999999-"}).status_code == 416


def test_compare_jobs_and_cer_in_detail(client, dev, dash):
    seeded(dev)
    r = dash.post("/dash/api/segments/s1/compare").json()
    assert [(v["engine"], v["variant"]) for v in r["variants"]] == [
        ("qwen3", "raw"), ("qwen3", "conditioned"), ("qwen3", "forced-ko"),
        ("nemotron-replay", "conditioned"), ("nemotron-replay", "raw")]
    end = time.time() + 10
    while time.time() < end:
        alts = dash.get("/dash/api/memos/m1").json()["segments"][0]["alts"]
        if len(alts) == 5 and all(a["status"] in ("done", "failed") for a in alts):
            break
        time.sleep(0.05)
    by = {(a["engine"], a["variant"]): a for a in alts}
    assert by[("qwen3", "raw")]["text"] == "fake transcript 1000ms"
    assert by[("qwen3", "forced-ko")]["detect_path"] == "forced:ko" and by[("qwen3", "forced-ko")]["language"] == "ko"
    # The fake streaming engine replays tone as words; the replay variants must complete.
    assert by[("nemotron-replay", "raw")]["status"] == "done"
    assert by[("nemotron-replay", "raw")]["text"].startswith("word1")
    # Reference and CER.
    assert dash.put("/dash/api/segments/s1/reference", json={"text": "Fake transcript 1000ms."}).status_code == 200
    seg = dash.get("/dash/api/memos/m1").json()["segments"][0]
    assert seg["reference"] == "Fake transcript 1000ms." and seg["final"]["cer"] == 0
    assert dash.put("/dash/api/segments/s1/reference", json={"bad": 1}).status_code == 422
    assert dash.post("/dash/api/cer", json={"reference": "abcd", "hypothesis": "abxd"}).json()["cer"] == 0.25
    assert dash.post("/dash/api/cer", json={"reference": 1}).status_code == 422


def test_final_jobs_run_before_comparison(client, dev, dash):
    st = client.app.state.fls
    seeded(dev)
    st.worker.stop()
    st.db.execute("DELETE FROM alt_transcripts")
    dash.post("/dash/api/segments/s1/compare")
    d2 = wav_bytes(0.5)
    dev.put(d2)
    dev.post(segment_event(dev, "m1", "s2", d2, 1))
    kind, job = st.worker._claim()
    assert kind == "final" and job["segment_id"] == "s2"


def test_deleted_memos_hidden(client, dev, dash):
    seeded(dev)
    d = dev.event("memo_deleted", {"memo_id": "m1"})
    dev.commit(d)
    dev.post(d)
    assert dash.get("/dash/api/memos").json()["memos"] == []
    assert dash.get("/dash/api/memos/m1").status_code == 404
    assert dash.get("/dash/api/segments/s1/peaks").status_code == 404
    assert dash.post("/dash/api/segments/s1/compare").status_code == 404
