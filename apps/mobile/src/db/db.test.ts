import { beforeEach, describe, expect, it } from 'vitest';
import { apply, createSession, type Action, type Session } from '@vlc/session-engine';

import { DEFAULT_SETTINGS } from '../settings/schema';
import { appendEvent, listEvents } from './repos/events';
import {
  countJournalEntries,
  createJournalEntry,
  deleteJournalEntry,
  getJournalEntry,
  likePattern,
  listJournalEntries,
  updateJournalText,
} from './repos/journal';
import { deleteSession, getSession, listSessions, loadResumableSession, saveSession } from './repos/sessions';
import { loadSettings, saveSettings } from './repos/settings';
import { deleteTemplate, listTemplates, saveTemplate } from './repos/templates';
import { events, journalEntries, planTemplates, places, routes, sessions, settings, takes, tasks, timers } from './schema';
import { createTestDb } from './testDb';
import type { AppDb } from './types';

let db: AppDb;
beforeEach(async () => {
  db = await createTestDb();
});

function build(id: string, actions: Action[], now = 1_000_000): Session {
  let s = createSession({ id, mode: 'activity', lang: 'en', now });
  let n = 0;
  for (const action of [{ type: 'start_session' } as Action, ...actions]) {
    const r = apply(s, { action, source: 'voice' }, { now, newId: () => `${id}-e${++n}` });
    if (!r.ok) throw new Error(`${action.type}: ${r.reason}`);
    s = r.session;
  }
  return s;
}

describe('migrations', () => {
  it('create every table of the spec schema', () => {
    expect(() => {
      for (const table of [sessions, tasks, timers, events, journalEntries, takes, places, routes, settings, planTemplates]) {
        db.select().from(table).all();
      }
    }).not.toThrow();
  });
});

describe('session persistence', () => {
  const actions: Action[] = [
    { type: 'add_step', label: 'unpack', estimateMs: 300_000 },
    { type: 'add_step', label: 'frame' },
    { type: 'next_step' },
    { type: 'start_timer', label: 'glue', durationMs: 600_000 },
    { type: 'set_quiet', quiet: true, forMs: 120_000 },
    { type: 'set_focus_break', afterMs: 3_000_000 },
  ];

  it('restores exactly the saved engine state after a "kill"', () => {
    const s = build('s1', actions);
    saveSession(db, s, { now: 5, title: 'Shelf' });
    const restored = loadResumableSession(db);
    expect(restored?.title).toBe('Shelf');
    expect(restored?.session).toEqual(JSON.parse(JSON.stringify(s)));
  });

  it('mirrors tasks and timers as rows and rewrites them on every save', () => {
    const s = build('s1', actions);
    saveSession(db, s, { now: 5 });
    expect(db.select().from(tasks).all().map((t) => [t.label, t.position, t.status]).sort()).toEqual([
      ['frame', 1, 'pending'],
      ['unpack', 0, 'in_progress'],
    ]);
    expect(db.select().from(timers).all()).toHaveLength(1);
    const r = apply(s, { action: { type: 'next_step' }, source: 'ui' }, { now: 2_000_000, newId: () => 'z' });
    if (!r.ok) throw new Error();
    saveSession(db, r.session, { now: 6 });
    expect(db.select().from(tasks).all()).toHaveLength(2);
    expect(db.select().from(tasks).all().find((t) => t.label === 'unpack')?.status).toBe('completed');
    expect(db.select().from(sessions).all()).toHaveLength(1);
  });

  it('keeps the title across saves that do not pass one', () => {
    const s = build('s1', actions);
    saveSession(db, s, { now: 5, title: 'Shelf' });
    saveSession(db, s, { now: 6 });
    expect(getSession(db, 's1')?.title).toBe('Shelf');
  });

  it('does not offer ended sessions for resume, and picks the latest unfinished one', () => {
    saveSession(db, build('old', actions), { now: 1 });
    saveSession(db, build('new', actions), { now: 2 });
    expect(loadResumableSession(db)?.session.id).toBe('new');
    const ended = apply(build('new', actions), { action: { type: 'end_session' }, source: 'ui' }, { now: 3, newId: () => 'x' });
    if (!ended.ok) throw new Error();
    saveSession(db, ended.session, { now: 3 });
    expect(loadResumableSession(db)?.session.id).toBe('old');
  });

  it('closes a corrupt row instead of blocking the restore', () => {
    saveSession(db, build('good', actions), { now: 1 });
    saveSession(db, build('bad', actions), { now: 2 });
    db.run(`update sessions set state_json = '{"nope":1}' where id = 'bad'` as never);
    expect(loadResumableSession(db)?.session.id).toBe('good');
    expect(listSessions(db).find((x) => x.id === 'bad')?.status).toBe('ended');
  });

  it('filters by mode', () => {
    saveSession(db, build('a', actions), { now: 1 });
    expect(loadResumableSession(db, 'vocal')).toBeNull();
    expect(loadResumableSession(db, 'activity')?.session.id).toBe('a');
  });

  it('deletes a session with its rows and events', () => {
    saveSession(db, build('a', actions), { now: 1 });
    appendEvent(db, { sessionId: 'a', at: 1, kind: 'action', payload: {} });
    deleteSession(db, 'a');
    expect(getSession(db, 'a')).toBeNull();
    expect(db.select().from(tasks).all()).toHaveLength(0);
    expect(listEvents(db, { sessionId: 'a' })).toHaveLength(0);
  });
});

describe('events', () => {
  it('stores payloads and filters by kind, newest first', () => {
    appendEvent(db, { sessionId: 's', at: 1, kind: 'utterance', payload: { heard: 'hi' } });
    appendEvent(db, { sessionId: 's', at: 2, kind: 'llm_needed', payload: { text: 'how much is 3/4 cup in grams' } });
    appendEvent(db, { sessionId: 's', at: 3, kind: 'llm_needed', payload: { text: 'second' } });
    const rows = listEvents(db, { kind: 'llm_needed' });
    expect(rows.map((r) => r.at)).toEqual([3, 2]);
    expect(rows[1]?.payload).toEqual({ text: 'how much is 3/4 cup in grams' });
  });
});

describe('journal', () => {
  const base = { mode: 'work', sessionId: 's1', createdAt: 1000 };

  it('stores source label, links and location, and keeps the original text when edited', () => {
    const e = createJournalEntry(db, {
      ...base,
      id: 'j1',
      source: 'user_note',
      text: '  use the longer screws ',
      taskId: 't1',
      taskLabel: 'frame',
      location: { latitude: 37.5, longitude: 127.0, accuracyM: 12 },
    });
    expect(e).toMatchObject({
      source: 'user_note',
      text: 'use the longer screws',
      originalText: 'use the longer screws',
      taskId: 't1',
      taskLabel: 'frame',
      location: { latitude: 37.5, longitude: 127.0, accuracyM: 12 },
    });
    const edited = updateJournalText(db, 'j1', 'use 40 mm screws', 2000);
    expect(edited).toMatchObject({ text: 'use 40 mm screws', originalText: 'use the longer screws', updatedAt: 2000, createdAt: 1000 });
  });

  it('accepts the three source labels and rejects empty text', () => {
    for (const source of ['user_note', 'transcript', 'generated_summary'] as const) {
      createJournalEntry(db, { ...base, id: source, source, text: source });
    }
    expect(countJournalEntries(db)).toBe(3);
    expect(() => createJournalEntry(db, { ...base, id: 'x', source: 'user_note', text: '   ' })).toThrow();
    expect(() => updateJournalText(db, 'user_note', ' ', 1)).toThrow();
  });

  it('lists newest first and filters', () => {
    createJournalEntry(db, { id: 'a', mode: 'work', source: 'user_note', text: 'a', createdAt: 1 });
    createJournalEntry(db, { id: 'b', mode: 'travel', source: 'transcript', text: 'b', createdAt: 2 });
    createJournalEntry(db, { id: 'c', mode: 'work', source: 'generated_summary', text: 'c', createdAt: 3 });
    expect(listJournalEntries(db).map((e) => e.id)).toEqual(['c', 'b', 'a']);
    expect(listJournalEntries(db, { mode: 'work' }).map((e) => e.id)).toEqual(['c', 'a']);
    expect(listJournalEntries(db, { source: 'transcript' }).map((e) => e.id)).toEqual(['b']);
    expect(listJournalEntries(db, { limit: 1, offset: 1 }).map((e) => e.id)).toEqual(['b']);
  });

  it('searches text, original text and step label, with literal wildcards', () => {
    createJournalEntry(db, { id: 'a', mode: 'work', source: 'user_note', text: '긴 나사 사용', taskLabel: '프레임 조립', createdAt: 1 });
    createJournalEntry(db, { id: 'b', mode: 'work', source: 'user_note', text: 'Use 50% glue', createdAt: 2 });
    createJournalEntry(db, { id: 'c', mode: 'work', source: 'user_note', text: 'plain', createdAt: 3 });
    updateJournalText(db, 'c', 'edited words', 4);
    expect(listJournalEntries(db, { query: '나사' }).map((e) => e.id)).toEqual(['a']);
    expect(listJournalEntries(db, { query: '프레임' }).map((e) => e.id)).toEqual(['a']);
    expect(listJournalEntries(db, { query: 'GLUE' }).map((e) => e.id)).toEqual(['b']);
    expect(listJournalEntries(db, { query: '50%' }).map((e) => e.id)).toEqual(['b']);
    expect(listJournalEntries(db, { query: '%' }).map((e) => e.id)).toEqual(['b']);
    expect(listJournalEntries(db, { query: 'plain' }).map((e) => e.id)).toEqual(['c']);
    expect(listJournalEntries(db, { query: 'edited' }).map((e) => e.id)).toEqual(['c']);
    expect(listJournalEntries(db, { query: 'nothing' })).toEqual([]);
    expect(likePattern('a_b%')).toBe('%a\\_b\\%%');
  });

  it('deletes', () => {
    createJournalEntry(db, { id: 'a', mode: 'work', source: 'user_note', text: 'a', createdAt: 1 });
    expect(deleteJournalEntry(db, 'a')).toBe(true);
    expect(deleteJournalEntry(db, 'a')).toBe(false);
    expect(getJournalEntry(db, 'a')).toBeNull();
  });
});

describe('settings', () => {
  it('defaults, merges patches and validates', () => {
    expect(loadSettings(db)).toEqual(DEFAULT_SETTINGS);
    saveSettings(db, { language: 'ko', ttsVoice: 6 }, 1);
    saveSettings(db, { nudgeLevel: 'chatty' }, 2);
    expect(loadSettings(db)).toMatchObject({ language: 'ko', ttsVoice: 6, nudgeLevel: 'chatty', ttsSteps: 8, outputRoute: 'auto' });
  });
  it('never defaults to the phone speaker and keeps valid fields when one is corrupt', () => {
    expect(DEFAULT_SETTINGS.outputRoute).toBe('auto');
    db.run(`insert into settings (key, value_json, updated_at) values ('app', '{"language":"ko","ttsSteps":999,"outputRoute":"loud"}', 1)` as never);
    expect(loadSettings(db)).toMatchObject({ language: 'ko', ttsSteps: 8, outputRoute: 'auto' });
  });
});

describe('templates', () => {
  it('saves, replaces, lists and deletes', () => {
    saveTemplate(db, { id: 't1', name: 'Shelf', lang: 'en', steps: [{ label: 'unpack', estimateMs: 60_000 }, { label: 'frame' }] }, 1);
    saveTemplate(db, { id: 't2', name: 'Aaa', steps: [{ label: 'x' }] }, 2);
    expect(listTemplates(db).map((t) => t.name)).toEqual(['Aaa', 'Shelf']);
    saveTemplate(db, { id: 't1', name: 'Shelf 2', lang: 'en', steps: [{ label: 'only' }] }, 3);
    expect(listTemplates(db).find((t) => t.id === 't1')).toEqual({ id: 't1', name: 'Shelf 2', lang: 'en', steps: [{ label: 'only' }] });
    deleteTemplate(db, 't2');
    expect(listTemplates(db)).toHaveLength(1);
  });
  it('refuses invalid templates', () => {
    expect(() => saveTemplate(db, { id: 't', name: 'x', steps: [] }, 1)).toThrow();
  });
});
