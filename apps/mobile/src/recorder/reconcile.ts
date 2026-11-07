import { eq } from 'drizzle-orm';
import VcAudio from '../../modules/vc-audio/src/VcAudioModule';
import type { TakeStarted } from '../../modules/vc-audio/src/VcAudio.types';
import { getDb } from '../db/client';
import { takes } from '../db/schema';
import { persistStoppedTake } from './takePersistence';

/** Save the take identity before waiting for a stop event. */
export function saveStartedTake(take: TakeStarted, kind: 'song' | 'speech', bpm?: number): void {
  const details = { kind, inputJson: JSON.stringify(take.input), outputJson: JSON.stringify(take.output) };
  getDb()
    .insert(takes)
    .values({ id: take.id, fileUri: take.path, ...details, createdAt: Date.now() })
    .onConflictDoUpdate({ target: takes.id, set: { ...details, recovered: 0 } })
    .run();
}

let pending: Promise<void> = Promise.resolve();
/** Serialize imports and acknowledge only after the SQLite transaction commits. */
export function reconcileTakes(): Promise<void> {
  const run = async () => {
    const state = await VcAudio.getState();
    for (const take of state.unacknowledged) {
      persistStoppedTake(getDb(), take);
      await VcAudio.ackTake(take.id);
    }
    for (const file of await VcAudio.listTakeFiles()) {
      if (file.meta || file.id === state.take?.id) continue;
      const db = getDb();
      const existing = db.select().from(takes).where(eq(takes.id, file.id)).get();
      if (!existing)
        db.insert(takes)
          .values({
            id: file.id,
            fileUri: file.path,
            kind: 'unknown',
            recovered: 1,
            createdAt: file.modifiedMs,
          })
          .run();
      else db.update(takes).set({ kind: 'unknown', recovered: 1 }).where(eq(takes.id, file.id)).run();
    }
  };
  const result = pending.then(run, run);
  pending = result.catch(() => undefined);
  return result;
}
