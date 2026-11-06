from conftest import sha, wav_bytes


def test_put_head_get(client, dev):
    data = wav_bytes()
    r = dev.put(data)
    assert r.status_code == 201 and r.json() == {"sha256": sha(data), "size": len(data)}
    assert dev.put(data).status_code == 200
    assert client.head(f"/v1/objects/{sha(data)}", headers=dev.h).status_code == 200
    g = client.get(f"/v1/objects/{sha(data)}", headers=dev.h)
    assert g.status_code == 200 and g.content == data
    assert client.head("/v1/objects/" + "a" * 64, headers=dev.h).status_code == 404
    assert client.get("/v1/objects/" + "a" * 64, headers=dev.h).status_code == 404


def test_hash_mismatch_422_and_nothing_stored(client, dev):
    data = wav_bytes()
    r = client.put("/v1/objects/" + "b" * 64, content=data, headers={**dev.h, "Content-Type": "audio/wav"})
    assert r.status_code == 422
    assert client.head("/v1/objects/" + "b" * 64, headers=dev.h).status_code == 404
    objs = client.app.state.fls.paths.objects
    assert [p for p in objs.rglob("*") if p.is_file()] == []


def test_bad_path_and_content_type(client, dev):
    assert dev.put(b"x", "text/plain").status_code == 415
    r = client.put("/v1/objects/ABC", content=b"x", headers={**dev.h, "Content-Type": "audio/wav"})
    assert r.status_code == 422


def test_scoping(client, dev, dev2):
    data = wav_bytes()
    dev.put(data)
    url = f"/v1/objects/{sha(data)}"
    assert client.head(url, headers=dev2.h).status_code == 404
    assert client.get(url, headers=dev2.h).status_code == 404
    # The second device proves possession by uploading the same bytes.
    assert dev2.put(data).status_code == 200
    assert client.get(url, headers=dev2.h).status_code == 200


def test_too_large(client, dev, monkeypatch):
    import fls.store as store
    import fls.app as app

    monkeypatch.setattr(store, "MAX_OBJECT_BYTES", 100)
    monkeypatch.setattr(app, "MAX_OBJECT_BYTES", 100)
    assert dev.put(b"x" * 500, "image/jpeg").status_code == 413
