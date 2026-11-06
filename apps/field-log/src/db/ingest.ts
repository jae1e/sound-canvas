import FlNative, { type JournalRecord } from '../native';
import { journalRecordObject, journalRecordToEvent } from '../core';
import { writeTx, type Q } from './db';
import { appendEvent } from './events';
import { kvGet, kvSet } from './kv';
import { setRoute, useRecorder } from '../state/recorder';

async function applyRecord(q: Q, r: JournalRecord): Promise<void> {
  switch (r.kind) {
    case 'recording_started': {
      const exists = await q.getFirstAsync('SELECT 1 FROM recordings WHERE recording_id = ?', r.recordingId);
      if (exists) return;
      await q.runAsync(
        `INSERT INTO recordings (recording_id, memo_id, start_wall_ms, start_elapsed_us, source, route_json, effects_json, location_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        r.recordingId,
        r.memoId,
        r.wallMs,
        r.elapsedUs,
        r.source,
        JSON.stringify(r.route),
        JSON.stringify(r.effects),
        r.location ? JSON.stringify(r.location) : null,
      );
      break;
    }
    case 'segment_closed': {
      const exists = await q.getFirstAsync('SELECT 1 FROM segments WHERE segment_id = ?', r.segmentId);
      if (exists) return;
      await q.runAsync(
        `INSERT INTO segments (segment_id, memo_id, recording_id, idx, path, sha256, bytes, start_elapsed_us, end_elapsed_us,
           start_wall_ms, duration_ms, peak_dbfs_x100, clipped_samples, hf_ratio_4k_ppm, flags, recovered)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        r.segmentId,
        r.memoId,
        r.recordingId,
        r.index,
        r.path,
        r.sha256,
        r.bytes,
        r.startElapsedUs,
        r.endElapsedUs,
        r.startWallMs,
        r.durationMs,
        r.peakDbfsX100,
        r.clippedSamples,
        r.hfRatio4kPpm,
        JSON.stringify(r.flags),
        r.recovered ? 1 : 0,
      );
      const obj = journalRecordObject(r);
      if (obj) {
        await q.runAsync(
          'INSERT OR IGNORE INTO objects (sha256, path, mime, bytes, memo_id, uploaded) VALUES (?, ?, ?, ?, ?, 0)',
          obj.sha256,
          obj.path,
          obj.mime,
          obj.bytes,
          r.memoId,
        );
      }
      break;
    }
    case 'route_changed':
      await q.runAsync('UPDATE recordings SET route_json = ? WHERE recording_id = ?', JSON.stringify(r.route), r.recordingId);
      break;
    case 'recording_stopped':
      await q.runAsync('UPDATE recordings SET stopped = 1, stop_reason = ? WHERE recording_id = ?', r.reason, r.recordingId);
      break;
  }
  await appendEvent(q, journalRecordToEvent(r));
}

let chain: Promise<number> = Promise.resolve(0);

/**
 * Reads the native journal after the stored cursor and turns each record into an outbox event and
 * rows, advancing the cursor in the same transaction. Safe to call repeatedly and concurrently.
 * Returns the number of records ingested. Does nothing until the device is enrolled.
 */
export function ingestJournal(): Promise<number> {
  const run = async () => {
    if (!(await kvGet('device_id'))) return 0;
    const cursor = Number((await kvGet('journal_cursor')) ?? '0');
    const records = (await FlNative.readJournal(cursor)).filter((r) => r.journalSeq > cursor);
    if (records.length === 0) return 0;
    await writeTx(async (q) => {
      for (const r of records) await applyRecord(q, r);
      await kvSet('journal_cursor', String(records[records.length - 1].journalSeq), q);
    });
    // Push the latest route of the active recording to the UI at once.
    for (const r of records) {
      if (r.kind === 'route_changed' && r.recordingId === useRecorder.getState().recordingId) setRoute(r.route);
    }
    return records.length;
  };
  chain = chain.then(run, run);
  return chain;
}
