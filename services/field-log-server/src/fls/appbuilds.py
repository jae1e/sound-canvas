"""App updates (contract section 9): published APK builds, stored content-addressed under <data>/app/."""

from __future__ import annotations

import hashlib
import logging
import os
import shutil
import zipfile
from pathlib import Path

from starlette.responses import FileResponse

from .db import Database, now_ms

log = logging.getLogger("fls.app")
KEEP_BUILDS = 3
APK_MIME = "application/vnd.android.package-archive"
CHUNK = 1024 * 1024  # large chunks: the phone is on a slow relayed link, the server must not be the bottleneck


class ApkResponse(FileResponse):
    """FileResponse (HTTP Range, Content-Length, Accept-Ranges) with 1 MiB reads."""
    chunk_size = CHUNK


def apk_dir(root: Path) -> Path:
    d = root / "app"
    d.mkdir(parents=True, exist_ok=True)
    return d


def latest(db: Database):
    return db.one("SELECT * FROM app_builds ORDER BY version_code DESC LIMIT 1")


def build_json(r, current: int | None = None) -> dict:
    out = {k: r[k] for k in ("version_code", "version_name", "git_sha", "sha256", "bytes", "built_ms", "notes")}
    out["newer"] = current is not None and r["version_code"] > current
    return out


def publish(db: Database, root: Path, apk: Path, version_code: int, version_name: str, git_sha: str,
            notes: str, force: bool = False) -> dict:
    if not zipfile.is_zipfile(apk):
        raise ValueError("not a zip file")
    with zipfile.ZipFile(apk) as z:
        if "AndroidManifest.xml" not in z.namelist():
            raise ValueError("no AndroidManifest.xml: not an APK")
    cur = latest(db)
    if cur is not None and version_code <= cur["version_code"] and not force:
        raise ValueError(f"version_code {version_code} is not greater than the latest ({cur['version_code']}); "
                         "use --force")
    h = hashlib.sha256()
    with open(apk, "rb") as f:
        for b in iter(lambda: f.read(CHUNK), b""):
            h.update(b)
    sha = h.hexdigest()
    dest = apk_dir(root) / f"{sha}.apk"
    if not dest.exists():
        tmp = dest.with_suffix(".tmp")
        shutil.copyfile(apk, tmp)
        os.replace(tmp, dest)
    with db.tx() as c:
        replaced = c.execute("SELECT sha256 FROM app_builds WHERE version_code=?", (version_code,)).fetchall()
        c.execute("INSERT OR REPLACE INTO app_builds(version_code, version_name, git_sha, sha256, bytes, "
                  "built_ms, notes) VALUES (?,?,?,?,?,?,?)",
                  (version_code, version_name, git_sha, sha, dest.stat().st_size, now_ms(), notes))
        old = c.execute("SELECT version_code, sha256 FROM app_builds ORDER BY version_code DESC LIMIT -1 OFFSET ?",
                        (KEEP_BUILDS,)).fetchall()
        for r in old:
            c.execute("DELETE FROM app_builds WHERE version_code=?", (r["version_code"],))
    for r in [*old, *replaced]:
        if not db.one("SELECT 1 FROM app_builds WHERE sha256=?", (r["sha256"],)):
            (apk_dir(root) / f"{r['sha256']}.apk").unlink(missing_ok=True)
    return build_json(latest(db))
