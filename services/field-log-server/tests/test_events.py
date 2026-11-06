import copy
import uuid

from conftest import VECTORS, Device, sha, wav_bytes


def mk(dev, n=3):
    evs = []
    for _ in range(n):
        e = dev.event("clock_sync", {"offset_ms": 1, "rtt_ms": 2, "server_ms": 3})
        dev.commit(e)
        evs.append(e)
    return evs


def test_accept_duplicate_and_last_seq(client, dev):
    evs = mk(dev)
    r = dev.post(*evs).json()
    assert [x["status"] for x in r["results"]] == ["accepted"] * 3 and r["last_seq"] == 3
    assert [x["event_id"] for x in r["results"]] == [e["event_id"] for e in evs]
    r = dev.post(*evs[:2]).json()
    assert [x["status"] for x in r["results"]] == ["duplicate"] * 2 and r["last_seq"] == 3


def test_gap(client, dev):
    evs = mk(dev)
    r = dev.post(evs[1], evs[2]).json()
    assert [(x["status"], x.get("reason")) for x in r["results"]] == [("rejected", "gap")] * 2
    assert r["last_seq"] == 0
    r = dev.post(*evs).json()
    assert r["last_seq"] == 3


def test_hash_mismatch_and_bad_prev(client, dev):
    e1 = dev.event("clock_sync", {"offset_ms": 1, "rtt_ms": 2, "server_ms": 3})
    bad = copy.deepcopy(e1)
    bad["payload"]["offset_ms"] = 99  # tampered after hashing
    r = dev.post(bad).json()
    assert r["results"][0] == {"event_id": bad["event_id"], "status": "rejected", "reason": "hash"}
    bad_prev = dev.event("clock_sync", {"a": 1}, prev="ab" * 32)  # hashed but wrong prev
    r = dev.post(bad_prev).json()
    assert r["results"][0]["reason"] == "hash" and r["last_seq"] == 0
    assert dev.post(e1).json()["last_seq"] == 1


def test_float_rejected(client, dev):
    # Build the body by hand so the float survives JSON encoding.
    e = dev.event("clock_sync", {"offset_ms": 1, "rtt_ms": 2, "server_ms": 3})
    e["payload"]["offset_ms"] = 1.5
    r = dev.post(e).json()
    assert r["results"][0]["status"] == "rejected" and r["results"][0]["reason"] == "float"
    e2 = dev.event("clock_sync", {"x": 1})
    e2["payload"]["x"] = 1.0
    assert dev.post(e2).json()["results"][0]["reason"] == "float"


def test_wrong_device_and_schema_and_limit(client, dev, dev2):
    e = dev2.event("clock_sync", {"a": 1})
    assert dev.post(e).json()["results"][0]["reason"] == "device"
    assert dev.post({"nope": 1}).json()["results"][0]["reason"] == "schema"
    many = [dev.event("clock_sync", {"a": 1}, seq=i + 1) for i in range(201)]
    assert dev.post(*many).status_code == 413


def test_unknown_type_stored(client, dev):
    e = dev.event("future_thing", {"zzz": [1, 2]})
    assert dev.post(e).json()["results"][0]["status"] == "accepted"
    row = client.app.state.fls.db.one("SELECT type, payload FROM events WHERE device_id=?", (dev.id,))
    assert row["type"] == "future_thing" and row["payload"] == '{"zzz":[1,2]}'


def test_device_chains_are_independent(client, dev, dev2):
    assert dev.post(*mk(dev, 2)).json()["last_seq"] == 2
    assert dev2.post(*mk(dev2, 1)).json()["last_seq"] == 1


def test_projections(client, dev):
    data = wav_bytes()
    img = b"\xff\xd8\xff" + b"0" * 20
    evs = [
        dev.event("memo_created", {"memo_id": "m1", "kind": "photo", "tz": "Asia/Seoul",
                                   "retention_class": "standard"}),
    ]
    dev.commit(evs[0])
    for t, p in [
        ("photo_added", {"memo_id": "m1", "photo_id": "p1", "object_sha256": sha(img),
                         "mime": "image/jpeg", "bytes": len(img), "source": "camera"}),
        ("recording_started", {"memo_id": "m1", "recording_id": "rec1", "route": {"type": "builtin_mic"},
                               "source": "UNPROCESSED", "sample_rate": 16000,
                               "effects": {"ns": "off", "agc": "off", "aec": "off"}}),
        ("segment_closed", dev.segment_payload("m1", "s1", data)),
        ("recording_stopped", {"memo_id": "m1", "recording_id": "rec1", "reason": "user"}),
        ("memo_note", {"memo_id": "m1", "text": "hello"}),
    ]:
        e = dev.event(t, p)
        dev.commit(e)
        evs.append(e)
    r = dev.post(*evs).json()
    assert all(x["status"] == "accepted" for x in r["results"])
    db = client.app.state.fls.db
    assert db.one("SELECT kind, note FROM memos")["note"] == "hello"
    assert db.one("SELECT object_sha256 FROM photos")["object_sha256"] == sha(img)
    assert db.one("SELECT stop_reason FROM recordings")["stop_reason"] == "user"
    assert db.one("SELECT idx, duration_ms FROM segments")["duration_ms"] == 1000


def test_malformed_known_payload_does_not_stall_chain(client, dev):
    e = dev.event("segment_closed", {"memo_id": "m1"})  # missing fields
    dev.commit(e)
    assert dev.post(e).json()["results"][0]["status"] == "accepted"
    assert client.app.state.fls.db.one("SELECT COUNT(*) c FROM segments")["c"] == 0


def test_vector_chain_through_api(client):
    st = client.app.state.fls
    import hashlib

    token = "fls_vector_token"
    st.db.execute(
        "INSERT INTO devices(device_id, token_hash, created_server_ms) VALUES (?,?,0)",
        ("dev_test_1", hashlib.sha256(token.encode()).hexdigest()),
    )
    events = []
    for item in VECTORS["chain"]:
        e = dict(item["envelope_without_record_hash"])
        e["record_hash"] = item["record_hash"]
        events.append(e)
    r = client.post("/v1/events", json={"events": events}, headers={"Authorization": f"Bearer {token}"})
    assert [x["status"] for x in r.json()["results"]] == ["accepted"] * len(events)
    assert r.json()["last_seq"] == len(events)
