import numpy as np
import pytest

from fls.engines.base import FinalResult
from fls.gate import GATE_DBFS, loudest_speech_band_dbfs, silence_reason
from fls.langs import decode_with_policy, guarded_decode, looks_like_echo
from conftest import sha, wav_bytes
from test_flow import segment_event
from test_languages import create_memo

SR = 16000


def tone(db, seconds=1.0, hz=1000):
    return (10 ** (db / 20) * np.sqrt(2) * np.sin(2 * np.pi * hz * np.arange(int(SR * seconds)) / SR)).astype(np.float32)


def test_gate_levels():
    assert silence_reason(np.zeros(SR, dtype=np.float32)) == "gated:silence"
    assert silence_reason(np.zeros(0, dtype=np.float32)) == "gated:silence"
    assert silence_reason(tone(-80)) is not None
    assert silence_reason(tone(-64)) is None  # just above the threshold
    assert silence_reason(tone(-35)) is None  # level of the phone's speech bursts
    assert abs(loudest_speech_band_dbfs(tone(-40)) - (-40)) < 1.5
    assert GATE_DBFS == -65.0


def test_gate_uses_loudest_100ms_not_average():
    x = np.zeros(10 * SR, dtype=np.float32)
    x[3 * SR:3 * SR + 1600] = tone(-40, 0.1)  # one 100 ms burst in 10 s of silence
    assert silence_reason(x) is None


def test_gate_ignores_rumble_outside_speech_band():
    assert silence_reason(tone(-30, hz=40)) is not None


def test_metadata_gate():
    assert silence_reason(tone(-30), peak_dbfs_x100=-9600) == "gated:silent-metadata"
    assert silence_reason(tone(-30), peak_dbfs_x100=-1200) is None


@pytest.mark.parametrize("text,ctx,echo", [
    ("English.", "", True), ("Korean, English.", "", True), ("한국어", "", False),
    ("Languages in priority order: Korean, English.", "Languages in priority order: Korean, English.", True),
    ("priority order", "Languages in priority order: Korean", True),
    ("hello there", "", False), ("", "", False), ("Korean", "", True),
    ("Please say Korean", "", False),
])
def test_echo_detection(text, ctx, echo):
    assert looks_like_echo(text, ctx) is echo


class Echo:
    name = "echo"

    def __init__(self, text, lang="ko"):
        self.text, self.lang, self.calls = text, lang, []

    def decode(self, audio, sr, context="", language=None):
        self.calls.append((context, language))
        return FinalResult(text=self.text, language=self.lang, no_speech=False)


def test_echo_guard_makes_no_speech():
    a = np.ones(1600, dtype=np.float32) * 0.1
    r = decode_with_policy(Echo("English."), a, ["ko", "en"])
    assert r.no_speech is True and r.text == "" and r.path == "auto"
    r = guarded_decode(Echo("hello"), a, 16000, "", "ko")
    assert r.text == "hello"


def test_silent_segment_skips_model_final_and_comparison(client, dev, monkeypatch):
    st = client.app.state.fls
    called = []
    monkeypatch.setattr(st.worker.engine, "decode", lambda *a, **k: called.append(1))
    data = wav_bytes(1.0, amp=0.3)  # audible audio, but the phone says digital silence
    dev.put(data)
    created = create_memo(dev, "m1")
    p = dev.segment_payload("m1", "s1", data)
    p["peak_dbfs_x100"] = -9600
    e = dev.event("segment_closed", p)
    dev.commit(e)
    dev.post(created, e)
    (seg,) = dev.wait_done("m1")
    assert seg["no_speech"] is True and seg["text"] == "" and called == []
    assert st.db.one("SELECT detect_path FROM transcripts")["detect_path"] == "gated:silent-metadata"
    from fastapi.testclient import TestClient
    from fls.dashboard import create_dashboard
    import time

    with TestClient(create_dashboard(st), base_url="http://127.0.0.1:8790") as dash:
        dash.post("/dash/api/segments/s1/compare")
        end = time.time() + 10
        while time.time() < end:
            alts = dash.get("/dash/api/memos/m1").json()["segments"][0]["alts"]
            if len(alts) == 5 and all(a["status"] in ("done", "failed") for a in alts):
                break
            time.sleep(0.05)
    assert all(a["status"] == "done" and a["text"] == "" and a["detect_path"].startswith("gated") for a in alts)
    assert called == []
