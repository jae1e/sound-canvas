import json
import time

import numpy as np
import pytest

from fls.engines.aligner import FakeAligner
from fls.engines.base import FinalResult, LiveEvent
from fls.langs import decode_with_policy
from fls.nospeech import coverage, is_stock_phrase, normalize_phrase, stock_phrase_verdict
from fls.pipeline import transcribe_segment
from conftest import wav_bytes
from test_flow import segment_event
from test_languages import create_memo

SR = 16000


def test_normalize_and_stock_list():
    assert normalize_phrase("Thank you!") == "thankyou" and is_stock_phrase("Thank you.")
    assert is_stock_phrase(" 감사합니다. ") and is_stock_phrase("네") and is_stock_phrase("謝謝")
    assert not is_stock_phrase("감사합니다 여러분") and not is_stock_phrase("pump two")


def test_coverage():
    spans = [(1000, 2000)]
    assert coverage([{"text": "a", "start_ms": 1000, "end_ms": 2000}], spans) == 1.0
    assert coverage([{"text": "a", "start_ms": 1000, "end_ms": 1300}], spans) == pytest.approx(0.3)
    assert coverage([{"text": "a", "start_ms": 0, "end_ms": 500}], spans) == 0.0
    assert coverage(None, spans) is None and coverage([{"text": "a", "start_ms": 0, "end_ms": 9}], []) is None
    overlapping = [{"text": "a", "start_ms": 1000, "end_ms": 1600}, {"text": "b", "start_ms": 1400, "end_ms": 2000}]
    assert coverage(overlapping, spans) == 1.0  # overlaps are not double counted


W = lambda a, b: [{"text": "x", "start_ms": a, "end_ms": b}]


@pytest.mark.parametrize("text,path,sm,words,spans,expect", [
    # Genuine short phrases with clear, aligned speech survive.
    ("감사합니다.", "auto", 730, W(0, 700), [(0, 730)], False),
    ("Thank you.", "auto", 540, W(0, 520), [(0, 540)], False),
    ("네.", "auto", 444, W(0, 440), [(0, 444)], False),
    # A blip too short to carry any phrase.
    ("감사합니다.", "auto", 300, W(0, 300), [(0, 300)], True),
    # Short speech whose aligned words do not cover it, or no alignment at all.
    ("감사합니다.", "auto", 900, W(0, 200), [(0, 900)], True),
    ("안녕하세요.", "auto", 900, None, [(0, 900)], True),
    # Out-of-list detection with little speech.
    ("안녕하세요.", "auto(zh)->forced:ko", 2000, W(0, 2000), [(0, 2000)], True),
    ("안녕하세요.", "auto(zh)->forced:ko", 3000, W(0, 3000), [(0, 3000)], False),
    # Long speech but the words cover under 30% of it.
    ("감사합니다.", "auto", 5000, W(0, 1000), [(0, 5000)], True),
    # Not a stock phrase, or no VAD run: never suppressed.
    ("pump two is leaking", "auto", 100, None, [(0, 100)], False),
    ("감사합니다.", "auto", None, None, [], False),
])
def test_stock_verdict(text, path, sm, words, spans, expect):
    assert stock_phrase_verdict(text, path, sm, words, spans) is expect


class Say:
    name = "say"

    def __init__(self, text, auto="ko", forced=None):
        self.text, self.auto, self.forced = text, auto, forced or text
        self.calls = []

    def decode(self, audio, sr, context="", language=None):
        self.calls.append(language)
        return FinalResult(text=self.forced if language else self.text, language=language or self.auto, no_speech=False)


def audio(seconds=1.0, amp=0.1):
    return (amp * np.sin(2 * np.pi * 440 * np.arange(int(seconds * SR)) / SR)).astype(np.float32)


def test_pipeline_stock_phrase_is_filtered_and_force_bypasses(monkeypatch):
    import fls.pipeline as pl

    monkeypatch.setattr(pl, "speech_spans", lambda a, t=0.5: [(100, 400)])  # 300 ms of "speech"
    eng = Say("감사합니다.")
    r = transcribe_segment(eng, FakeAligner(), audio(), ["ko", "en"])
    assert r.no_speech and r.no_speech_reason == "stock_phrase" and r.text == "" and r.filtered_text == "감사합니다."
    assert r.speech_ms == 300
    forced = transcribe_segment(eng, FakeAligner(), audio(), ["ko", "en"], force=True)
    assert forced.text == "감사합니다." and forced.no_speech is False and forced.path == "forced-by-user"


def test_pipeline_no_voice_skips_model(monkeypatch):
    import fls.pipeline as pl

    monkeypatch.setattr(pl, "speech_spans", lambda a, t=0.5: [(0, 200)])
    eng = Say("hello")
    r = transcribe_segment(eng, None, audio(), ["ko", "en"])
    assert r.no_speech_reason == "no_voice" and eng.calls == [] and r.speech_ms == 200
    assert transcribe_segment(eng, None, audio(), ["ko", "en"], force=True).text == "hello"


def test_pipeline_silent_reason():
    r = transcribe_segment(Say("x"), None, np.zeros(SR, dtype=np.float32), ["ko"])
    assert r.no_speech_reason == "silent" and r.speech_ms is None


def test_out_of_list_skips_redecode_on_little_speech():
    eng = Say("그렇게 하면.", auto="zh")
    r = decode_with_policy(eng, audio(), ["ko", "en"], speech_ms=400)
    assert r.no_speech_reason == "no_voice" and eng.calls == [None]  # no forced re-decode
    eng = Say("hello", auto="zh")
    r = decode_with_policy(eng, audio(), ["ko", "en"], speech_ms=900)
    assert eng.calls == [None, "ko"] and r.path == "auto(zh)->forced:ko"


def test_echo_reason_and_filtered_text():
    r = decode_with_policy(Say("English."), audio(), ["ko", "en"])
    assert r.no_speech_reason == "echo" and r.filtered_text == "English."


def test_fields_in_transcript_pull_and_retranscribe(client, dev, dev2, monkeypatch):
    import fls.pipeline as pl

    st = client.app.state.fls
    spans = {"v": [(0, 300)]}
    monkeypatch.setattr(pl, "speech_spans", lambda a, t=0.5: spans["v"])
    st.worker.engine = Say("감사합니다.")
    data = wav_bytes(1.0)
    dev.put(data)
    dev.post(create_memo(dev, "m1"), segment_event(dev, "m1", "s1", data))
    (seg,) = dev.wait_done("m1")
    assert seg["no_speech"] is True and seg["no_speech_reason"] == "stock_phrase"
    assert seg["filtered_text"] == "감사합니다." and seg["text"] == "" and seg["speech_ms"] == 300
    # Transcribe anyway: auth, scoping, validation.
    url = "/v1/segments/s1/retranscribe"
    assert client.post(url, json={"force": True}).status_code == 401
    assert client.post(url, json={"force": True}, headers=dev2.h).status_code == 404
    assert client.post("/v1/segments/nope/retranscribe", json={"force": True}, headers=dev.h).status_code == 404
    assert client.post(url, json={"force": False}, headers=dev.h).status_code == 422
    before = seg["updated_server_ms"]
    r = client.post(url, json={"force": True}, headers=dev.h)
    assert r.status_code == 202
    end = time.time() + 10
    while time.time() < end:
        (seg,) = client.get("/v1/memos/m1/transcript", headers=dev.h).json()["segments"]
        if seg["status"] == "done" and seg["updated_server_ms"] > before:
            break
        time.sleep(0.05)
    assert seg["text"] == "감사합니다." and seg["no_speech"] is False and seg["no_speech_reason"] is None
    assert st.db.one("SELECT detect_path FROM transcripts")["detect_path"] == "forced-by-user"


def test_dashboard_transcribe_anyway(client, dev, monkeypatch):
    import fls.pipeline as pl
    from fastapi.testclient import TestClient
    from fls.dashboard import create_dashboard

    st = client.app.state.fls
    monkeypatch.setattr(pl, "speech_spans", lambda a, t=0.5: [])
    data = wav_bytes(1.0)
    dev.put(data)
    dev.post(create_memo(dev, "m1"), segment_event(dev, "m1", "s1", data))
    (seg,) = dev.wait_done("m1")
    assert seg["no_speech_reason"] == "no_voice"
    with TestClient(create_dashboard(st), base_url="http://127.0.0.1:8790") as dash:
        assert dash.post("/dash/api/segments/s1/retranscribe").status_code == 200
        assert dash.post("/dash/api/segments/nope/retranscribe").status_code == 404
        end = time.time() + 10
        while time.time() < end:
            f = dash.get("/dash/api/memos/m1").json()["segments"][0]["final"]
            if f["status"] == "done" and f["text"]:
                break
            time.sleep(0.05)
        assert f["text"].startswith("fake") and f["detect_path"] == "forced-by-user"


def test_live_drops_quiet_stock_finals(client, dev):
    st = client.app.state.fls

    class Stream:
        def feed(self, pcm):
            return [LiveEvent("final", "감사합니다.", 0, 0, 500, -60.0), LiveEvent("final", "pump two", 1, 600, 900, -60.0),
                    LiveEvent("final", "안녕하세요.", 2, 900, 1200, -20.0)]

        def finish(self):
            return []

        def close(self):
            pass

    st.live_engine.open_stream = lambda language, condition=True: Stream()
    with client.websocket_connect("/v1/live", headers=dev.h) as ws:
        ws.send_text(json.dumps({"type": "start", "language": "auto"}))
        ws.receive_text()
        ws.send_bytes(bytes(3200))
        msgs = [json.loads(ws.receive_text()), json.loads(ws.receive_text())]
    assert [m["text"] for m in msgs] == ["pump two", "안녕하세요."]  # the quiet greeting is dropped


@pytest.mark.real_vad
def test_real_vad_ignores_noise_clicks_and_tones():
    from fls.vad import speech_ms

    rng = np.random.default_rng(0)
    n = 6 * SR
    click = np.zeros(n, dtype=np.float32)
    click[3 * SR:3 * SR + 30] = np.hanning(30) * 0.8
    for x in (click, (0.05 * rng.standard_normal(n)).astype(np.float32), audio(6.0, 0.3),
              np.zeros(n, dtype=np.float32)):
        assert speech_ms(x) < 250
