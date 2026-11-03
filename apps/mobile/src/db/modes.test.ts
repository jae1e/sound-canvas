import { beforeEach, describe, expect, it } from 'vitest';
import { apply, createSession } from '@vlc/session-engine';

import { deleteTakeRow, getTake, insertTake, listStoredTakes, loadBlocks, saveBlocks, setTakeMetrics, setTakeNote, type StoredBlock } from './repos/coach';
import { createJournalEntry, getJournalEntry, listJournalEntries } from './repos/journal';
import { closeUnfinishedSessions, loadResumableSession, saveSession } from './repos/sessions';
import { listTemplates, saveTemplate } from './repos/templates';
import { getPlace, getRoute, listPlaces, savePlace, saveRoute } from './repos/travel';
import { createTestDb } from './testDb';
import type { AppDb } from './types';

let db: AppDb;
beforeEach(async () => {
  db = await createTestDb();
});

const block = (id: string, over: Partial<StoredBlock> = {}): StoredBlock => ({ id, name: id, durationS: 20, repeats: 3, restS: 10, target: 'A3', mode: 'practice', ...over });
let n = 0;
const newId = () => `x${++n}`;

describe('Voice Coach persistence', () => {
  it('stores blocks apart from work templates and removes the ones the screen dropped', () => {
    saveTemplate(db, { id: 'w1', name: 'Work', steps: [{ label: 'a' }] } as never, 1);
    saveBlocks(db, [block('b1'), block('b2', { mode: 'speech', target: '' })], 10);
    expect(loadBlocks(db).map((b) => b.id)).toEqual(['b1', 'b2']);
    expect(listTemplates(db).map((t) => t.id)).toEqual(['w1']);
    saveBlocks(db, [block('b2', { durationS: 45, mode: 'speech', target: '' })], 20);
    expect(loadBlocks(db)).toEqual([block('b2', { durationS: 45, mode: 'speech', target: '' })]);
  });

  it('stores takes with file path, duration, block and metrics JSON', () => {
    insertTake(db, { id: 't1', sessionId: 's1', fileUri: '/files/vlc-takes/t1.wav', blockId: 'b1', durationMs: 12_300, createdAt: 5 });
    setTakeMetrics(db, 't1', { mode: 'practice', metrics: { stabilityCents: 12 } });
    const t = getTake(db, 't1')!;
    expect(t).toMatchObject({ fileUri: '/files/vlc-takes/t1.wav', blockId: 'b1', durationMs: 12_300, sessionId: 's1' });
    expect(t.metrics).toEqual({ mode: 'practice', metrics: { stabilityCents: 12 } });
    expect(listStoredTakes(db).map((x) => x.id)).toEqual(['t1']);
  });

  it('keeps one Journal entry per take note, linked by take_id, and unlinks it when the take is deleted', () => {
    insertTake(db, { id: 't1', sessionId: 's1', fileUri: 'f', createdAt: 5 });
    const id = setTakeNote(db, { takeId: 't1', text: 'second phrase flat', sessionId: 's1', now: 100, newId })!;
    expect(getJournalEntry(db, id)).toMatchObject({ mode: 'voice_coach', source: 'user_note', takeId: 't1', text: 'second phrase flat', sessionId: 's1' });
    expect(setTakeNote(db, { takeId: 't1', text: 'second phrase flat; rushed end', now: 200, newId })).toBe(id);
    expect(listJournalEntries(db)).toHaveLength(1);
    expect(getTake(db, 't1')?.note).toBe('second phrase flat; rushed end');
    deleteTakeRow(db, 't1');
    expect(getJournalEntry(db, id)?.takeId).toBeNull();
    expect(getTake(db, 't1')).toBeNull();
  });

  it('removes the Journal entry when the note is cleared', () => {
    insertTake(db, { id: 't1', fileUri: 'f', createdAt: 5 });
    setTakeNote(db, { takeId: 't1', text: 'x', now: 1, newId });
    expect(setTakeNote(db, { takeId: 't1', text: '  ', now: 2, newId })).toBeNull();
    expect(listJournalEntries(db)).toHaveLength(0);
  });
});

describe('Travel Guide persistence', () => {
  it('saves a place once per provider id', () => {
    const a = savePlace(db, { id: 'p1', externalId: 'kakao:123', name: 'Cafe', latitude: 37.5, longitude: 127, now: 1 });
    const b = savePlace(db, { id: 'p2', externalId: 'kakao:123', name: 'Cafe', latitude: 37.5, longitude: 127, now: 2 });
    expect(b.id).toBe(a.id);
    expect(listPlaces(db)).toHaveLength(1);
    expect(getPlace(db, 'p1')?.name).toBe('Cafe');
  });

  it('stores the walk log with polyline, distance, duration, start and end', () => {
    saveRoute(db, {
      id: 'r1',
      sessionId: 's1',
      kind: 'walked',
      distanceM: 1234,
      durationMs: 600_000,
      polyline: [
        { lat: 37.5, lng: 127, t: 1000 },
        { lat: 37.501, lng: 127.001, t: 2000 },
      ],
      startedAt: 1000,
      endedAt: 601_000,
      now: 700_000,
    });
    expect(getRoute(db, 'r1')).toMatchObject({ kind: 'walked', distanceM: 1234, durationMs: 600_000, startedAt: 1000, endedAt: 601_000, sessionId: 's1' });
    expect(getRoute(db, 'r1')?.polyline[1]).toEqual({ lat: 37.501, lng: 127.001, t: 2000 });
  });

  it('links a place note and a walk summary in the Journal', () => {
    savePlace(db, { id: 'p1', name: 'Cafe', latitude: 37.5, longitude: 127, now: 1 });
    createJournalEntry(db, { id: 'j1', sessionId: 's1', mode: 'travel', source: 'user_note', text: 'come back', placeId: 'p1', location: { latitude: 37.5, longitude: 127, accuracyM: 6 }, createdAt: 2 });
    createJournalEntry(db, { id: 'j2', sessionId: 's1', mode: 'travel', source: 'generated_summary', text: 'Walk: 1.2 km in 23 min.', createdAt: 3 });
    expect(getJournalEntry(db, 'j1')).toMatchObject({ placeId: 'p1', location: { latitude: 37.5, longitude: 127, accuracyM: 6 } });
    expect(listJournalEntries(db, { sessionId: 's1', source: 'generated_summary' })).toHaveLength(1);
  });
});

describe('closing orphaned mode sessions', () => {
  it('ends unfinished walk sessions except the adopted one', () => {
    const mk = (id: string) => {
      const s = createSession({ id, mode: 'walk', lang: 'en', now: 1 });
      const r = apply(s, { action: { type: 'start_session' }, source: 'system' }, { now: 1, newId: () => 'e' });
      return r.ok ? r.session : s;
    };
    saveSession(db, mk('w1'), { now: 1 });
    saveSession(db, mk('w2'), { now: 2 });
    expect(closeUnfinishedSessions(db, 'walk', 10, 'w2')).toBe(1);
    expect(loadResumableSession(db, 'walk')?.session.id).toBe('w2');
  });
});
