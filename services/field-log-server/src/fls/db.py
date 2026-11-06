"""SQLite access: one shared connection guarded by a lock, WAL mode."""

from __future__ import annotations

import sqlite3
import threading
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

SCHEMA = """
CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  model TEXT, manufacturer TEXT, os_version TEXT, app_version TEXT, install_id TEXT,
  created_server_ms INTEGER NOT NULL,
  revoked_server_ms INTEGER
);
CREATE TABLE IF NOT EXISTS pairing_codes (
  code_hash TEXT PRIMARY KEY,
  expires_server_ms INTEGER NOT NULL,
  used_server_ms INTEGER
);
CREATE TABLE IF NOT EXISTS objects (
  sha256 TEXT PRIMARY KEY,
  size INTEGER NOT NULL,
  mime TEXT NOT NULL,
  created_server_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS object_owners (
  sha256 TEXT NOT NULL,
  device_id TEXT NOT NULL,
  PRIMARY KEY (sha256, device_id)
);
CREATE TABLE IF NOT EXISTS events (
  device_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  event_id TEXT NOT NULL,
  type TEXT NOT NULL,
  wall_ms INTEGER NOT NULL,
  elapsed_us INTEGER NOT NULL,
  boot_count INTEGER NOT NULL,
  payload TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  record_hash TEXT NOT NULL,
  received_server_ms INTEGER NOT NULL,
  PRIMARY KEY (device_id, seq)
);
CREATE UNIQUE INDEX IF NOT EXISTS events_event_id ON events(device_id, event_id);
CREATE TABLE IF NOT EXISTS memos (
  device_id TEXT NOT NULL, memo_id TEXT NOT NULL,
  kind TEXT, tz TEXT, retention_class TEXT, created_wall_ms INTEGER, location TEXT, note TEXT,
  PRIMARY KEY (device_id, memo_id)
);
CREATE TABLE IF NOT EXISTS photos (
  device_id TEXT NOT NULL, photo_id TEXT NOT NULL, memo_id TEXT,
  object_sha256 TEXT, mime TEXT, bytes INTEGER, width INTEGER, height INTEGER,
  source TEXT, taken_wall_ms INTEGER, location TEXT,
  PRIMARY KEY (device_id, photo_id)
);
CREATE TABLE IF NOT EXISTS recordings (
  device_id TEXT NOT NULL, recording_id TEXT NOT NULL, memo_id TEXT,
  route TEXT, source TEXT, sample_rate INTEGER, effects TEXT, location TEXT,
  started_wall_ms INTEGER, stopped_wall_ms INTEGER, stop_reason TEXT,
  PRIMARY KEY (device_id, recording_id)
);
CREATE TABLE IF NOT EXISTS segments (
  device_id TEXT NOT NULL, segment_id TEXT NOT NULL,
  memo_id TEXT, recording_id TEXT, idx INTEGER,
  object_sha256 TEXT, bytes INTEGER, format TEXT,
  start_elapsed_us INTEGER, end_elapsed_us INTEGER, start_wall_ms INTEGER, duration_ms INTEGER,
  peak_dbfs_x100 INTEGER, clipped_samples INTEGER, hf_ratio_4k_ppm INTEGER,
  flags TEXT, recovered INTEGER,
  PRIMARY KEY (device_id, segment_id)
);
CREATE INDEX IF NOT EXISTS segments_memo ON segments(device_id, memo_id);
CREATE INDEX IF NOT EXISTS segments_sha ON segments(object_sha256);
CREATE TABLE IF NOT EXISTS transcripts (
  device_id TEXT NOT NULL, segment_id TEXT NOT NULL,
  memo_id TEXT, idx INTEGER,
  status TEXT NOT NULL, engine TEXT, text TEXT, language TEXT,
  no_speech INTEGER NOT NULL DEFAULT 0, confidence INTEGER, words TEXT, rtf TEXT,
  error TEXT, updated_server_ms INTEGER NOT NULL,
  PRIMARY KEY (device_id, segment_id)
);
CREATE INDEX IF NOT EXISTS transcripts_updated ON transcripts(device_id, updated_server_ms);
CREATE TABLE IF NOT EXISTS object_tombstones (
  sha256 TEXT PRIMARY KEY,
  deleted_server_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS alt_transcripts (
  device_id TEXT NOT NULL, segment_id TEXT NOT NULL,
  engine TEXT NOT NULL, variant TEXT NOT NULL,
  status TEXT NOT NULL, language TEXT, detect_path TEXT, text TEXT,
  rtf TEXT, processing_ms INTEGER, error TEXT, attempts INTEGER NOT NULL DEFAULT 0,
  created_server_ms INTEGER NOT NULL, updated_server_ms INTEGER NOT NULL,
  PRIMARY KEY (device_id, segment_id, engine, variant)
);
CREATE TABLE IF NOT EXISTS reference_transcripts (
  device_id TEXT NOT NULL, segment_id TEXT NOT NULL, text TEXT NOT NULL,
  updated_server_ms INTEGER NOT NULL,
  PRIMARY KEY (device_id, segment_id)
);
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL, segment_id TEXT NOT NULL, object_sha256 TEXT NOT NULL,
  status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, error TEXT,
  created_server_ms INTEGER NOT NULL, updated_server_ms INTEGER NOT NULL,
  UNIQUE (device_id, segment_id)
);
"""


def now_ms() -> int:
    return int(time.time() * 1000)


class Database:
    def __init__(self, path: Path | str):
        self._conn = sqlite3.connect(str(path), check_same_thread=False, isolation_level=None)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA synchronous=FULL")
        self._conn.execute("PRAGMA foreign_keys=ON")
        self._lock = threading.RLock()
        self._conn.executescript(SCHEMA)
        self._migrate()

    def _migrate(self) -> None:
        """Add columns introduced after the first release (CREATE TABLE IF NOT EXISTS keeps old tables)."""
        wanted = {
            "events": [("redacted", "INTEGER NOT NULL DEFAULT 0")],
            "memos": [("languages", "TEXT"), ("deleted_server_ms", "INTEGER"), ("title", "TEXT")],
            "transcripts": [("detect_path", "TEXT")],
            "alt_transcripts": [("words", "TEXT"), ("words_kind", "TEXT")],
            "reference_transcripts": [("words", "TEXT")],
        }
        for table, cols in wanted.items():
            have = {r["name"] for r in self._conn.execute(f"PRAGMA table_info({table})")}
            for name, decl in cols:
                if name not in have:
                    self._conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {decl}")

    @contextmanager
    def tx(self) -> Iterator[sqlite3.Connection]:
        """Exclusive access plus a transaction (rolled back on error)."""
        with self._lock:
            self._conn.execute("BEGIN IMMEDIATE")
            try:
                yield self._conn
            except BaseException:
                self._conn.execute("ROLLBACK")
                raise
            else:
                self._conn.execute("COMMIT")

    def query(self, sql: str, args: tuple[Any, ...] = ()) -> list[sqlite3.Row]:
        with self._lock:
            return self._conn.execute(sql, args).fetchall()

    def one(self, sql: str, args: tuple[Any, ...] = ()) -> sqlite3.Row | None:
        with self._lock:
            return self._conn.execute(sql, args).fetchone()

    def execute(self, sql: str, args: tuple[Any, ...] = ()) -> None:
        with self.tx() as c:
            c.execute(sql, args)

    def close(self) -> None:
        with self._lock:
            self._conn.close()
