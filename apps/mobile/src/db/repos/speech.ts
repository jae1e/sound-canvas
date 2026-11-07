import { desc, eq, sql } from 'drizzle-orm';
import type { SpeechPlan } from '@vlc/voice-analysis';
import { speechPlans, takes } from '../schema';
import type { AppDb } from '../types';

export type StoredSpeechPlan = SpeechPlan & { promptId: string | null; createdAt: number; updatedAt: number; practiceCount: number };

export function saveSpeechPlan(db: AppDb, plan: StoredSpeechPlan): void {
  const values = { title: plan.title, kind: plan.kind, language: plan.lang, targetMs: plan.targetMs,
    sectionsJson: JSON.stringify(plan.sections), script: plan.script, promptId: plan.promptId, updatedAt: plan.updatedAt };
  db.insert(speechPlans).values({ id: plan.id, createdAt: plan.createdAt, practiceCount: plan.practiceCount, ...values })
    .onConflictDoUpdate({ target: speechPlans.id, set: values }).run();
}

export function listSpeechPlans(db: AppDb): StoredSpeechPlan[] {
  return db.select().from(speechPlans).orderBy(desc(speechPlans.updatedAt)).all().flatMap((row) => {
    try {
      const sections: unknown = JSON.parse(row.sectionsJson);
      if (!Array.isArray(sections)) return [];
      return [{ id: row.id, title: row.title, kind: row.kind as SpeechPlan['kind'], lang: row.language as SpeechPlan['lang'],
        targetMs: row.targetMs, sections: sections as SpeechPlan['sections'], script: row.script, promptId: row.promptId,
        createdAt: row.createdAt, updatedAt: row.updatedAt, practiceCount: row.practiceCount }];
    } catch { return []; }
  });
}

export function incrementSpeechPractice(db: AppDb, id: string): void {
  db.update(speechPlans).set({ practiceCount: sql`${speechPlans.practiceCount} + 1` }).where(eq(speechPlans.id, id)).run();
}

export function updateSpeechTake(db: AppDb, id: string, values: Partial<Pick<typeof takes.$inferInsert,
  'planId' | 'boundariesJson' | 'transcriptJobId' | 'transcriptState' | 'transcriptJson' | 'reportJson'>>): void {
  db.update(takes).set(values).where(eq(takes.id, id)).run();
}

export function listPendingTranscripts(db: AppDb): (typeof takes.$inferSelect)[] {
  return db.select().from(takes).where(eq(takes.kind, 'speech')).all()
    .filter((take) => take.asrPath && ['pending', 'queued', 'running'].includes(take.transcriptState ?? ''));
}
