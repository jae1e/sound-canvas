import * as Crypto from 'expo-crypto';
import { buildEvent, createUuid7Generator, type EventType } from '../core';
import type { Q } from './db';
import { kvGet } from './kv';

// expo-crypto's Android digestString hashes data.toByteArray() (UTF-8), which is what the contract needs.
export const sha256Utf8 = (s: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, s);

export const newId = createUuid7Generator((n) => Crypto.getRandomBytes(n));

export interface NewEvent {
  type: EventType;
  payload: Record<string, unknown>;
  wallMs: number;
  elapsedUs: number;
  bootCount: number;
  memoId?: string;
}

/** Appends one event to the outbox: next seq, chained to the previous record_hash. Call inside writeTx. */
export async function appendEvent(q: Q, e: NewEvent): Promise<{ seq: number; eventId: string }> {
  const deviceId = await kvGet('device_id', q);
  if (!deviceId) throw new Error('Device is not enrolled');
  const last = await q.getFirstAsync<{ seq: number; record_hash: string }>(
    'SELECT seq, record_hash FROM events ORDER BY seq DESC LIMIT 1',
  );
  const seq = (last?.seq ?? 0) + 1;
  const eventId = newId();
  const env = await buildEvent(
    {
      event_id: eventId,
      device_id: deviceId,
      seq,
      type: e.type,
      wall_ms: e.wallMs,
      elapsed_us: e.elapsedUs,
      boot_count: e.bootCount,
      payload: e.payload,
      prev_hash: last?.record_hash ?? '',
    },
    sha256Utf8,
  );
  await q.runAsync(
    'INSERT INTO events (seq, event_id, type, memo_id, json, prev_hash, record_hash, acked) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
    seq,
    eventId,
    e.type,
    e.memoId ?? null,
    JSON.stringify(env),
    env.prev_hash,
    env.record_hash,
  );
  return { seq, eventId };
}
