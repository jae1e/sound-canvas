import time

from conftest import sha, wav_bytes


def segment_event(dev, memo, seg, data, index=0):
    e = dev.event("segment_closed", dev.segment_payload(memo, seg, data, index))
    dev.commit(e)
    return e


def test_object_before_event(client, dev):
    data = wav_bytes()
    assert dev.put(data).status_code == 201
    assert dev.post(segment_event(dev, "m1", "s1", data)).json()["results"][0]["status"] == "accepted"
    (seg,) = dev.wait_done("m1")
    assert seg["status"] == "done" and seg["engine"] == "fake-final"
    assert seg["text"] == "fake transcript 1000ms" and seg["language"] == "en"
    assert seg["no_speech"] is False and seg["words"] is None and seg["confidence"] is None
    assert seg["rtf"] is not None and seg["segment_id"] == "s1" and seg["index"] == 0
    assert seg["error"] is None and seg["updated_server_ms"] > 0


def test_event_before_object(client, dev):
    data = wav_bytes(0.5)
    dev.post(segment_event(dev, "m2", "s2", data))
    segs = client.get("/v1/memos/m2/transcript", headers=dev.h).json()["segments"]
    assert segs[0]["status"] == "queued" and segs[0]["text"] is None
    time.sleep(0.3)
    assert client.get("/v1/memos/m2/transcript", headers=dev.h).json()["segments"][0]["status"] == "queued"
    dev.put(data)
    (seg,) = dev.wait_done("m2")
    assert seg["status"] == "done" and seg["text"] == "fake transcript 500ms"


def test_silence_is_no_speech(client, dev):
    data = wav_bytes(1.0, amp=0.0)
    dev.put(data)
    dev.post(segment_event(dev, "m3", "s3", data))
    (seg,) = dev.wait_done("m3")
    assert seg["no_speech"] is True and seg["text"] == ""


def test_poll_and_scoping(client, dev, dev2):
    d1, d2 = wav_bytes(1.0), wav_bytes(0.5)
    dev.put(d1)
    dev.post(segment_event(dev, "m4", "a", d1, 0))
    dev.wait_done("m4")
    r = client.get("/v1/transcripts?since_server_ms=0", headers=dev.h).json()
    assert [s["segment_id"] for s in r["segments"]] == ["a"]
    cursor = r["now_server_ms"] + 1
    time.sleep(0.01)
    assert client.get(f"/v1/transcripts?since_server_ms={cursor}", headers=dev.h).json()["segments"] == []
    dev.put(d2)
    dev.post(segment_event(dev, "m4", "b", d2, 1))
    dev.wait_done("m4", 2)
    r = client.get(f"/v1/transcripts?since_server_ms={cursor}", headers=dev.h).json()
    assert [s["segment_id"] for s in r["segments"]] == ["b"]
    # Another device sees nothing of this.
    assert client.get("/v1/transcripts?since_server_ms=0", headers=dev2.h).json()["segments"] == []
    assert client.get("/v1/memos/m4/transcript", headers=dev2.h).json()["segments"] == []


def test_retry_then_fail_and_requeue_on_startup(client, dev, monkeypatch):
    st = client.app.state.fls
    calls = []

    def boom(audio, sr, context=""):
        calls.append(1)
        raise RuntimeError("engine exploded")

    monkeypatch.setattr(st.final_engine, "transcribe", boom)
    data = wav_bytes()
    dev.put(data)
    dev.post(segment_event(dev, "m5", "s5", data))
    (seg,) = dev.wait_done("m5")
    assert seg["status"] == "failed" and "engine exploded" in seg["error"]
    assert len(calls) == 3  # first attempt plus two retries

    # A job left 'running' by a crash is re-queued by a worker start.
    st.db.execute("UPDATE jobs SET status='running', attempts=0")
    st.db.execute("UPDATE transcripts SET status='running'")
    monkeypatch.undo()
    st.worker.stop()
    st.worker._stop.clear()
    st.worker.start()
    (seg,) = dev.wait_done("m5")
    assert seg["status"] == "done"
