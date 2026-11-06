import threading
import time

from conftest import wav_bytes
from test_flow import segment_event


def test_wait_s_range(client, dev):
    for bad in (0, 26, -1):
        assert client.get(f"/v1/transcripts?since_server_ms=0&wait_s={bad}", headers=dev.h).status_code == 422


def test_timeout_returns_empty(client, dev):
    now = int(time.time() * 1000) + 10_000
    t = time.time()
    r = client.get(f"/v1/transcripts?since_server_ms={now}&wait_s=1", headers=dev.h)
    assert r.status_code == 200 and r.json()["segments"] == [] and 0.8 < time.time() - t < 3


def test_wakes_on_change_and_is_per_device(client, dev, dev2):
    cursor = int(time.time() * 1000) + 1
    box = {}

    def poll(d, key):
        t = time.time()
        box[key] = (client.get(f"/v1/transcripts?since_server_ms={cursor}&wait_s=20", headers=d.h).json(),
                    time.time() - t)

    t1 = threading.Thread(target=poll, args=(dev, "a"), daemon=True)
    t2 = threading.Thread(target=poll, args=(dev2, "b"), daemon=True)
    t1.start(); t2.start()
    time.sleep(0.5)
    data = wav_bytes()
    dev.put(data)
    dev.post(segment_event(dev, "m1", "s1", data))
    t1.join(10)
    assert not t1.is_alive() and box["a"][1] < 8
    assert [s["segment_id"] for s in box["a"][0]["segments"]] == ["s1"]
    assert t2.is_alive()  # the other device keeps waiting
    ev = dev2.event("clock_sync", {"a": 1})  # not a transcript change for it, still waiting
    dev2.commit(ev)
    dev2.post(ev)
    time.sleep(0.2)
    assert t2.is_alive()
    # Let the second poll finish quickly by creating a change for dev2.
    d2 = wav_bytes(0.5)
    dev2.put(d2)
    dev2.post(segment_event(dev2, "m2", "s2", d2, 0))
    t2.join(10)
    assert not t2.is_alive() and [s["segment_id"] for s in box["b"][0]["segments"]] == ["s2"]
