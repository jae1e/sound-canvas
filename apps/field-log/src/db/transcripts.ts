import { writeTx } from './db';

export interface TranscriptSegmentWire {
  segment_id: string;
  memo_id: string;
  index: number;
  status: 'queued' | 'running' | 'done' | 'failed';
  engine?: string;
  text?: string | null;
  language?: string | null;
  no_speech?: boolean;
  updated_server_ms?: number;
  error?: string | null;
}

/** Stores server transcripts for segments we know. Never regresses to an older server version. */
export async function applyTranscripts(segs: TranscriptSegmentWire[]): Promise<void> {
  if (segs.length === 0) return;
  await writeTx(async (q) => {
    for (const s of segs) {
      await q.runAsync(
        `UPDATE segments SET t_status = ?, t_text = ?, t_language = ?, t_no_speech = ?, t_error = ?, t_updated_server_ms = ?
         WHERE segment_id = ? AND (t_updated_server_ms IS NULL OR t_updated_server_ms <= ?)`,
        s.status,
        s.text ?? '',
        s.language ?? null,
        s.no_speech ? 1 : 0,
        s.error ?? null,
        s.updated_server_ms ?? 0,
        s.segment_id,
        s.updated_server_ms ?? 0,
      );
    }
  });
}
