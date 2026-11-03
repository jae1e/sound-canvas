import { and, asc, eq } from 'drizzle-orm';
import { planTemplateSchema, type PlanTemplate } from '@vlc/session-engine';

import { planTemplates } from '../schema';
import type { AppDb } from '../types';

/** Saves (or replaces) a user template. Throws if the template does not validate. */
export function saveTemplate(db: AppDb, template: PlanTemplate, now: number): void {
  const t = planTemplateSchema.parse(template);
  const row = { kind: 'work', name: t.name, lang: t.lang ?? null, stepsJson: JSON.stringify(t.steps), updatedAt: now };
  db.insert(planTemplates)
    .values({ id: t.id, createdAt: now, ...row })
    .onConflictDoUpdate({ target: planTemplates.id, set: row })
    .run();
}

export function listTemplates(db: AppDb): PlanTemplate[] {
  const out: PlanTemplate[] = [];
  for (const r of db.select().from(planTemplates).where(eq(planTemplates.kind, 'work')).orderBy(asc(planTemplates.name)).all()) {
    try {
      const parsed = planTemplateSchema.safeParse({ id: r.id, name: r.name, lang: r.lang ?? undefined, steps: JSON.parse(r.stepsJson) });
      if (parsed.success) out.push(parsed.data);
    } catch {
      // A corrupt row is skipped rather than breaking the list.
    }
  }
  return out;
}

export function deleteTemplate(db: AppDb, id: string): void {
  db.delete(planTemplates).where(and(eq(planTemplates.id, id), eq(planTemplates.kind, 'work'))).run();
}
