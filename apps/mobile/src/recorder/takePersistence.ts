import { eq } from 'drizzle-orm';
import type { TakeStopped } from '../../modules/vc-audio/src/VcAudio.types';
import type { AppDb } from '../db/types';
import { takes } from '../db/schema';

/** The stopped event is authoritative; retain a measured duration if a duplicate event reports zero. */
export function persistStoppedTake(db: AppDb, take: TakeStopped): void {
  db.transaction((tx) => {
    const existing = tx.select().from(takes).where(eq(takes.id, take.id)).get();
    const durationMs = take.durationMs > 0 ? Math.round(take.durationMs) : (existing?.durationMs ?? 0);
    let beat: Record<string, unknown> = {};
    try {
      beat = JSON.parse(existing?.beatJson ?? '{}');
    } catch {
      /* Legacy row. */
    }
    const values = {
      fileUri: take.path,
      durationMs,
      asrPath: take.asrPath,
      transcriptState: existing?.kind === 'speech' && take.asrPath ? (existing.transcriptState ?? 'pending') : (existing?.transcriptState ?? null),
      beatJson: JSON.stringify({
        ...beat,
        timesMs: take.beatTimesMs,
        outputLatencyMs: take.outputLatencyMs,
        inputChanges: take.inputChanges,
      }),
    };
    if (existing) tx.update(takes).set(values).where(eq(takes.id, take.id)).run();
    else
      tx.insert(takes)
        .values({ id: take.id, ...values, kind: 'unknown', recovered: 1, createdAt: Date.now() })
        .run();
  });
}

export function persistAnalysis(db: AppDb, id: string, analysis: { durationMs: number }): void {
  const row = db.select().from(takes).where(eq(takes.id, id)).get();
  if (!row) return;
  db.update(takes)
    .set({
      analysisJson: JSON.stringify(analysis),
      durationMs: row.durationMs || Math.round(analysis.durationMs),
    })
    .where(eq(takes.id, id))
    .run();
}
