import { beforeEach, describe, expect, it } from 'vitest';
import { builtinRoutines, makeCorrection } from '@vlc/session-engine';

import { createTestDb } from './testDb';
import type { AppDb } from './types';
import {
  activeCorrectionCount, addCorrectionShown, deleteCorrection, deleteRoutine, finishRoutineRun, getRoutine, lastRoutineRun,
  listCorrections, listRoutines, saveCorrection, saveRoutine, setCorrectionFixed, startRoutineRun, touchRoutineUsed,
} from './repos/routines';

let db: AppDb;
beforeEach(async () => {
  db = await createTestDb();
});

const tpl = () => ({ ...builtinRoutines('ko')[1]!, id: 'mine', builtin: undefined });

describe('routine templates', () => {
  it('round-trips a template and deletes its corrections with it', () => {
    saveRoutine(db, tpl(), 1);
    expect(getRoutine(db, 'mine')).toMatchObject({ id: 'mine', name: '맨몸 운동' });
    expect(listRoutines(db)).toHaveLength(1);
    saveCorrection(db, makeCorrection({ id: 'c1', templateId: 'mine', text: '오른손 먼저 자꾸', lang: 'ko', target: { kind: 'routine' }, now: 1 }), 1);
    deleteRoutine(db, 'mine');
    expect(listRoutines(db)).toEqual([]);
    expect(listCorrections(db, 'mine')).toEqual([]);
  });

  it('built-in flag is not stored and bad rows are skipped', () => {
    saveRoutine(db, { ...tpl(), builtin: true }, 1);
    expect(getRoutine(db, 'mine')!.builtin).toBeUndefined();
    expect(() => saveRoutine(db, { ...tpl(), items: [] }, 1)).toThrow();
  });
});

describe('corrections', () => {
  it('stores per movement, marks fixed, counts plays, deletes', () => {
    const c = makeCorrection({ id: 'c1', templateId: 'routine-taegeuk-1', text: '오른손 먼저 나가야되는데 자꾸 왼손이 나가요', lang: 'ko', target: { kind: 'movement', itemId: 'p1', movementId: 't1-5', no: 5 }, now: 5 });
    saveCorrection(db, c, 5);
    expect(listCorrections(db, 'routine-taegeuk-1')).toEqual([c]);
    expect(activeCorrectionCount(db, 'routine-taegeuk-1')).toBe(1);
    addCorrectionShown(db, new Map([['c1', 3]]), 6);
    expect(listCorrections(db, 'routine-taegeuk-1')[0]!.shown).toBe(3);
    setCorrectionFixed(db, 'c1', true, 7);
    expect(listCorrections(db, 'routine-taegeuk-1')[0]!.fixed).toBe(true);
    expect(activeCorrectionCount(db, 'routine-taegeuk-1')).toBe(0);
    deleteCorrection(db, 'c1');
    expect(listCorrections(db, 'routine-taegeuk-1')).toEqual([]);
  });
});

describe('runs', () => {
  it('returns the most recent run', () => {
    expect(lastRoutineRun(db)).toBeNull();
    startRoutineRun(db, { id: 'a', templateId: 'x', templateName: 'X', lang: 'ko', startedAt: 10 });
    startRoutineRun(db, { id: 'b', templateId: 'y', templateName: 'Y', lang: 'en', startedAt: 20 });
    finishRoutineRun(db, 'b', { endedAt: 30, endedEarly: true, summary: { cues: 2 } });
    touchRoutineUsed(db, 'y', 20);
    expect(lastRoutineRun(db)).toMatchObject({ id: 'b', templateId: 'y', endedEarly: true, summary: { cues: 2 } });
  });
});
