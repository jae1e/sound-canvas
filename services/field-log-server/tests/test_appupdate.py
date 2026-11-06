import zipfile

import pytest

from fls import appbuilds
from fls.db import Database


def make_apk(path, extra=b""):
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("AndroidManifest.xml", b"manifest")
        z.writestr("classes.dex", b"x" * 5000 + extra)
    return path


def test_publish_rules(tmp_path):
    db = Database(tmp_path / "d.sqlite3")
    bad = tmp_path / "bad.apk"
    bad.write_bytes(b"nope")
    with pytest.raises(ValueError):
        appbuilds.publish(db, tmp_path, bad, 1, "1", "g", "")
    nomanifest = tmp_path / "nm.apk"
    with zipfile.ZipFile(nomanifest, "w") as z:
        z.writestr("a", b"b")
    with pytest.raises(ValueError):
        appbuilds.publish(db, tmp_path, nomanifest, 1, "1", "g", "")
    shas = []
    for i in range(1, 6):
        out = appbuilds.publish(db, tmp_path, make_apk(tmp_path / f"{i}.apk", bytes([i])), i * 10, f"0.{i}", "g", "n")
        shas.append(out["sha256"])
    with pytest.raises(ValueError):
        appbuilds.publish(db, tmp_path, make_apk(tmp_path / "x.apk", b"z"), 50, "x", "g", "")
    appbuilds.publish(db, tmp_path, make_apk(tmp_path / "y.apk", b"y"), 50, "forced", "g", "", force=True)
    files = {p.name for p in (tmp_path / "app").glob("*.apk")}
    assert len(files) == 3 and f"{shas[0]}.apk" not in files and f"{shas[1]}.apk" not in files
    assert [r["version_code"] for r in db.query("SELECT version_code FROM app_builds ORDER BY 1")] == [30, 40, 50]


def test_endpoints(client, dev, dev2):
    st = client.app.state.fls
    assert client.get("/v1/app/latest").status_code == 401
    assert client.get("/v1/app/latest?version_code=1", headers=dev.h).status_code == 404
    apk = make_apk(st.paths.root / "a.apk", b"q" * 3_000_000)
    out = appbuilds.publish(st.db, st.paths.root, apk, 100, "1.0", "abc", "notes")
    r = client.get("/v1/app/latest?version_code=99", headers=dev.h).json()
    assert r["newer"] is True and r["sha256"] == out["sha256"] and r["notes"] == "notes"
    assert client.get("/v1/app/latest?version_code=100", headers=dev.h).json()["newer"] is False
    assert st.db.one("SELECT app_version_code FROM devices WHERE device_id=?", (dev.id,))["app_version_code"] == 100
    url = f"/v1/app/apk/{out['sha256']}"
    full = client.get(url, headers=dev.h)
    assert full.status_code == 200 and len(full.content) == out["bytes"]
    assert full.headers["content-type"] == "application/vnd.android.package-archive"
    assert full.headers["accept-ranges"] == "bytes"
    part = client.get(url, headers={**dev.h, "Range": "bytes=1000-"})
    assert part.status_code == 206 and part.content == full.content[1000:]
    assert part.headers["content-range"] == f"bytes 1000-{out['bytes'] - 1}/{out['bytes']}"
    assert client.get("/v1/app/apk/" + "0" * 64, headers=dev.h).status_code == 404
    assert client.get(url).status_code == 401
    # arbitrary stored objects are not served from this route
    assert client.get("/v1/app/apk/" + "a" * 63, headers=dev.h).status_code == 404
