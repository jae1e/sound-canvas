"""Device tokens and pairing codes. Only SHA-256 hashes are stored."""

from __future__ import annotations

import hashlib
import hmac
import secrets
import threading
import time
import uuid
from typing import Any

from .config import PAIRING_TTL_S
from .db import Database, now_ms

CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"  # no I, L, O, U


def _h(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def normalize_code(code: str) -> str:
    return "".join(ch for ch in code.upper() if ch not in " -")


def create_pairing_code(db: Database) -> str:
    code = "".join(secrets.choice(CROCKFORD) for _ in range(8))
    t = now_ms()
    db.execute(
        "INSERT INTO pairing_codes(code_hash, expires_server_ms) VALUES (?,?)",
        (_h(code), t + PAIRING_TTL_S * 1000),
    )
    return code


class EnrollLimiter:
    """Allow at most `limit` failed enrolments per `window_s` seconds (all callers)."""

    def __init__(self, limit: int = 10, window_s: float = 60.0):
        self.limit, self.window_s = limit, window_s
        self._fails: list[float] = []
        self._lock = threading.Lock()

    def blocked(self) -> bool:
        with self._lock:
            cutoff = time.monotonic() - self.window_s
            self._fails = [t for t in self._fails if t > cutoff]
            return len(self._fails) >= self.limit

    def fail(self) -> None:
        with self._lock:
            self._fails.append(time.monotonic())


def enroll(db: Database, code: str, info: dict[str, Any]) -> tuple[str, str] | None:
    """Consume the code and create a device. Returns (device_id, token) or None."""
    code_hash = _h(normalize_code(code))
    t = now_ms()
    with db.tx() as c:
        cur = c.execute(
            "UPDATE pairing_codes SET used_server_ms=? "
            "WHERE code_hash=? AND used_server_ms IS NULL AND expires_server_ms>=?",
            (t, code_hash, t),
        )
        if cur.rowcount != 1:
            return None
        device_id = "dev_" + uuid.uuid4().hex[:16]
        token = "fls_" + secrets.token_urlsafe(32)
        c.execute(
            "INSERT INTO devices(device_id, token_hash, model, manufacturer, os_version, "
            "app_version, install_id, app_package, created_server_ms) VALUES (?,?,?,?,?,?,?,?,?)",
            (
                device_id,
                _h(token),
                *(str(info.get(k, ""))[:200] for k in
                  ("model", "manufacturer", "os_version", "app_version", "install_id")),
                str(info.get("app_package") or "com.jae1e.fieldvoicelog")[:200],
                t,
            ),
        )
    return device_id, token


def authenticate(db: Database, header: str | None) -> str | None:
    """Return the device_id for a valid `Bearer` header, else None."""
    if not header:
        return None
    parts = header.split(None, 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    digest = _h(parts[1].strip())
    found = None
    for row in db.query("SELECT device_id, token_hash FROM devices WHERE revoked_server_ms IS NULL"):
        if hmac.compare_digest(row["token_hash"], digest):
            found = row["device_id"]
    return found


def revoke(db: Database, device_id: str) -> bool:
    with db.tx() as c:
        cur = c.execute(
            "UPDATE devices SET revoked_server_ms=? WHERE device_id=? AND revoked_server_ms IS NULL",
            (now_ms(), device_id),
        )
        return cur.rowcount == 1
