export type PostStatus = 'accepted' | 'duplicate' | 'rejected';

export interface PostResult {
  event_id: string;
  status: PostStatus;
  reason?: string;
}

export interface PostResponse {
  results: PostResult[];
  last_seq: number;
}

export interface BatchOutcome {
  /** event_ids the server now holds (accepted or duplicate). */
  ack: string[];
  /** On a gap: re-send starting at this seq (the server's last_seq + 1). */
  resendFromSeq?: number;
  /** A permanent rejection (hash mismatch, float, ...): stop posting and surface the error. */
  stuck?: { eventId: string; reason: string };
}

export const MAX_BATCH = 200;
export const CLOCK_INTERVAL_MS = 10 * 60 * 1000;

/** The longest run of consecutive seqs at the head of `pending` (sorted by seq), at most `max`. */
export function selectBatch<T extends { seq: number }>(pending: T[], max = MAX_BATCH): T[] {
  const out: T[] = [];
  for (const e of pending) {
    if (out.length >= max) break;
    if (out.length > 0 && e.seq !== out[out.length - 1].seq + 1) break;
    out.push(e);
  }
  return out;
}

export function interpretResults(batch: { eventId: string }[], response: PostResponse): BatchOutcome {
  const byId = new Map(response.results.map((r) => [r.event_id, r]));
  const outcome: BatchOutcome = { ack: [] };
  for (const e of batch) {
    const r = byId.get(e.eventId);
    if (!r) continue;
    if (r.status === 'accepted' || r.status === 'duplicate') {
      outcome.ack.push(e.eventId);
    } else if (r.reason === 'gap') {
      outcome.resendFromSeq ??= response.last_seq + 1;
    } else {
      outcome.stuck ??= { eventId: e.eventId, reason: r.reason ?? 'rejected' };
    }
  }
  return outcome;
}

/** Exponential backoff after `failures` consecutive errors: 5 s, 10 s, ... capped at 60 s. */
export function backoffMs(failures: number, baseMs = 5000, maxMs = 60000): number {
  if (failures <= 0) return 0;
  return Math.min(maxMs, baseMs * 2 ** (failures - 1));
}

export function clockExchangeDue(lastAtMs: number | null, nowMs: number, intervalMs = CLOCK_INTERVAL_MS): boolean {
  return lastAtMs === null || nowMs - lastAtMs >= intervalMs || nowMs < lastAtMs;
}
