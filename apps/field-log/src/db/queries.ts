import type { LocationPayload } from '../core';
import { getDb } from './db';

export interface MemoSummary {
  memoId: string;
  kind: 'photo' | 'image' | 'voice';
  createdWallMs: number;
  location: LocationPayload | null;
  photoPath: string | null;
  title: string | null;
  firstText: string | null;
  /** All final transcript text joined. */
  transcript: string | null;
  durationMs: number;
  photoCount: number;
  segmentCount: number;
  segmentsDone: number;
  segmentsFailed: number;
  openRecordings: number;
  routeType: string | null;
  pendingEvents: number;
  pendingObjects: number;
}

const parseLoc = (s: string | null): LocationPayload | null => (s ? (JSON.parse(s) as LocationPayload) : null);

export async function listMemos(limit = 200): Promise<MemoSummary[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, any>>(
    `SELECT m.memo_id, m.kind, m.created_wall_ms, m.location_json, m.title,
      (SELECT group_concat(t_text, ' ') FROM (SELECT t_text FROM segments s WHERE s.memo_id = m.memo_id AND s.t_status = 'done'
         AND s.t_no_speech = 0 AND s.t_text <> '' ORDER BY s.start_wall_ms, s.idx)) AS transcript,
      (SELECT COALESCE(SUM(duration_ms), 0) FROM segments s WHERE s.memo_id = m.memo_id) AS duration_ms,
      (SELECT COUNT(*) FROM photos p WHERE p.memo_id = m.memo_id) AS photo_count,
      (SELECT path FROM photos p WHERE p.memo_id = m.memo_id ORDER BY p.created_wall_ms LIMIT 1) AS photo_path,
      (SELECT t_text FROM segments s WHERE s.memo_id = m.memo_id AND s.t_status = 'done' AND s.t_no_speech = 0 AND s.t_text <> ''
         ORDER BY s.start_wall_ms, s.idx LIMIT 1) AS first_text,
      (SELECT COUNT(*) FROM segments s WHERE s.memo_id = m.memo_id) AS seg_count,
      (SELECT COUNT(*) FROM segments s WHERE s.memo_id = m.memo_id AND s.t_status = 'done') AS seg_done,
      (SELECT COUNT(*) FROM segments s WHERE s.memo_id = m.memo_id AND s.t_status = 'failed') AS seg_failed,
      (SELECT COUNT(*) FROM recordings r WHERE r.memo_id = m.memo_id AND r.stopped = 0) AS open_recs,
      (SELECT route_json FROM recordings r WHERE r.memo_id = m.memo_id ORDER BY r.start_elapsed_us DESC LIMIT 1) AS route_json,
      (SELECT COUNT(*) FROM events e WHERE e.memo_id = m.memo_id AND e.acked = 0) AS pending_events,
      (SELECT COUNT(*) FROM objects o WHERE o.memo_id = m.memo_id AND o.uploaded = 0 AND o.skipped = 0) AS pending_objects
     FROM memos m WHERE m.deleted = 0 ORDER BY m.created_wall_ms DESC LIMIT ?`,
    limit,
  );
  return rows.map((r) => ({
    memoId: r.memo_id,
    kind: r.kind,
    createdWallMs: r.created_wall_ms,
    location: parseLoc(r.location_json),
    photoPath: r.photo_path,
    title: r.title,
    firstText: r.first_text,
    transcript: r.transcript,
    durationMs: r.duration_ms,
    photoCount: r.photo_count,
    segmentCount: r.seg_count,
    segmentsDone: r.seg_done,
    segmentsFailed: r.seg_failed,
    openRecordings: r.open_recs,
    routeType: r.route_json ? (JSON.parse(r.route_json).type as string) : null,
    pendingEvents: r.pending_events,
    pendingObjects: r.pending_objects,
  }));
}

export interface PhotoRow {
  photoId: string;
  path: string;
  mime: string;
  width: number | null;
  height: number | null;
  source: string;
}

export interface RecordingRow {
  recordingId: string;
  startWallMs: number;
  startElapsedUs: number;
  source: string;
  route: { type: string; productName?: string };
  effects: { ns: string; agc: string; aec: string };
  stopped: boolean;
  stopReason: string | null;
}

export interface SegmentRow {
  segmentId: string;
  recordingId: string;
  path: string;
  index: number;
  startElapsedUs: number;
  durationMs: number;
  route: { type: string; productName?: string } | null;
  peakDbfsX100: number;
  flags: string[];
  recovered: boolean;
  status: 'queued' | 'running' | 'done' | 'failed';
  text: string;
  noSpeech: boolean;
  language: string | null;
  error: string | null;
}

export interface MemoDetail {
  memoId: string;
  kind: 'photo' | 'image' | 'voice';
  createdWallMs: number;
  tz: string;
  location: LocationPayload | null;
  note: string | null;
  title: string | null;
  photos: PhotoRow[];
  recordings: RecordingRow[];
  segments: SegmentRow[];
  pendingEvents: number;
  pendingObjects: number;
}

export async function getMemoDetail(memoId: string): Promise<MemoDetail | null> {
  const db = await getDb();
  const m = await db.getFirstAsync<Record<string, any>>('SELECT * FROM memos WHERE memo_id = ?', memoId);
  if (!m || m.deleted === 1) return null;
  const photos = await db.getAllAsync<Record<string, any>>('SELECT * FROM photos WHERE memo_id = ? ORDER BY created_wall_ms', memoId);
  const recs = await db.getAllAsync<Record<string, any>>(
    'SELECT * FROM recordings WHERE memo_id = ? ORDER BY start_elapsed_us',
    memoId,
  );
  const segs = await db.getAllAsync<Record<string, any>>('SELECT * FROM segments WHERE memo_id = ? ORDER BY start_wall_ms, idx', memoId);
  const pe = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM events WHERE memo_id = ? AND acked = 0', memoId);
  const po = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM objects WHERE memo_id = ? AND uploaded = 0 AND skipped = 0', memoId);
  return {
    memoId,
    kind: m.kind,
    createdWallMs: m.created_wall_ms,
    tz: m.tz,
    location: parseLoc(m.location_json),
    note: m.note,
    title: m.title,
    photos: photos.map((p) => ({
      photoId: p.photo_id,
      path: p.path,
      mime: p.mime,
      width: p.width,
      height: p.height,
      source: p.source,
    })),
    recordings: recs.map((r) => ({
      recordingId: r.recording_id,
      startWallMs: r.start_wall_ms,
      startElapsedUs: r.start_elapsed_us,
      source: r.source,
      route: JSON.parse(r.route_json),
      effects: JSON.parse(r.effects_json),
      stopped: r.stopped === 1,
      stopReason: r.stop_reason,
    })),
    segments: segs.map((s) => ({
      segmentId: s.segment_id,
      recordingId: s.recording_id,
      path: s.path,
      index: s.idx,
      startElapsedUs: s.start_elapsed_us,
      durationMs: s.duration_ms,
      route: s.route_json ? JSON.parse(s.route_json) : null,
      peakDbfsX100: s.peak_dbfs_x100,
      flags: JSON.parse(s.flags),
      recovered: s.recovered === 1,
      status: s.t_status,
      text: s.t_text,
      noSpeech: s.t_no_speech === 1,
      language: s.t_language,
      error: s.t_error,
    })),
    pendingEvents: pe?.n ?? 0,
    pendingObjects: po?.n ?? 0,
  };
}
