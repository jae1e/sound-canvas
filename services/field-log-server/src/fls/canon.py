"""Canonical JSON and event hashing (contract section 3)."""

from __future__ import annotations

import hashlib
import json
from typing import Any

MAX_SAFE_INT = 2**53 - 1


def canonical(obj: Any) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def find_problem(obj: Any) -> str | None:
    """Return "float", "range" or "schema" if the value is not canonical-safe, else None."""
    if isinstance(obj, bool) or obj is None or isinstance(obj, str):
        return None
    if isinstance(obj, float):
        return "float"
    if isinstance(obj, int):
        return None if -MAX_SAFE_INT <= obj <= MAX_SAFE_INT else "range"
    if isinstance(obj, list):
        for v in obj:
            p = find_problem(v)
            if p:
                return p
        return None
    if isinstance(obj, dict):
        for k, v in obj.items():
            if not isinstance(k, str) or not k.isascii():
                return "schema"
            p = find_problem(v)
            if p:
                return p
        return None
    return "schema"


def record_hash(envelope: dict[str, Any]) -> str:
    body = {k: v for k, v in envelope.items() if k != "record_hash"}
    return sha256_hex(canonical(body).encode("utf-8"))
