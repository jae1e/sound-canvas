"""Event ingestion: validation, hash chain, projections, job enqueue (contract section 3)."""

from __future__ import annotations

import json
import logging
import sqlite3
from typing import Any, Callable

from .canon import canonical, find_problem, record_hash
from .db import Database, now_ms

log = logging.getLogger("fls.events")

INT_FIELDS = ("seq", "wall_ms", "elapsed_us", "boot_count")
STR_FIELDS = ("event_id", "device_id", "type", "prev_hash", "record_hash")


def _is_int(v: Any) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


def _shape_ok(ev: Any) -> bool:
    if not isinstance(ev, dict):
        return False
    if not all(isinstance(ev.get(k), str) for k in STR_FIELDS):
        return False
    if not all(_is_int(ev.get(k)) for k in INT_FIELDS):
        return False
    return isinstance(ev.get("payload"), dict)


def _j(v: Any) -> str | None:
    return None if v is None else canonical(v)


def last_seq(db: Database, device_id: str) -> int:
    row = db.one("SELECT MAX(seq) AS s FROM events WHERE device_id=?", (device_id,))
    return int(row["s"] or 0)


def ingest(
    db: Database,
    device_id: str,
    events: list[Any],
    object_exists: Callable[[str], bool],
) -> tuple[list[dict[str, Any]], int, bool]:
    """Process events in order. Returns (results, last_seq, jobs_enqueued)."""
    results: list[dict[str, Any]] = []
    enqueued = False
    for ev in events:
        res, enq = _ingest_one(db, device_id, ev, object_exists)
        results.append(res)
        enqueued = enqueued or enq
    return results, last_seq(db, device_id), enqueued


def _ingest_one(db, device_id, ev, object_exists) -> tuple[dict[str, Any], bool]:
    event_id = ev.get("event_id") if isinstance(ev, dict) else None
    out: dict[str, Any] = {"event_id": event_id if isinstance(event_id, str) else None}

    def rej(reason: str):
        out.update(status="rejected", reason=reason)
        return out, False

    if not isinstance(ev, dict):
        return rej("schema")
    problem = find_problem(ev)
    if problem:
        return rej(problem)
    if not _shape_ok(ev):
        return rej("schema")
    if ev["device_id"] != device_id:
        return rej("device")
    seq = ev["seq"]
    if seq < 1:
        return rej("schema")

    with db.tx() as c:
        known = c.execute(
            "SELECT record_hash FROM events WHERE device_id=? AND event_id=?",
            (device_id, ev["event_id"]),
        ).fetchone()
        if known is not None:
            if known["record_hash"] == ev["record_hash"] and record_hash(ev) == ev["record_hash"]:
                out["status"] = "duplicate"
                return out, False
            out.update(status="rejected", reason="hash")
            return out, False
        if record_hash(ev) != ev["record_hash"]:
            out.update(status="rejected", reason="hash")
            return out, False
        row = c.execute(
            "SELECT seq, record_hash FROM events WHERE device_id=? ORDER BY seq DESC LIMIT 1",
            (device_id,),
        ).fetchone()
        cur_seq = row["seq"] if row else 0
        cur_hash = row["record_hash"] if row else ""
        if seq > cur_seq + 1:
            out.update(status="rejected", reason="gap")
            return out, False
        if seq <= cur_seq:
            out.update(status="rejected", reason="seq_conflict")
            return out, False
        if ev["prev_hash"] != cur_hash:
            out.update(status="rejected", reason="hash")
            return out, False
        t = now_ms()
        c.execute(
            "INSERT INTO events(device_id, seq, event_id, type, wall_ms, elapsed_us, boot_count, "
            "payload, prev_hash, record_hash, received_server_ms) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (device_id, seq, ev["event_id"], ev["type"], ev["wall_ms"], ev["elapsed_us"],
             ev["boot_count"], canonical(ev["payload"]), ev["prev_hash"], ev["record_hash"], t),
        )
        enq = False
        try:
            c.execute("SAVEPOINT proj")
            enq = _project(c, device_id, ev, t, object_exists)
            c.execute("RELEASE proj")
        except (KeyError, TypeError, ValueError, sqlite3.Error) as e:
            # The event is valid and chained; a malformed payload must not stall the device.
            c.execute("ROLLBACK TO proj")
            c.execute("RELEASE proj")
            log.warning("projection skipped event=%s type=%s err=%s", ev["event_id"], ev["type"],
                        type(e).__name__)
    out["status"] = "accepted"
    return out, enq


def _project(c: sqlite3.Connection, dev: str, ev: dict[str, Any], t: int, object_exists) -> bool:
    typ, p = ev["type"], ev["payload"]
    if typ == "memo_created":
        c.execute(
            "INSERT OR IGNORE INTO memos(device_id, memo_id, kind, tz, retention_class, "
            "created_wall_ms, location) VALUES (?,?,?,?,?,?,?)",
            (dev, p["memo_id"], p.get("kind"), p.get("tz"), p.get("retention_class"),
             ev["wall_ms"], _j(p.get("location"))),
        )
    elif typ == "photo_added":
        c.execute(
            "INSERT OR IGNORE INTO photos(device_id, photo_id, memo_id, object_sha256, mime, bytes, "
            "width, height, source, taken_wall_ms, location) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (dev, p["photo_id"], p["memo_id"], p["object_sha256"], p.get("mime"), p.get("bytes"),
             p.get("width"), p.get("height"), p.get("source"), p.get("taken_wall_ms"),
             _j(p.get("location"))),
        )
    elif typ == "recording_started":
        c.execute(
            "INSERT OR IGNORE INTO recordings(device_id, recording_id, memo_id, route, source, "
            "sample_rate, effects, location, started_wall_ms) VALUES (?,?,?,?,?,?,?,?,?)",
            (dev, p["recording_id"], p["memo_id"], _j(p.get("route")), p.get("source"),
             p.get("sample_rate"), _j(p.get("effects")), _j(p.get("location")), ev["wall_ms"]),
        )
    elif typ == "route_changed":
        c.execute("UPDATE recordings SET route=? WHERE device_id=? AND recording_id=?",
                  (_j(p.get("route")), dev, p["recording_id"]))
    elif typ == "recording_stopped":
        c.execute(
            "UPDATE recordings SET stopped_wall_ms=?, stop_reason=? WHERE device_id=? AND recording_id=?",
            (ev["wall_ms"], p.get("reason"), dev, p["recording_id"]),
        )
    elif typ == "memo_note":
        c.execute("UPDATE memos SET note=? WHERE device_id=? AND memo_id=?",
                  (p["text"], dev, p["memo_id"]))
    elif typ == "segment_closed":
        sha = p["object_sha256"]
        c.execute(
            "INSERT OR IGNORE INTO segments(device_id, segment_id, memo_id, recording_id, idx, "
            "object_sha256, bytes, format, start_elapsed_us, end_elapsed_us, start_wall_ms, "
            "duration_ms, peak_dbfs_x100, clipped_samples, hf_ratio_4k_ppm, flags, recovered) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (dev, p["segment_id"], p["memo_id"], p["recording_id"], p["index"], sha, p.get("bytes"),
             p.get("format"), p.get("start_elapsed_us"), p.get("end_elapsed_us"),
             p.get("start_wall_ms"), p.get("duration_ms"), p.get("peak_dbfs_x100"),
             p.get("clipped_samples"), p.get("hf_ratio_4k_ppm"), _j(p.get("flags")),
             1 if p.get("recovered") else 0),
        )
        c.execute(
            "INSERT OR IGNORE INTO transcripts(device_id, segment_id, memo_id, idx, status, "
            "updated_server_ms) VALUES (?,?,?,?, 'queued', ?)",
            (dev, p["segment_id"], p["memo_id"], p["index"], t),
        )
        if object_exists(sha):
            return enqueue_job(c, dev, p["segment_id"], sha, t)
    # clock_sync and unknown types are stored only.
    return False


def enqueue_job(c: sqlite3.Connection, dev: str, segment_id: str, sha: str, t: int) -> bool:
    cur = c.execute(
        "INSERT OR IGNORE INTO jobs(device_id, segment_id, object_sha256, status, "
        "created_server_ms, updated_server_ms) VALUES (?,?,?, 'queued', ?, ?)",
        (dev, segment_id, sha, t, t),
    )
    return cur.rowcount == 1


def enqueue_for_object(db: Database, sha: str) -> bool:
    """Called after an object PUT completes: enqueue jobs for segments waiting on it."""
    t = now_ms()
    any_new = False
    with db.tx() as c:
        for r in c.execute("SELECT device_id, segment_id FROM segments WHERE object_sha256=?", (sha,)).fetchall():
            any_new = enqueue_job(c, r["device_id"], r["segment_id"], sha, t) or any_new
    return any_new
