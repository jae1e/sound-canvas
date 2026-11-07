import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createTestDb } from '../db/testDb';
import { takes } from '../db/schema';
import { persistAnalysis, persistStoppedTake } from './takePersistence';
import type { TakeStopped } from '../../modules/vc-audio/src/VcAudio.types';

describe('take duration persistence', () => {
  it('updates the started row and retains duration through duplicate events', async () => {
    const db = await createTestDb();
    db.insert(takes).values({ id: 'a', fileUri: '/a.wav', kind: 'song', createdAt: 1 }).run();
    const stopped: TakeStopped = {
      id: 'a',
      path: '/a.wav',
      asrPath: null,
      durationMs: 4000,
      sizeBytes: 384044,
      reason: 'user',
      beatTimesMs: [],
      inputChanges: [],
      outputLatencyMs: 0,
    };
    persistStoppedTake(db, stopped);
    persistStoppedTake(db, { ...stopped, durationMs: 0 });
    expect(db.select().from(takes).where(eq(takes.id, 'a')).get()?.durationMs).toBe(4000);
  });
  it('repairs a zero duration from actual WAV analysis', async () => {
    const db = await createTestDb();
    db.insert(takes).values({ id: 'a', fileUri: '/a.wav', durationMs: 0, createdAt: 1 }).run();
    persistAnalysis(db, 'a', { durationMs: 4000 });
    expect(db.select().from(takes).where(eq(takes.id, 'a')).get()?.durationMs).toBe(4000);
  });
});
