import { canonicalJson } from './canonical';

export type EventType =
  | 'memo_created'
  | 'photo_added'
  | 'recording_started'
  | 'segment_closed'
  | 'route_changed'
  | 'recording_stopped'
  | 'clock_sync'
  | 'memo_note';

export interface EventEnvelope {
  event_id: string;
  device_id: string;
  seq: number;
  type: EventType;
  wall_ms: number;
  elapsed_us: number;
  boot_count: number;
  payload: Record<string, unknown>;
  prev_hash: string;
  record_hash: string;
}

/** SHA-256 of a UTF-8 string as lowercase hex. */
export type Sha256Hex = (utf8: string) => string | Promise<string>;

export type UnhashedEvent = Omit<EventEnvelope, 'record_hash'>;

export async function buildEvent(input: UnhashedEvent, sha256: Sha256Hex): Promise<EventEnvelope> {
  const record_hash = await sha256(canonicalJson(input));
  return { ...input, record_hash };
}

export async function verifyChain(events: EventEnvelope[], sha256: Sha256Hex): Promise<boolean> {
  let prev = '';
  for (const e of events) {
    if (e.prev_hash !== prev) return false;
    const { record_hash, ...rest } = e;
    if ((await sha256(canonicalJson(rest))) !== record_hash) return false;
    prev = record_hash;
  }
  return true;
}
