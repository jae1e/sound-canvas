import { and, desc, eq } from 'drizzle-orm';

import { events } from '../schema';
import type { AppDb } from '../types';

/** Kinds written by the app. `llm_needed` marks a question the deterministic layer could not answer (M4 input). */
export type EventKind = 'action' | 'utterance' | 'llm_needed' | 'unrecognized' | 'cue' | 'session' | 'error';

export interface EventRow {
  id: number;
  sessionId: string | null;
  at: number;
  kind: string;
  payload: unknown;
}

export function appendEvent(db: AppDb, e: { sessionId?: string | null; at: number; kind: EventKind; payload: unknown }): void {
  db.insert(events).values({ sessionId: e.sessionId ?? null, at: e.at, kind: e.kind, payloadJson: JSON.stringify(e.payload ?? null) }).run();
}

export function listEvents(db: AppDb, opts: { sessionId?: string; kind?: string; limit?: number } = {}): EventRow[] {
  const conds = [opts.sessionId ? eq(events.sessionId, opts.sessionId) : undefined, opts.kind ? eq(events.kind, opts.kind) : undefined].filter(
    (c): c is NonNullable<typeof c> => c !== undefined,
  );
  const rows = db
    .select()
    .from(events)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(events.at), desc(events.id))
    .limit(opts.limit ?? 200)
    .all();
  return rows.map((r) => ({ id: r.id, sessionId: r.sessionId, at: r.at, kind: r.kind, payload: safeParse(r.payloadJson) }));
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
