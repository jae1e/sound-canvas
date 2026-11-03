import { and, desc, eq, or, type SQL, sql } from 'drizzle-orm';

import { journalEntries, type JournalSource } from '../schema';
import type { AppDb } from '../types';

export interface JournalEntry {
  id: string;
  sessionId: string | null;
  mode: string;
  source: JournalSource;
  /** The text as spoken or generated. Never edited. */
  originalText: string;
  /** The editable version. */
  text: string;
  taskId: string | null;
  taskLabel: string | null;
  takeId: string | null;
  placeId: string | null;
  location: { latitude: number; longitude: number; accuracyM: number | null } | null;
  createdAt: number;
  updatedAt: number;
}

export interface NewJournalEntry {
  id: string;
  sessionId?: string | null;
  mode: string;
  source: JournalSource;
  text: string;
  taskId?: string | null;
  taskLabel?: string | null;
  takeId?: string | null;
  placeId?: string | null;
  location?: { latitude: number; longitude: number; accuracyM?: number | null } | null;
  createdAt: number;
}

function fromRow(r: typeof journalEntries.$inferSelect): JournalEntry {
  return {
    id: r.id,
    sessionId: r.sessionId,
    mode: r.mode,
    source: r.source,
    originalText: r.originalText,
    text: r.text,
    taskId: r.taskId,
    taskLabel: r.taskLabel,
    takeId: r.takeId,
    placeId: r.placeId,
    location: r.latitude !== null && r.longitude !== null ? { latitude: r.latitude, longitude: r.longitude, accuracyM: r.accuracyM } : null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export function createJournalEntry(db: AppDb, e: NewJournalEntry): JournalEntry {
  const text = e.text.trim();
  if (!text) throw new Error('Journal text is empty');
  db.insert(journalEntries)
    .values({
      id: e.id,
      sessionId: e.sessionId ?? null,
      mode: e.mode,
      source: e.source,
      originalText: text,
      text,
      taskId: e.taskId ?? null,
      taskLabel: e.taskLabel ?? null,
      takeId: e.takeId ?? null,
      placeId: e.placeId ?? null,
      latitude: e.location?.latitude ?? null,
      longitude: e.location?.longitude ?? null,
      accuracyM: e.location?.accuracyM ?? null,
      createdAt: e.createdAt,
      updatedAt: e.createdAt,
    })
    .run();
  return getJournalEntry(db, e.id) as JournalEntry;
}

export function getJournalEntry(db: AppDb, id: string): JournalEntry | null {
  const r = db.select().from(journalEntries).where(eq(journalEntries.id, id)).get();
  return r ? fromRow(r) : null;
}

/** Edits the editable text only; `originalText` keeps what was spoken. */
export function updateJournalText(db: AppDb, id: string, text: string, now: number): JournalEntry | null {
  const t = text.trim();
  if (!t) throw new Error('Journal text is empty');
  db.update(journalEntries).set({ text: t, updatedAt: now }).where(eq(journalEntries.id, id)).run();
  return getJournalEntry(db, id);
}

export function deleteJournalEntry(db: AppDb, id: string): boolean {
  const had = getJournalEntry(db, id) !== null;
  db.delete(journalEntries).where(eq(journalEntries.id, id)).run();
  return had;
}

export interface JournalQuery {
  /** Case-insensitive (ASCII) substring match on the text, the original text and the linked step label. */
  query?: string;
  mode?: string;
  source?: JournalSource;
  sessionId?: string;
  limit?: number;
  offset?: number;
}

/** Escapes LIKE wildcards so a search for "50%" matches the literal text. */
export function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export function listJournalEntries(db: AppDb, q: JournalQuery = {}): JournalEntry[] {
  const conds: (SQL | undefined)[] = [];
  const term = q.query?.trim();
  if (term) {
    const pat = likePattern(term);
    const m = (col: typeof journalEntries.text | typeof journalEntries.originalText | typeof journalEntries.taskLabel) =>
      sql`${col} LIKE ${pat} ESCAPE '\\'`;
    conds.push(or(m(journalEntries.text), m(journalEntries.originalText), m(journalEntries.taskLabel)));
  }
  if (q.mode) conds.push(eq(journalEntries.mode, q.mode));
  if (q.source) conds.push(eq(journalEntries.source, q.source));
  if (q.sessionId) conds.push(eq(journalEntries.sessionId, q.sessionId));
  const where = conds.filter((c): c is SQL => c !== undefined);
  return db
    .select()
    .from(journalEntries)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(journalEntries.createdAt), desc(journalEntries.id))
    .limit(q.limit ?? 500)
    .offset(q.offset ?? 0)
    .all()
    .map(fromRow);
}

export function countJournalEntries(db: AppDb): number {
  const r = db.select({ n: sql<number>`count(*)` }).from(journalEntries).get();
  return r?.n ?? 0;
}

