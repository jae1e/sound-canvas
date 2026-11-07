"""Package-scoped Android app updates, stored content-addressed under <data>/app/."""

from __future__ import annotations

import hashlib
import logging
import os
import re
import shutil
import struct
import subprocess
import zipfile
from pathlib import Path

from starlette.responses import FileResponse

from .db import Database, now_ms

log = logging.getLogger("fls.app")
KEEP_BUILDS = 3
APK_MIME = "application/vnd.android.package-archive"
CHUNK = 1024 * 1024
DEFAULT_PACKAGE = "com.jae1e.fieldvoicelog"


class ApkResponse(FileResponse):
    """FileResponse (HTTP Range, Content-Length, Accept-Ranges) with 1 MiB reads."""
    chunk_size = CHUNK


def apk_dir(root: Path) -> Path:
    d = root / "app"
    d.mkdir(parents=True, exist_ok=True)
    return d


def latest(db: Database, package: str = DEFAULT_PACKAGE):
    return db.one("SELECT * FROM app_builds WHERE package=? ORDER BY version_code DESC LIMIT 1", (package,))


def build_json(r, current: int | None = None) -> dict:
    out = {k: r[k] for k in ("version_code", "version_name", "git_sha", "sha256", "bytes", "built_ms", "notes")}
    out["package"] = r["package"]
    out["newer"] = current is not None and r["version_code"] > current
    return out


def _string_pool(data: bytes, off: int) -> list[str]:
    typ, header, size = struct.unpack_from("<HHI", data, off)
    if typ != 0x0001 or header < 28:
        raise ValueError("invalid AndroidManifest.xml string pool")
    count, styles, flags, strings_start, _ = struct.unpack_from("<IIIII", data, off + 8)
    utf8 = bool(flags & 0x100)
    offsets = struct.unpack_from(f"<{count}I", data, off + header)
    base, result = off + strings_start, []

    def length8(pos: int) -> tuple[int, int]:
        n = data[pos]
        return (n, pos + 1) if n & 0x80 == 0 else (((n & 0x7f) << 8) | data[pos + 1], pos + 2)

    def length16(pos: int) -> tuple[int, int]:
        n = struct.unpack_from("<H", data, pos)[0]
        return (n, pos + 2) if n & 0x8000 == 0 else (((n & 0x7fff) << 16) | struct.unpack_from("<H", data, pos + 2)[0], pos + 4)

    for rel in offsets:
        pos = base + rel
        if utf8:
            _, pos = length8(pos)
            n, pos = length8(pos)
            result.append(data[pos:pos + n].decode("utf-8"))
        else:
            n, pos = length16(pos)
            result.append(data[pos:pos + n * 2].decode("utf-16le"))
    return result


def _manifest_package(data: bytes) -> str:
    if len(data) < 8 or struct.unpack_from("<H", data)[0] != 0x0003:
        raise ValueError("AndroidManifest.xml is not binary Android XML")
    strings: list[str] = []
    pos = struct.unpack_from("<H", data, 2)[0]
    while pos + 8 <= len(data):
        typ, header, size = struct.unpack_from("<HHI", data, pos)
        if size < 8 or pos + size > len(data):
            raise ValueError("invalid binary AndroidManifest.xml chunk")
        if typ == 0x0001:
            strings = _string_pool(data, pos)
        elif typ == 0x0102 and strings:  # RES_XML_START_ELEMENT_TYPE
            name_idx = struct.unpack_from("<I", data, pos + 20)[0]
            if strings[name_idx] == "manifest":
                attr_start, attr_size, count = struct.unpack_from("<HHH", data, pos + 24)
                base = pos + 16 + attr_start
                for i in range(count):
                    a = base + i * attr_size
                    name, raw = struct.unpack_from("<II", data, a + 4)
                    value_size, _, value_type = struct.unpack_from("<HBB", data, a + 12)
                    value_data = struct.unpack_from("<I", data, a + 16)[0]
                    if strings[name] == "package":
                        value = strings[raw] if raw != 0xffffffff else (strings[value_data] if value_type == 3 else "")
                        if value:
                            return value
        pos += size
    raise ValueError("cannot read package name from binary AndroidManifest.xml")


def package_from_apk(apk: Path) -> str:
    sdk = Path.home() / "Android/Sdk/build-tools"
    if sdk.is_dir():
        versions = sorted((p for p in sdk.iterdir() if p.is_dir()),
                          key=lambda p: tuple((0, int(x)) if x.isdigit() else (1, x)
                                              for x in re.split(r"(\d+)", p.name)))
        for directory in reversed(versions):
            tool = directory / "aapt2"
            if tool.exists():
                try:
                    out = subprocess.run([str(tool), "dump", "badging", str(apk)], capture_output=True, text=True,
                                         check=True, timeout=15).stdout
                    for line in out.splitlines():
                        if line.startswith("package:"):
                            m = re.search(r"name='([^']+)'", line)
                            if m:
                                return m.group(1)
                except (OSError, subprocess.SubprocessError):
                    break
    try:
        with zipfile.ZipFile(apk) as z:
            return _manifest_package(z.read("AndroidManifest.xml"))
    except (zipfile.BadZipFile, KeyError, struct.error, IndexError, UnicodeDecodeError) as e:
        raise ValueError("not a valid APK with AndroidManifest.xml") from e


def publish(db: Database, root: Path, apk: Path, version_code: int, version_name: str, git_sha: str,
            notes: str, force: bool = False) -> dict:
    if not zipfile.is_zipfile(apk):
        raise ValueError("not a zip file")
    try:
        with zipfile.ZipFile(apk) as z:
            if "AndroidManifest.xml" not in z.namelist():
                raise ValueError("no AndroidManifest.xml: not an APK")
        package = package_from_apk(apk)
    except zipfile.BadZipFile as e:
        raise ValueError("not a valid APK") from e
    cur = latest(db, package)
    if cur is not None and version_code <= cur["version_code"] and not force:
        raise ValueError(f"version_code {version_code} is not greater than the latest for {package} ({cur['version_code']}); use --force")
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
        replaced = c.execute("SELECT sha256 FROM app_builds WHERE package=? AND version_code=?", (package, version_code)).fetchall()
        c.execute("INSERT OR REPLACE INTO app_builds(package, version_code, version_name, git_sha, sha256, bytes, built_ms, notes) "
                  "VALUES (?,?,?,?,?,?,?,?)", (package, version_code, version_name, git_sha, sha, dest.stat().st_size, now_ms(), notes))
        old = c.execute("SELECT version_code, sha256 FROM app_builds WHERE package=? ORDER BY version_code DESC LIMIT -1 OFFSET ?",
                        (package, KEEP_BUILDS)).fetchall()
        for r in old:
            c.execute("DELETE FROM app_builds WHERE package=? AND version_code=?", (package, r["version_code"]))
    for r in [*old, *replaced]:
        if not db.one("SELECT 1 FROM app_builds WHERE sha256=?", (r["sha256"],)):
            (apk_dir(root) / f"{r['sha256']}.apk").unlink(missing_ok=True)
    return build_json(latest(db, package))
