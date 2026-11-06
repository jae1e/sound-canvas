/** Plain SQL migrations, applied in order. PRAGMA user_version holds the number applied. */
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);

  CREATE TABLE memos (
    memo_id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL,
    created_wall_ms INTEGER NOT NULL,
    created_elapsed_us INTEGER NOT NULL,
    boot_count INTEGER NOT NULL,
    tz TEXT NOT NULL,
    location_json TEXT,
    note TEXT
  );
  CREATE INDEX memos_created ON memos (created_wall_ms DESC);

  CREATE TABLE photos (
    photo_id TEXT PRIMARY KEY NOT NULL,
    memo_id TEXT NOT NULL,
    path TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    mime TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    source TEXT NOT NULL,
    taken_wall_ms INTEGER,
    created_wall_ms INTEGER NOT NULL
  );
  CREATE INDEX photos_memo ON photos (memo_id);

  CREATE TABLE recordings (
    recording_id TEXT PRIMARY KEY NOT NULL,
    memo_id TEXT NOT NULL,
    start_wall_ms INTEGER NOT NULL,
    start_elapsed_us INTEGER NOT NULL,
    source TEXT NOT NULL,
    route_json TEXT NOT NULL,
    effects_json TEXT NOT NULL,
    location_json TEXT,
    stopped INTEGER NOT NULL DEFAULT 0,
    stop_reason TEXT
  );
  CREATE INDEX recordings_memo ON recordings (memo_id);

  CREATE TABLE segments (
    segment_id TEXT PRIMARY KEY NOT NULL,
    memo_id TEXT NOT NULL,
    recording_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    path TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    start_elapsed_us INTEGER NOT NULL,
    end_elapsed_us INTEGER NOT NULL,
    start_wall_ms INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    peak_dbfs_x100 INTEGER NOT NULL,
    clipped_samples INTEGER NOT NULL,
    hf_ratio_4k_ppm INTEGER NOT NULL,
    flags TEXT NOT NULL,
    recovered INTEGER NOT NULL,
    t_status TEXT NOT NULL DEFAULT 'queued',
    t_text TEXT NOT NULL DEFAULT '',
    t_language TEXT,
    t_no_speech INTEGER NOT NULL DEFAULT 0,
    t_error TEXT,
    t_updated_server_ms INTEGER
  );
  CREATE INDEX segments_memo ON segments (memo_id);
  CREATE INDEX segments_rec ON segments (recording_id, idx);

  CREATE TABLE events (
    seq INTEGER PRIMARY KEY NOT NULL,
    event_id TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    memo_id TEXT,
    json TEXT NOT NULL,
    prev_hash TEXT NOT NULL,
    record_hash TEXT NOT NULL,
    acked INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX events_pending ON events (acked, seq);
  CREATE INDEX events_memo ON events (memo_id);

  CREATE TABLE objects (
    sha256 TEXT PRIMARY KEY NOT NULL,
    path TEXT NOT NULL,
    mime TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    memo_id TEXT,
    uploaded INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
  );
  CREATE INDEX objects_pending ON objects (uploaded);
  `,
  `
  ALTER TABLE memos ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE objects ADD COLUMN skipped INTEGER NOT NULL DEFAULT 0;
  `,
];
