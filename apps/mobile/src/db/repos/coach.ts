import { asc, desc, eq } from 'drizzle-orm';

import { journalEntries, planTemplates, takes } from '../schema';
import type { AppDb } from '../types';

/** A Voice Coach practice block as stored in `plan_templates` (kind `coach_block`). Mirrors `PracticeBlock` in `src/voice-coach`. */
export interface StoredBlock {
  id: string;
  name: string;
  durationS: number;
  repeats: number;
  restS: number;
  target: string;
  mode: 'practice' | 'speech';
}

const COACH_BLOCK = 'coach_block';

/** Replaces the saved blocks with this list (the screen edits the whole list at once). */
export function saveBlocks(db: AppDb, blocks: StoredBlock[], now: number): void {
  db.transaction((tx) => {
    const keep = new Set(blocks.map((b) => b.id));
    for (const r of tx.select({ id: planTemplates.id }).from(planTemplates).where(eq(planTemplates.kind, COACH_BLOCK)).all()) {
      if (!keep.has(r.id)) tx.delete(planTemplates).where(eq(planTemplates.id, r.id)).run();
    }
    for (const b of blocks) {
      const row = { kind: COACH_BLOCK, name: b.name, lang: null, stepsJson: JSON.stringify(b), updatedAt: now };
      tx.insert(planTemplates).values({ id: b.id, createdAt: now, ...row }).onConflictDoUpdate({ target: planTemplates.id, set: row }).run();
    }
  });
}

function isBlock(x: unknown): x is StoredBlock {
  const b = x as Partial<StoredBlock> | null;
  return (
    !!b &&
    typeof b.id === 'string' &&
    typeof b.name === 'string' &&
    typeof b.durationS === 'number' &&
    typeof b.repeats === 'number' &&
    typeof b.restS === 'number' &&
    typeof b.target === 'string' &&
    (b.mode === 'practice' || b.mode === 'speech')
  );
}

export function loadBlocks(db: AppDb): StoredBlock[] {
  const out: StoredBlock[] = [];
  for (const r of db.select().from(planTemplates).where(eq(planTemplates.kind, COACH_BLOCK)).orderBy(asc(planTemplates.createdAt), asc(planTemplates.id)).all()) {
    try {
      const b = JSON.parse(r.stepsJson) as unknown;
      if (isBlock(b)) out.push(b);
    } catch {
      // A corrupt row is skipped.
    }
  }
  return out;
}

export interface StoredTake {
  id: string;
  sessionId: string | null;
  fileUri: string;
  blockId: string | null;
  durationMs: number | null;
  note: string | null;
  metrics: unknown;
  createdAt: number;
}

function toTake(r: typeof takes.$inferSelect): StoredTake {
  let metrics: unknown = null;
  if (r.metricsJson) {
    try {
      metrics = JSON.parse(r.metricsJson);
    } catch {
      metrics = null;
    }
  }
  return { id: r.id, sessionId: r.sessionId, fileUri: r.fileUri, blockId: r.blockId, durationMs: r.durationMs, note: r.note, metrics, createdAt: r.createdAt };
}

export function insertTake(
  db: AppDb,
  t: { id: string; sessionId?: string | null; fileUri: string; blockId?: string | null; durationMs?: number | null; createdAt: number },
): void {
  db.insert(takes)
    .values({ id: t.id, sessionId: t.sessionId ?? null, fileUri: t.fileUri, blockId: t.blockId ?? null, durationMs: t.durationMs ?? null, createdAt: t.createdAt })
    .onConflictDoNothing()
    .run();
}

export function setTakeMetrics(db: AppDb, id: string, metrics: unknown): void {
  db.update(takes).set({ metricsJson: JSON.stringify(metrics) }).where(eq(takes.id, id)).run();
}

export function getTake(db: AppDb, id: string): StoredTake | null {
  const r = db.select().from(takes).where(eq(takes.id, id)).get();
  return r ? toTake(r) : null;
}

export function listStoredTakes(db: AppDb, limit = 200): StoredTake[] {
  return db.select().from(takes).orderBy(desc(takes.createdAt)).limit(limit).all().map(toTake);
}

/** Deletes the take row. Journal entries that mention it keep their text and lose only the link. */
export function deleteTakeRow(db: AppDb, id: string): void {
  db.transaction((tx) => {
    tx.update(journalEntries).set({ takeId: null }).where(eq(journalEntries.takeId, id)).run();
    tx.delete(takes).where(eq(takes.id, id)).run();
  });
}

/**
 * Sets the note of a take (empty clears it) and keeps exactly one linked Journal entry (`take_id`) in step with it.
 * Returns the Journal entry id, or null when the note was cleared.
 */
export function setTakeNote(
  db: AppDb,
  p: { takeId: string; text: string; sessionId?: string | null; now: number; newId: () => string },
): string | null {
  const text = p.text.trim();
  return db.transaction((tx) => {
    tx.update(takes).set({ note: text || null }).where(eq(takes.id, p.takeId)).run();
    const existing = tx.select().from(journalEntries).where(eq(journalEntries.takeId, p.takeId)).all().find((e) => e.source === 'user_note');
    if (!text) {
      if (existing) tx.delete(journalEntries).where(eq(journalEntries.id, existing.id)).run();
      return null;
    }
    if (existing) {
      tx.update(journalEntries).set({ text, originalText: text, updatedAt: p.now }).where(eq(journalEntries.id, existing.id)).run();
      return existing.id;
    }
    const id = `jn-${p.newId()}`;
    tx.insert(journalEntries)
      .values({ id, sessionId: p.sessionId ?? null, mode: 'voice_coach', source: 'user_note', originalText: text, text, takeId: p.takeId, createdAt: p.now, updatedAt: p.now })
      .run();
    return id;
  });
}
