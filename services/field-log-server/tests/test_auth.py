import time

import pytest

from fls import auth
from conftest import pair

PROTECTED = [
    ("GET", "/v1/health", None),
    ("POST", "/v1/clock", {"client_send_wall_ms": 1, "client_send_elapsed_us": 1}),
    ("PUT", "/v1/objects/" + "0" * 64, None),
    ("HEAD", "/v1/objects/" + "0" * 64, None),
    ("GET", "/v1/objects/" + "0" * 64, None),
    ("POST", "/v1/events", {"events": []}),
    ("GET", "/v1/memos/x/transcript", None),
    ("GET", "/v1/transcripts?since_server_ms=0", None),
]


@pytest.mark.parametrize("method,path,body", PROTECTED)
def test_401_without_or_with_bad_token(client, method, path, body):
    for headers in ({}, {"Authorization": "Bearer nope"}, {"Authorization": "Basic abc"}):
        r = client.request(method, path, json=body, headers=headers)
        assert r.status_code == 401, (method, path, headers)


def test_revoked_token_rejected(client, dev):
    assert client.get("/v1/health", headers=dev.h).status_code == 200
    assert auth.revoke(client.app.state.fls.db, dev.id)
    assert client.get("/v1/health", headers=dev.h).status_code == 401


def test_pairing_code_format_single_use_and_wrong(client):
    st = client.app.state.fls
    code = auth.create_pairing_code(st.db)
    assert len(code) == 8 and set(code) <= set("0123456789ABCDEFGHJKMNPQRSTVWXYZ")
    body = {"pairing_code": code, "device": {"model": "m"}}
    r = client.post("/v1/enroll", json=body)
    assert r.status_code == 200
    assert set(r.json()) == {"device_id", "token", "server_time_ms"}
    assert client.post("/v1/enroll", json=body).status_code == 403
    assert client.post("/v1/enroll", json={"pairing_code": "ZZZZZZZZ", "device": {}}).status_code == 403


def test_pairing_code_expiry(client):
    st = client.app.state.fls
    code = auth.create_pairing_code(st.db)
    st.db.execute("UPDATE pairing_codes SET expires_server_ms=?", (int(time.time() * 1000) - 1,))
    r = client.post("/v1/enroll", json={"pairing_code": code, "device": {}})
    assert r.status_code == 403


def test_code_is_case_insensitive_and_only_hash_stored(client):
    st = client.app.state.fls
    code = auth.create_pairing_code(st.db)
    assert all(code not in str(tuple(r)) for r in st.db.query("SELECT * FROM pairing_codes"))
    r = client.post("/v1/enroll", json={"pairing_code": code.lower(), "device": {}})
    assert r.status_code == 200
    token = r.json()["token"]
    assert all(token not in str(tuple(r)) for r in st.db.query("SELECT * FROM devices"))


def test_health_and_clock(client, dev):
    h = client.get("/v1/health", headers=dev.h).json()
    assert h["final_engine"] == "fake-final" and h["streaming_available"] is True
    assert {"server_time_ms", "version", "streaming_engine"} <= set(h)
    r = client.post("/v1/clock", json={"client_send_wall_ms": 5, "client_send_elapsed_us": 7}, headers=dev.h).json()
    assert r["client_send_wall_ms"] == 5 and r["client_send_elapsed_us"] == 7
    assert r["server_send_ms"] >= r["server_recv_ms"] > 0


def test_host_policy():
    from fls.net import validate_host

    assert validate_host("127.0.0.1") == "127.0.0.1"
    assert validate_host("100.84.83.35") == "100.84.83.35"
    for bad in ("0.0.0.0", "::", "192.168.1.5", "100.128.0.1", "localhost", "8.8.8.8", "::1"):
        with pytest.raises(SystemExit):
            validate_host(bad)
