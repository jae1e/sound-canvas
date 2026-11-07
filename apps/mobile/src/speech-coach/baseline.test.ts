import { describe, expect, it } from 'vitest';
import { takes } from '../db/schema';
import { createTestDb } from '../db/testDb';
import { speechBaseline } from './baseline';

describe('speech baseline', () => {
  it('requires three earlier takes in the same language', async () => {
    const db = await createTestDb();
    for (const [i, lang, pace] of [
      [1, 'ko', 4],
      [2, 'ko', 5],
      [3, 'en', 120],
      [4, 'ko', 6],
    ] as const)
      db.insert(takes)
        .values({
          id: String(i),
          kind: 'speech',
          fileUri: '/a',
          createdAt: i,
          beatJson: JSON.stringify({ speechPlan: { lang } }),
          reportJson: JSON.stringify({ tiles: { pace: { value: pace } } }),
        })
        .run();
    const rows = db.select().from(takes).all();
    expect(speechBaseline(rows, 'ko', 4)).toBeNull();
    expect(speechBaseline(rows, 'ko', 5)?.slowBelow).toBeCloseTo(3.5174);
    expect(speechBaseline(rows, 'ko', 5)?.fastAbove).toBeCloseTo(6.4826);
    expect(speechBaseline(rows, 'en')).toBeNull();
  });
});
