import json

import numpy as np
import pytest
from starlette.websockets import WebSocketDisconnect

from conftest import pair


def tone(ms, amp=8000):
    n = 16 * ms
    return (amp * np.sin(2 * np.pi * 300 * np.arange(n) / 16000)).astype("<i2").tobytes()


def silence(ms):
    return bytes(32 * ms)


def collect_until(ws, kinds):
    out = []
    while True:
        m = json.loads(ws.receive_text())
        out.append(m)
        if m["type"] in kinds:
            return out


def test_requires_token(client):
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/v1/live"):
            pass
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/v1/live", headers={"Authorization": "Bearer bad"}):
            pass


def test_stream_partials_and_final(client, dev):
    with client.websocket_connect("/v1/live", headers=dev.h) as ws:
        ws.send_text(json.dumps({"type": "start", "memo_id": "m", "recording_id": "r", "language": "auto"}))
        assert json.loads(ws.receive_text()) == {"type": "ready", "engine": "fake-stream"}
        for _ in range(12):  # 1.2 s of speech in 100 ms frames
            ws.send_bytes(tone(100))
        for _ in range(9):  # 0.9 s of silence ends the utterance
            ws.send_bytes(silence(100))
        msgs = collect_until(ws, {"final"})
        partials = [m for m in msgs if m["type"] == "partial"]
        assert [p["text"] for p in partials] == ["word1", "word1 word2"]  # only when the text changes
        assert all(p["utterance"] == 0 for p in partials)
        final = msgs[-1]
        assert final["text"] == "word1 word2" and final["utterance"] == 0
        assert final["start_ms"] == 0 and final["end_ms"] == 1200
        # Second utterance, closed by the explicit end message.
        for _ in range(6):
            ws.send_bytes(tone(100))
        ws.send_text(json.dumps({"type": "end"}))
        msgs = collect_until(ws, {"final"})
        assert msgs[-1]["utterance"] == 1 and msgs[-1]["text"] == "word1"
        assert msgs[-1]["start_ms"] >= 2100
    # Live text is never stored.
    db = client.app.state.fls.db
    assert db.one("SELECT COUNT(*) c FROM transcripts")["c"] == 0


def test_bad_frame_gives_error(client, dev):
    with client.websocket_connect("/v1/live", headers=dev.h) as ws:
        ws.send_text(json.dumps({"type": "start"}))
        ws.receive_text()
        ws.send_bytes(b"\x00" * 65538)
        assert json.loads(ws.receive_text())["type"] == "error"


def test_busy_when_full_and_none_engine(client, dev):
    st = client.app.state.fls
    with st.live_lock:
        st.live_active = 2
    with client.websocket_connect("/v1/live", headers=dev.h) as ws:
        assert json.loads(ws.receive_text()) == {"type": "busy"}
    with st.live_lock:
        st.live_active = 0
    st.live_engine = None
    with client.websocket_connect("/v1/live", headers=dev.h) as ws:
        assert json.loads(ws.receive_text()) == {"type": "busy"}
    assert client.get("/v1/health", headers=dev.h).json()["streaming_available"] is False
