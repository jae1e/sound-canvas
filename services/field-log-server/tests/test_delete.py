import hashlib

from conftest import sha, wav_bytes
from test_flow import segment_event
from test_languages import create_memo


def objpath(client, h):
    return client.app.state.fls.store.path(h)


def test_delete_memo(client, dev):
    st = client.app.state.fls
    st.worker.stop()  # keep jobs queued so we can see them cancelled
    shared, own, img = wav_bytes(1.0), wav_bytes(0.5), b"\xff\xd8\xff" + b"1" * 30
    for b, m in ((shared, "audio/wav"), (own, "audio/wav"), (img, "image/jpeg")):
        dev.put(b, m)
    evs = [create_memo(dev, "m1"), create_memo(dev, "m2")]
    other = [
        dev.event("photo_added", {"memo_id": "m1", "photo_id": "p1", "object_sha256": sha(img),
                                  "mime": "image/jpeg", "bytes": len(img), "source": "camera"}),
    ]
    dev.commit(other[0])
    evs += other
    for memo, seg, data in (("m1", "s1", shared), ("m1", "s2", own), ("m2", "s3", shared)):
        e = segment_event(dev, memo, seg, data)
        evs.append(e)
    note = dev.event("memo_note", {"memo_id": "m1", "text": "secret words"})
    dev.commit(note)
    evs.append(note)
    assert all(r["status"] == "accepted" for r in dev.post(*evs).json()["results"])
    hash_before = st.db.one("SELECT record_hash FROM events WHERE type='memo_note'")["record_hash"]
    assert st.db.one("SELECT COUNT(*) c FROM jobs WHERE status='queued'")["c"] == 3

    d = dev.event("memo_deleted", {"memo_id": "m1"})
    dev.commit(d)
    assert dev.post(d).json()["results"][0]["status"] == "accepted"

    # Cancelled jobs for m1, the job for m2 untouched.
    rows = {r["segment_id"]: r["status"] for r in st.db.query("SELECT segment_id, status FROM jobs")}
    assert rows == {"s1": "cancelled", "s2": "cancelled", "s3": "queued"}
    # Objects: the shared one stays (m2 uses it); the unique audio and the photo are gone.
    assert objpath(client, sha(shared)).exists() and not objpath(client, sha(own)).exists()
    assert not objpath(client, sha(img)).exists()
    assert client.get(f"/v1/objects/{sha(own)}", headers=dev.h).status_code == 404
    assert client.get(f"/v1/objects/{sha(shared)}", headers=dev.h).status_code == 200
    tomb = {r["sha256"] for r in st.db.query("SELECT sha256 FROM object_tombstones")}
    assert tomb == {sha(own), sha(img)}
    assert st.db.one("SELECT 1 FROM objects WHERE sha256=?", (sha(own),)) is None
    # Transcripts and notes.
    assert client.get("/v1/memos/m1/transcript", headers=dev.h).status_code == 404
    assert [s["segment_id"] for s in client.get("/v1/memos/m2/transcript", headers=dev.h).json()["segments"]] == ["s3"]
    assert [s["segment_id"] for s in client.get("/v1/transcripts", headers=dev.h).json()["segments"]] == ["s3"]
    m = st.db.one("SELECT note, deleted_server_ms FROM memos WHERE memo_id='m1'")
    assert m["note"] is None and m["deleted_server_ms"] is not None
    ev = st.db.one("SELECT payload, redacted, record_hash FROM events WHERE type='memo_note'")
    assert ev["redacted"] == 1 and "secret" not in ev["payload"] and ev["record_hash"] == hash_before
    # The chain still accepts later events, and a stale segment of the deleted memo is ignored.
    later = dev.event("clock_sync", {"offset_ms": 1, "rtt_ms": 2, "server_ms": 3})
    dev.commit(later)
    stale = segment_event(dev, "m1", "s9", own)
    r = dev.post(later, stale).json()
    assert [x["status"] for x in r["results"]] == ["accepted", "accepted"]
    assert st.db.one("SELECT COUNT(*) c FROM transcripts WHERE memo_id='m1'")["c"] == 0
    dev.put(own)  # a late upload must not resurrect a job
    assert st.db.one("SELECT COUNT(*) c FROM jobs WHERE segment_id='s9'")["c"] == 0


def test_delete_is_scoped_to_device(client, dev, dev2):
    data = wav_bytes()
    dev.put(data)
    dev.post(create_memo(dev, "mx"), segment_event(dev, "mx", "sx", data))
    d = dev2.event("memo_deleted", {"memo_id": "mx"})
    dev2.commit(d)
    dev2.post(d)
    dev.wait_done("mx")
    assert objpath(client, sha(data)).exists()
    assert len(client.get("/v1/memos/mx/transcript", headers=dev.h).json()["segments"]) == 1
