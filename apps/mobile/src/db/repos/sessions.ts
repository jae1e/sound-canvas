import { desc, eq, inArray } from 'drizzle-orm';
import { parseSession, stepsOf, type Session } from '@vlc/session-engine';

import { events, sessions, tasks, timers } from '../schema';
import type { AppDb } from '../types';

export interface StoredSession {
  session: Session;
  title: string | null;
  updatedAt: number;
}

const RESUMABLE = ['draft', 'ready', 'active', 'paused'];

/**
 * Persists the engine state. Call it after every applied action: the whole `Session` goes into `sessions.state_json`
 * (authoritative) and the task and timer rows are rewritten from it in the same transaction.
 */
export function saveSession(db: AppDb, session: Session, opts: { now: number; title?: string | null }): void {
  const row = {
    mode: session.mode,
    status: session.status,
    lang: session.lang,
    revision: session.revision,
    stateJson: JSON.stringify(session),
    startedAt: session.startedAt ?? null,
    endedAt: session.endedAt ?? null,
    updatedAt: opts.now,
  };
  db.transaction((tx) => {
    const existing = tx.select({ title: sessions.title }).from(sessions).where(eq(sessions.id, session.id)).get();
    const title = opts.title !== undefined ? opts.title : (existing?.title ?? null);
    if (existing) tx.update(sessions).set({ ...row, title }).where(eq(sessions.id, session.id)).run();
    else tx.insert(sessions).values({ id: session.id, createdAt: session.createdAt, title, ...row }).run();

    tx.delete(tasks).where(eq(tasks.sessionId, session.id)).run();
    tx.delete(timers).where(eq(timers.sessionId, session.id)).run();
    const order = new Map(stepsOf(session).map((t, i) => [t.id, i]));
    for (const t of Object.values(session.tasks)) {
      tx.insert(tasks)
        .values({
          id: t.id,
          sessionId: session.id,
          label: t.label,
          status: t.status,
          position: order.get(t.id) ?? null,
          estimateMs: t.estimateMs ?? null,
          startedAt: t.startedAt ?? null,
          createdAt: t.createdAt,
          updatedAt: opts.now,
        })
        .run();
    }
    for (const t of Object.values(session.timers)) {
      tx.insert(timers)
        .values({
          id: t.id,
          sessionId: session.id,
          taskId: t.taskId ?? null,
          label: t.label,
          durationMs: t.durationMs,
          state: t.state,
          clockPolicy: t.clockPolicy,
          accumulatedMs: Math.round(t.accumulatedMs),
          runningSince: t.runningSince ?? null,
          createdAt: t.createdAt,
          updatedAt: opts.now,
        })
        .run();
    }
  });
}

function decode(row: typeof sessions.$inferSelect): StoredSession | null {
  let json: unknown;
  try {
    json = JSON.parse(row.stateJson);
  } catch {
    return null;
  }
  const session = parseSession(json);
  return session ? { session, title: row.title, updatedAt: row.updatedAt } : null;
}

export function getSession(db: AppDb, id: string): StoredSession | null {
  const row = db.select().from(sessions).where(eq(sessions.id, id)).get();
  return row ? decode(row) : null;
}

/**
 * The most recently updated unfinished session of a mode (default: any), for "resume after the app was killed".
 * Rows whose stored state no longer validates are closed so they never block a restore.
 */
export function loadResumableSession(db: AppDb, mode?: Session['mode']): StoredSession | null {
  const rows = db
    .select()
    .from(sessions)
    .where(inArray(sessions.status, RESUMABLE))
    .orderBy(desc(sessions.updatedAt))
    .all();
  for (const row of rows) {
    if (mode && row.mode !== mode) continue;
    const stored = decode(row);
    if (stored) return stored;
    db.update(sessions).set({ status: 'ended' }).where(eq(sessions.id, row.id)).run();
  }
  return null;
}

export function listSessions(db: AppDb, limit = 50): { id: string; mode: string; status: string; title: string | null; createdAt: number; endedAt: number | null }[] {
  return db
    .select({ id: sessions.id, mode: sessions.mode, status: sessions.status, title: sessions.title, createdAt: sessions.createdAt, endedAt: sessions.endedAt })
    .from(sessions)
    .orderBy(desc(sessions.createdAt))
    .limit(limit)
    .all();
}

export function deleteSession(db: AppDb, id: string): void {
  db.transaction((tx) => {
    tx.delete(tasks).where(eq(tasks.sessionId, id)).run();
    tx.delete(timers).where(eq(timers.sessionId, id)).run();
    tx.delete(events).where(eq(events.sessionId, id)).run();
    tx.delete(sessions).where(eq(sessions.id, id)).run();
  });
}
