import time

import pytest
from fastapi.testclient import TestClient

from fls.app import create_app
from fls.dashboard import create_dashboard
from fls.engines import FakeFinalEngine, FakeStreamingEngine
from fls.engines.aligner import FakeAligner, pick_language, safe_align
from conftest import pair, sha, wav_bytes
from test_flow import segment_event
from test_languages import create_memo


class BoomAligner:
    name = "boom"

    def align(self, audio, text, language):
        raise RuntimeError("no GPU memory")


def make_client(tmp_path, aligner):
    app = create_app(tmp_path / "data", FakeFinalEngine(), FakeStreamingEngine(), aligner)
    return TestClient(app)


def seed(dev, memo="m1", seg="s1", amp=0.3):
    data = wav_bytes(1.0, amp=amp)
    dev.put(data)
    dev.post(create_memo(dev, memo), segment_event(dev, memo, seg, data))
    return dev.wait_done(memo)[0]


def test_pick_language():
    assert pick_language("ko,en", ["en", "ko"]) == "ko"
    assert pick_language("en", ["ko", "en"]) == "en"
    assert pick_language("", ["ko", "en"]) == "ko"
    assert pick_language("xx", ["zz"]) is None


def test_words_stored_in_transcript(tmp_path):
    al = FakeAligner()
    with make_client(tmp_path, al) as c:
        seg = seed(pair(c))
    assert seg["words"] == [{"text": w, "start_ms": a, "end_ms": b} for w, a, b in
                            [("fake", 0, 333), ("transcript", 333, 666), ("1000ms", 666, 1000)]]
    assert al.calls and al.calls[0][2] == "en"  # fake engine reports "en"


def test_alignment_failure_keeps_words_null(tmp_path):
    with make_client(tmp_path, BoomAligner()) as c:
        seg = seed(pair(c))
    assert seg["status"] == "done" and seg["words"] is None and seg["text"]


def test_no_speech_skips_alignment(tmp_path):
    al = FakeAligner()
    with make_client(tmp_path, al) as c:
        seg = seed(pair(c), amp=0.0)
    assert seg["no_speech"] is True and seg["words"] is None and al.calls == []


def test_safe_align_never_raises():
    assert safe_align(None, None, "x", "ko", ["ko"]) is None
    assert safe_align(BoomAligner(), None, "x", "ko", ["ko"]) is None
    assert safe_align(FakeAligner(), None, "  ", "ko", ["ko"]) is None


def test_dashboard_words_and_align_api(tmp_path):
    with make_client(tmp_path, FakeAligner()) as c:
        dev = pair(c)
        seed(dev)
        with TestClient(create_dashboard(c.app.state.fls), base_url="http://127.0.0.1:8790") as dash:
            dash.post("/dash/api/segments/s1/compare")
            end = time.time() + 10
            while time.time() < end:
                s = dash.get("/dash/api/memos/m1").json()["segments"][0]
                if len(s["alts"]) == 5 and all(a["status"] in ("done", "failed") for a in s["alts"]):
                    break
                time.sleep(0.05)
            assert s["final"]["words"][0]["text"] == "fake" and s["final"]["words_kind"] == "words"
            by = {(a["engine"], a["variant"]): a for a in s["alts"]}
            assert by[("qwen3", "raw")]["words"][-1]["end_ms"] == 1000
            rep = by[("nemotron-replay", "raw")]
            assert rep["words_kind"] == "utterances" and rep["words"][0]["text"].startswith("word1")
            assert rep["words"][0]["start_ms"] < rep["words"][0]["end_ms"]
            # Align a Nemotron row with the aligner: it becomes real words.
            r = dash.post("/dash/api/segments/s1/align", json={"row": "alt:nemotron-replay/raw"})
            assert r.status_code == 200 and r.json()["words"][0]["text"] == "word1"
            a = dash.get("/dash/api/memos/m1").json()["segments"][0]["alts"]
            assert [x for x in a if x["variant"] == "raw" and x["engine"] == "nemotron-replay"][0]["words_kind"] == "words"
            # Reference alignment.
            assert dash.post("/dash/api/segments/s1/align", json={"row": "reference"}).status_code == 409
            dash.put("/dash/api/segments/s1/reference", json={"text": "hello there world"})
            r = dash.post("/dash/api/segments/s1/align", json={"row": "reference"})
            assert [w["text"] for w in r.json()["words"]] == ["hello", "there", "world"]
            assert dash.get("/dash/api/memos/m1").json()["segments"][0]["reference_words"][0]["text"] == "hello"
            # Editing the reference text drops the stale words.
            dash.put("/dash/api/segments/s1/reference", json={"text": "other text"})
            assert dash.get("/dash/api/memos/m1").json()["segments"][0]["reference_words"] is None
            # Re-aligning the final row bumps updated_server_ms so the phone sees it.
            before = c.get("/v1/transcripts", headers=dev.h).json()["segments"][0]["updated_server_ms"]
            time.sleep(0.01)
            assert dash.post("/dash/api/segments/s1/align", json={"row": "final"}).status_code == 200
            after = c.get("/v1/transcripts", headers=dev.h).json()["segments"][0]["updated_server_ms"]
            assert after > before
            assert dash.post("/dash/api/segments/s1/align", json={"row": "bogus"}).status_code == 422


def test_align_unavailable_without_aligner(client, dev):
    seed(dev)
    with TestClient(create_dashboard(client.app.state.fls), base_url="http://127.0.0.1:8790") as dash:
        assert dash.post("/dash/api/segments/s1/align", json={"row": "final"}).status_code == 503
