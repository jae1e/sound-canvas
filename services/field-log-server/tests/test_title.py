from fastapi.testclient import TestClient

from fls.dashboard import create_dashboard
from conftest import wav_bytes
from test_flow import segment_event
from test_languages import create_memo


def title(dev, memo, text):
    e = dev.event("memo_titled", {"memo_id": memo, "title": text})
    dev.commit(e)
    return e


def get_title(client, memo="m1"):
    return client.app.state.fls.db.one("SELECT title FROM memos WHERE memo_id=?", (memo,))["title"]


def test_title_latest_wins_trimmed_and_cleared(client, dev):
    dev.post(create_memo(dev, "m1"))
    r = dev.post(title(dev, "m1", "  First  "), title(dev, "m1", "  Pump check  ")).json()
    assert [x["status"] for x in r["results"]] == ["accepted"] * 2
    assert get_title(client) == "Pump check"
    dev.post(title(dev, "m1", "   "))
    assert get_title(client) is None
    dev.post(title(dev, "m1", "x" * 120))
    assert get_title(client) == "x" * 120


def test_invalid_titles_are_chained_but_not_projected(client, dev):
    dev.post(create_memo(dev, "m1"), title(dev, "m1", "good"))
    bad = [title(dev, "m1", "y" * 121), title(dev, "m1", None), title(dev, "nope", "ghost")]
    bad[1]["payload"]["title"] = 5
    from fls.canon import record_hash
    bad[1]["record_hash"] = record_hash(bad[1])  # re-hash after tampering the payload type
    # Re-chain: rebuild events 2 and 3 on top of the new hash of event 2.
    bad[2]["prev_hash"] = bad[1]["record_hash"]
    bad[2]["record_hash"] = record_hash(bad[2])
    r = dev.post(*bad).json()
    assert [x["status"] for x in r["results"]] == ["accepted"] * 3  # the chain never stalls
    assert get_title(client) == "good"
    assert client.app.state.fls.db.one("SELECT COUNT(*) c FROM memos WHERE memo_id='nope'")["c"] == 0


def test_title_of_another_devices_memo_is_ignored(client, dev, dev2):
    dev.post(create_memo(dev, "m1"))
    dev2.post(title(dev2, "m1", "hijack"))
    assert get_title(client) is None


def test_deletion_clears_title_and_redacts_event(client, dev):
    dev.post(create_memo(dev, "m1"), title(dev, "m1", "secret plan"))
    d = dev.event("memo_deleted", {"memo_id": "m1"})
    dev.commit(d)
    dev.post(d)
    db = client.app.state.fls.db
    assert get_title(client) is None
    ev = db.one("SELECT payload, redacted FROM events WHERE type='memo_titled'")
    assert ev["redacted"] == 1 and "secret" not in ev["payload"]
    dev.post(title(dev, "m1", "late"))  # a title for a deleted memo is ignored
    assert get_title(client) is None


def test_dashboard_title_snippet_duration_input(client, dev):
    data = wav_bytes(1.0)
    dev.put(data)
    dev.post(create_memo(dev, "m1"), segment_event(dev, "m1", "s1", data))
    dev.wait_done("m1")
    with TestClient(create_dashboard(client.app.state.fls), base_url="http://127.0.0.1:8790") as dash:
        m = dash.get("/dash/api/memos").json()["memos"][0]
        assert m["title"] is None and m["snippet"] == "fake transcript 1000ms"[:40] and m["duration_ms"] == 1000
        dev.post(title(dev, "m1", "Pump leak"))
        m = dash.get("/dash/api/memos").json()["memos"][0]
        assert m["title"] == "Pump leak"
        d = dash.get("/dash/api/memos/m1").json()
        assert d["title"] == "Pump leak" and d["duration_ms"] == 1000 and d["snippet"].startswith("fake")
