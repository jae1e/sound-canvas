import time

import pytest
from fastapi.testclient import TestClient

from fls.dashboard import create_dashboard, recording_timeline, route_at
from conftest import wav_bytes
from test_flow import segment_event
from test_languages import create_memo


def wait_alts(dash, memo):
    end = time.time() + 10
    while time.time() < end:
        alts = dash.get(f"/dash/api/memos/{memo}").json()["segments"][0]["alts"]
        if len(alts) == 5 and all(a["status"] in ("done", "failed") for a in alts):
            return alts
        time.sleep(0.05)
    raise AssertionError("comparison did not finish")


@pytest.mark.parametrize("langs,expect", [(None, "auto"), (["ko", "en"], "auto"), (["en"], "en"), (["ko"], "ko")])
def test_replay_language(client, dev, langs, expect):
    st = client.app.state.fls
    data = wav_bytes()
    dev.put(data)
    dev.post(create_memo(dev, "m1", langs), segment_event(dev, "m1", "s1", data))
    dev.wait_done("m1")
    with TestClient(create_dashboard(st), base_url="http://127.0.0.1:8790") as dash:
        dash.post("/dash/api/segments/s1/compare")
        alts = wait_alts(dash, "m1")
    rep = [a for a in alts if a["engine"] == "nemotron-replay"]
    assert {a["detect_path"] for a in rep} == {f"stream:{expect}"} and {a["language"] for a in rep} == {expect}
    assert {lang for lang, _ in st.live_engine.opened} == {expect}


def test_live_start_language_passed_as_is(client, dev):
    import json

    st = client.app.state.fls
    with client.websocket_connect("/v1/live", headers=dev.h) as ws:
        ws.send_text(json.dumps({"type": "start", "memo_id": "m", "recording_id": "r", "language": "auto"}))
        assert json.loads(ws.receive_text())["type"] == "ready"
    assert st.live_engine.opened[-1][0] == "auto"


def test_timeline_routes_pauses_silenced(client, dev):
    data = wav_bytes()
    dev.put(data)

    def ev(t, p, elapsed):
        e = dev.event(t, p)
        e["elapsed_us"] = elapsed
        from fls.canon import record_hash
        e["record_hash"] = record_hash({k: v for k, v in e.items() if k != "record_hash"})
        dev.commit(e)
        return e

    base = {"memo_id": "m1", "recording_id": "r1"}
    evs = [create_memo(dev, "m1")]
    evs.append(ev("recording_started", {**base, "route": {"type": "builtin_mic"}, "source": "UNPROCESSED",
                                        "sample_rate": 16000, "effects": {"ns": "off", "agc": "off", "aec": "off"}}, 1_000_000))
    p0 = dev.segment_payload("m1", "s0", data, 0)
    p0.update(recording_id="r1", start_elapsed_us=1_000_000, end_elapsed_us=5_000_000)
    evs.append(ev("segment_closed", p0, 5_000_100))
    evs.append(ev("route_changed", {**base, "route": {"type": "bluetooth_sco", "product_name": "Buds"},
                                    "reason": "device_connected"}, 5_000_200))
    p1 = dev.segment_payload("m1", "s1", data, 1)
    p1.update(recording_id="r1", start_elapsed_us=5_000_000, end_elapsed_us=9_000_000)
    evs.append(ev("segment_closed", p1, 9_000_100))
    evs.append(ev("recording_paused", base, 9_100_000))
    evs.append(ev("recording_resumed", base, 12_000_000))
    evs.append(ev("capture_state", {**base, "silenced": True}, 13_000_000))
    evs.append(ev("capture_state", {**base, "silenced": False}, 15_000_000))
    evs.append(ev("recording_stopped", {**base, "reason": "user"}, 16_000_000))
    assert all(r["status"] == "accepted" for r in dev.post(*evs).json()["results"])
    dev.wait_done("m1", 2)
    st = client.app.state.fls
    # The raw payload keeps the reason.
    assert '"reason":"device_connected"' in st.db.one("SELECT payload FROM events WHERE type='route_changed'")["payload"]
    tl = recording_timeline(st.db, dev.id, "m1")
    assert tl["paused"] == [{"start_us": 9_100_000, "end_us": 12_000_000}]
    assert tl["silenced"] == [{"start_us": 13_000_000, "end_us": 15_000_000}]
    assert [r["reason"] for r in tl["routes"]] == [None, "device_connected"]
    assert route_at(tl["routes"], "r1", 1_000_000)["route"]["type"] == "builtin_mic"
    assert route_at(tl["routes"], "r1", 5_000_000)["route"]["type"] == "bluetooth_sco"  # event stamped 0.2 s late
    with TestClient(create_dashboard(st), base_url="http://127.0.0.1:8790") as dash:
        d = dash.get("/dash/api/memos/m1").json()
        s0, s1 = d["segments"]
        assert s0["route"]["type"] == "builtin_mic" and s0["route_reason"] is None
        assert s1["route"]["product_name"] == "Buds" and s1["route_reason"] == "device_connected"
        assert [e["type"] for e in d["timeline"]["events"]][:2] == ["recording_started", "route_changed"]
        assert d["timeline"]["events"][-1]["reason"] == "user"
