import { getDb, writeTx } from './db';
import type { EventEnvelope } from '../core';

export interface OutboxEvent {
  seq: number;
  eventId: string;
  envelope: EventEnvelope;
}

export interface OutboxObject {
  sha256: string;
  path: string;
  mime: string;
  bytes: number;
}

export async function pendingEvents(limit = 200): Promise<OutboxEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ seq: number; event_id: string; json: string }>(
    'SELECT seq, event_id, json FROM events WHERE acked = 0 ORDER BY seq LIMIT ?',
    limit,
  );
  return rows.map((r) => ({ seq: r.seq, eventId: r.event_id, envelope: JSON.parse(r.json) as EventEnvelope }));
}

export async function ackEvents(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  await writeTx(async (q) => {
    for (const id of eventIds) await q.runAsync('UPDATE events SET acked = 1 WHERE event_id = ?', id);
  });
}

/** After a gap: the server is missing events we believed acked, so send them again. */
export async function unackFrom(seq: number): Promise<void> {
  await writeTx((q) => q.runAsync('UPDATE events SET acked = 0 WHERE seq >= ?', seq));
}

export async function pendingObjects(limit = 50): Promise<OutboxObject[]> {
  const db = await getDb();
  return db.getAllAsync<OutboxObject>(
    'SELECT sha256, path, mime, bytes FROM objects WHERE uploaded = 0 ORDER BY rowid LIMIT ?',
    limit,
  );
}

export async function markUploaded(sha256: string): Promise<void> {
  await writeTx((q) => q.runAsync('UPDATE objects SET uploaded = 1, last_error = NULL WHERE sha256 = ?', sha256));
}

export async function setObjectError(sha256: string, error: string): Promise<void> {
  await writeTx((q) => q.runAsync('UPDATE objects SET last_error = ? WHERE sha256 = ?', error, sha256));
}

export async function outboxCounts(): Promise<{ events: number; objects: number; objectErrors: number }> {
  const db = await getDb();
  const e = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM events WHERE acked = 0');
  const o = await db.getFirstAsync<{ n: number; err: number }>(
    'SELECT COUNT(*) AS n, COALESCE(SUM(last_error IS NOT NULL), 0) AS err FROM objects WHERE uploaded = 0',
  );
  return { events: e?.n ?? 0, objects: o?.n ?? 0, objectErrors: o?.err ?? 0 };
}
