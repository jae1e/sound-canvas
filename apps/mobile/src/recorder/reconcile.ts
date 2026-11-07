import { eq } from 'drizzle-orm';
import VcAudio from '../../modules/vc-audio/src/VcAudioModule';
import type { TakeStarted, TakeStopped } from '../../modules/vc-audio/src/VcAudio.types';
import { getDb } from '../db/client';
import { takes } from '../db/schema';

/** Save the take identity before waiting for a stop event. */
export function saveStartedTake(take: TakeStarted, kind: 'song' | 'speech'): void {
  const details = { kind, inputJson: JSON.stringify(take.input), outputJson: JSON.stringify(take.output) };
  getDb().insert(takes).values({ id: take.id, fileUri: take.path, ...details, createdAt: Date.now() }).onConflictDoUpdate({ target: takes.id, set: { ...details, recovered: 0 } }).run();
}

function importStopped(take: TakeStopped): void {
  const db = getDb();
  db.transaction((tx) => {
    const existing = tx.select().from(takes).where(eq(takes.id, take.id)).get();
    const values = { fileUri: take.path, durationMs: Math.round(take.durationMs), asrPath: take.asrPath, beatJson: JSON.stringify({ timesMs: take.beatTimesMs, outputLatencyMs: take.outputLatencyMs, inputChanges: take.inputChanges }) };
    if (existing) tx.update(takes).set(values).where(eq(takes.id, take.id)).run();
    else tx.insert(takes).values({ id: take.id, ...values, kind: 'unknown', recovered: 1, createdAt: Date.now() }).run();
  });
}

let pending: Promise<void> = Promise.resolve();
/** Serialize imports and acknowledge only after the SQLite transaction commits. */
export function reconcileTakes(): Promise<void> {
  const run = async () => {
    const state = await VcAudio.getState();
    for (const take of state.unacknowledged) {
      importStopped(take);
      await VcAudio.ackTake(take.id);
    }
    for (const file of await VcAudio.listTakeFiles()) {
      if (file.meta) continue;
      const db = getDb();
      const existing = db.select().from(takes).where(eq(takes.id, file.id)).get();
      if (!existing) db.insert(takes).values({ id: file.id, fileUri: file.path, kind: 'unknown', recovered: 1, createdAt: file.modifiedMs }).run();
      else db.update(takes).set({ recovered: 1 }).where(eq(takes.id, file.id)).run();
    }
  };
  const result = pending.then(run, run);
  pending = result.catch(() => undefined);
  return result;
}
