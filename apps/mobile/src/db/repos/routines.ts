import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { parseRoutineTemplate, type Correction, type RoutineTemplate } from '@vlc/session-engine';

import { routineCorrections, routineRuns, routineTemplates } from '../schema';
import type { AppDb } from '../types';

/** Saves (or replaces) a user routine. Built-in routines are never stored: a changed built-in is saved as a copy. */
export function saveRoutine(db: AppDb, template: RoutineTemplate, now: number): void {
  const t = parseRoutineTemplate({ ...template, builtin: undefined });
  const row = { name: t.name, lang: t.lang, routineJson: JSON.stringify(t), updatedAt: now };
  db.insert(routineTemplates)
    .values({ id: t.id, createdAt: now, ...row })
    .onConflictDoUpdate({ target: routineTemplates.id, set: row })
    .run();
}

export function listRoutines(db: AppDb): RoutineTemplate[] {
  const out: RoutineTemplate[] = [];
  for (const r of db.select().from(routineTemplates).orderBy(asc(routineTemplates.name)).all()) {
    try {
      out.push(parseRoutineTemplate(JSON.parse(r.routineJson)));
    } catch {
      // A corrupt row is skipped rather than breaking the list.
    }
  }
  return out;
}

export function getRoutine(db: AppDb, id: string): RoutineTemplate | null {
  const r = db.select().from(routineTemplates).where(eq(routineTemplates.id, id)).get();
  if (!r) return null;
  try {
    return parseRoutineTemplate(JSON.parse(r.routineJson));
  } catch {
    return null;
  }
}

export function deleteRoutine(db: AppDb, id: string): void {
  db.delete(routineTemplates).where(eq(routineTemplates.id, id)).run();
  db.delete(routineCorrections).where(eq(routineCorrections.templateId, id)).run();
}

export function touchRoutineUsed(db: AppDb, id: string, now: number): void {
  db.update(routineTemplates).set({ lastUsedAt: now }).where(eq(routineTemplates.id, id)).run();
}

// ----------------------------------------------------------------------------- runs

export interface RoutineRunRecord {
  id: string;
  templateId: string;
  templateName: string;
  lang: string;
  startedAt: number;
  endedAt: number | null;
  endedEarly: boolean;
  summary: unknown;
}

export function startRoutineRun(db: AppDb, r: { id: string; templateId: string; templateName: string; lang: string; startedAt: number }): void {
  db.insert(routineRuns).values({ ...r }).onConflictDoNothing().run();
}

export function finishRoutineRun(db: AppDb, id: string, r: { endedAt: number; endedEarly: boolean; summary: unknown }): void {
  db.update(routineRuns).set({ endedAt: r.endedAt, endedEarly: r.endedEarly ? 1 : 0, summaryJson: JSON.stringify(r.summary) }).where(eq(routineRuns.id, id)).run();
}

/** The most recent routine session, for "start my last routine". */
export function lastRoutineRun(db: AppDb): RoutineRunRecord | null {
  const r = db.select().from(routineRuns).orderBy(desc(routineRuns.startedAt)).limit(1).get();
  if (!r) return null;
  let summary: unknown = null;
  try {
    summary = r.summaryJson ? JSON.parse(r.summaryJson) : null;
  } catch {
    summary = null;
  }
  return { id: r.id, templateId: r.templateId, templateName: r.templateName, lang: r.lang, startedAt: r.startedAt, endedAt: r.endedAt, endedEarly: r.endedEarly === 1, summary };
}

export function hasRoutineRuns(db: AppDb): boolean {
  return db.select({ n: sql<number>`count(*)` }).from(routineRuns).get()!.n > 0;
}

// ----------------------------------------------------------------------- corrections

type Row = typeof routineCorrections.$inferSelect;

function toCorrection(r: Row): Correction {
  return {
    id: r.id,
    templateId: r.templateId,
    ...(r.itemId ? { itemId: r.itemId } : {}),
    ...(r.movementId ? { movementId: r.movementId } : {}),
    ...(r.movementNo !== null ? { movementNo: r.movementNo } : {}),
    text: r.text,
    cue: r.cue,
    ...(r.side ? { side: r.side as Correction['side'] } : {}),
    ...(r.part ? { part: r.part } : {}),
    lang: r.lang as Correction['lang'],
    fixed: r.fixed === 1,
    createdAt: r.createdAt,
    shown: r.shown,
  };
}

export function saveCorrection(db: AppDb, c: Correction, now: number): void {
  const row = {
    templateId: c.templateId,
    itemId: c.itemId ?? null,
    movementId: c.movementId ?? null,
    movementNo: c.movementNo ?? null,
    text: c.text,
    cue: c.cue,
    side: c.side ?? null,
    part: c.part ?? null,
    lang: c.lang,
    fixed: c.fixed ? 1 : 0,
    shown: c.shown,
    updatedAt: now,
  };
  db.insert(routineCorrections)
    .values({ id: c.id, createdAt: c.createdAt, ...row })
    .onConflictDoUpdate({ target: routineCorrections.id, set: row })
    .run();
}

export function listCorrections(db: AppDb, templateId: string): Correction[] {
  return db.select().from(routineCorrections).where(eq(routineCorrections.templateId, templateId)).orderBy(asc(routineCorrections.createdAt)).all().map(toCorrection);
}

export function deleteCorrection(db: AppDb, id: string): void {
  db.delete(routineCorrections).where(eq(routineCorrections.id, id)).run();
}

export function setCorrectionFixed(db: AppDb, id: string, fixed: boolean, now: number): void {
  db.update(routineCorrections).set({ fixed: fixed ? 1 : 0, updatedAt: now }).where(eq(routineCorrections.id, id)).run();
}

/** Adds to the play counters after a session (id -> number of times the cue played). */
export function addCorrectionShown(db: AppDb, played: ReadonlyMap<string, number>, now: number): void {
  for (const [id, n] of played) {
    if (n > 0) db.update(routineCorrections).set({ shown: sql`${routineCorrections.shown} + ${n}`, updatedAt: now }).where(eq(routineCorrections.id, id)).run();
  }
}

export function activeCorrectionCount(db: AppDb, templateId: string): number {
  return db.select({ n: sql<number>`count(*)` }).from(routineCorrections).where(and(eq(routineCorrections.templateId, templateId), eq(routineCorrections.fixed, 0), isNotNull(routineCorrections.cue))).get()!.n;
}
