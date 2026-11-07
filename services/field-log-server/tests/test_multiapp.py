import sqlite3

import pytest

from fls import appbuilds, auth
from fls.db import Database
from test_appupdate import make_apk

FIELD = "com.jae1e.fieldvoicelog"
COACH = "com.jae1e.voicelifecompanion"


def enroll(client, package=None):
    db = client.app.state.fls.db
    code = auth.create_pairing_code(db)
    device = {"model": "test"}
    if package is not None:
        device["app_package"] = package
    response = client.post("/v1/enroll", json={"pairing_code": code, "device": device})
    assert response.status_code == 200
    result = response.json()
    return result["device_id"], {"Authorization": f"Bearer {result['token']}"}


def test_enroll_defaults_and_records_package(client):
    default_id, _ = enroll(client)
    coach_id, _ = enroll(client, COACH)
    db = client.app.state.fls.db
    assert db.one("SELECT app_package FROM devices WHERE device_id=?", (default_id,))[0] == FIELD
    assert db.one("SELECT app_package FROM devices WHERE device_id=?", (coach_id,))[0] == COACH


def test_builds_are_retained_and_versioned_per_package(tmp_path):
    db = Database(tmp_path / "db.sqlite3")
    for package in (FIELD, COACH):
        for code in (10, 20, 30, 40):
            apk = make_apk(tmp_path / f"{package}-{code}.apk", bytes([code]), package)
            appbuilds.publish(db, tmp_path, apk, code, str(code), "sha", "")
        assert [r["version_code"] for r in db.query(
            "SELECT version_code FROM app_builds WHERE package=? ORDER BY version_code", (package,))] == [20, 30, 40]
        with pytest.raises(ValueError, match="not greater"):
            appbuilds.publish(db, tmp_path, make_apk(tmp_path / f"{package}-low.apk", b"low", package),
                              15, "15", "", "")


def test_old_database_rows_migrate_to_field_package(tmp_path):
    path = tmp_path / "legacy.sqlite3"
    conn = sqlite3.connect(path)
    conn.executescript("""
      CREATE TABLE devices (device_id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, model TEXT,
        manufacturer TEXT, os_version TEXT, app_version TEXT, install_id TEXT, created_server_ms INTEGER NOT NULL,
        revoked_server_ms INTEGER);
      INSERT INTO devices VALUES ('old', 'hash', NULL, NULL, NULL, NULL, NULL, 1, NULL);
      CREATE TABLE app_builds (version_code INTEGER PRIMARY KEY, version_name TEXT NOT NULL,
        git_sha TEXT NOT NULL DEFAULT '', sha256 TEXT NOT NULL, bytes INTEGER NOT NULL,
        built_ms INTEGER NOT NULL, notes TEXT NOT NULL DEFAULT '');
      INSERT INTO app_builds VALUES (12, '1.2', '', 'abc', 1, 1, 'legacy');
    """)
    conn.close()
    db = Database(path)
    assert db.one("SELECT app_package FROM devices WHERE device_id='old'")[0] == FIELD
    row = db.one("SELECT package, version_code FROM app_builds")
    assert (row["package"], row["version_code"]) == (FIELD, 12)


def test_update_endpoints_are_scoped_both_directions(client):
    _, field_headers = enroll(client)
    _, coach_headers = enroll(client, COACH)
    state = client.app.state.fls
    field_build = appbuilds.publish(state.db, state.paths.root,
                                    make_apk(state.paths.root / "field.apk", b"field", FIELD), 100, "1", "", "")
    coach_build = appbuilds.publish(state.db, state.paths.root,
                                    make_apk(state.paths.root / "coach.apk", b"coach", COACH), 100, "1", "", "")

    assert client.get("/v1/app/latest", headers=field_headers).json()["sha256"] == field_build["sha256"]
    assert client.get("/v1/app/latest", headers=coach_headers).json()["sha256"] == coach_build["sha256"]
    assert client.get(f"/v1/app/apk/{coach_build['sha256']}", headers=field_headers).status_code == 404
    assert client.get(f"/v1/app/apk/{field_build['sha256']}", headers=coach_headers).status_code == 404
    assert client.get(f"/v1/app/apk/{field_build['sha256']}", headers=field_headers).status_code == 200
    assert client.get(f"/v1/app/apk/{coach_build['sha256']}", headers=coach_headers).status_code == 200


def test_package_parser_reads_binary_manifest(tmp_path):
    apk = make_apk(tmp_path / "coach.apk", package=COACH)
    assert appbuilds.package_from_apk(apk) == COACH
