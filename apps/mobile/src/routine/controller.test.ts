import { beforeEach, describe, expect, it, vi } from 'vitest';
import { builtinRoutines, type Correction, type Lang, type RoutineTemplate } from '@vlc/session-engine';

import { RoutineController, type RoutineNativePort, type RoutineStorePort } from './controller';

vi.mock('../llm/askLlm', () => ({ askLlm: vi.fn(async () => ({ ok: false, reason: 'not_implemented' })) }));
import { askLlm } from '../llm/askLlm';

interface Scheduled {
  id: string;
  start: number;
  beats: { offsetMs: number; text: string; tag: string }[];
}

function fakes(opts: { running?: boolean; failPrepare?: boolean } = {}) {
  const calls = { spoken: [] as string[], cancel: 0, prepared: [] as string[], scheduled: [] as Scheduled[], started: 0, stopped: 0 };
  let running = opts.running ?? false;
  const native: RoutineNativePort = {
    isRunning: () => running,
    start: async () => {
      running = true;
      calls.started++;
    },
    stop: async () => {
      running = false;
      calls.stopped++;
    },
    speak: (t) => calls.spoken.push(t),
    stopSpeaking: () => undefined,
    prepare: async (clips) => {
      if (opts.failPrepare) throw new Error('boom');
      for (const c of clips) calls.prepared.push(c.text);
      return { clips: clips.map((c) => ({ text: c.text, durationMs: 400, ok: true })), failed: [], engine: 'platform' };
    },
    schedule: (id, start, beats) => calls.scheduled.push({ id, start, beats }),
    cancel: () => {
      calls.cancel++;
    },
  };
  const db = { corrections: [] as Correction[], routines: [] as RoutineTemplate[], runs: [] as { templateId: string; templateName: string; lang: Lang }[], events: [] as string[], journal: [] as { text: string; taskId?: string | null; taskLabel?: string | null; source: string }[], shown: new Map<string, number>(), finished: [] as unknown[] };
  const store: RoutineStorePort = {
    listCorrections: (tid) => db.corrections.filter((c) => c.templateId === tid),
    saveCorrection: (c) => void (db.corrections = [...db.corrections.filter((x) => x.id !== c.id), c]),
    deleteCorrection: (id) => void (db.corrections = db.corrections.filter((c) => c.id !== id)),
    setFixed: (id, fixed) => void (db.corrections = db.corrections.map((c) => (c.id === id ? { ...c, fixed } : c))),
    addShown: (m) => void m.forEach((n, id) => db.shown.set(id, (db.shown.get(id) ?? 0) + n)),
    saveRoutine: (t) => void (db.routines = [...db.routines.filter((x) => x.id !== t.id), t]),
    listRoutines: () => db.routines,
    getRoutine: (id) => db.routines.find((r) => r.id === id) ?? null,
    touchUsed: () => undefined,
    startRun: (r) => void db.runs.push(r),
    finishRun: (_id, r) => void db.finished.push(r),
    lastRun: () => db.runs[db.runs.length - 1] ?? null,
    appendEvent: (k) => void db.events.push(k),
    createJournal: (e) => void db.journal.push(e),
  };
  let now = 1_000_000;
  let n = 0;
  const c = new RoutineController(native, store, { now: () => now, newId: () => `id${++n}`, level: () => 'full' });
  return { c, calls, db, advance: (ms: number) => (now += ms), nowFn: () => now };
}

const tpl = (id: string, lang: Lang = 'ko') => builtinRoutines(lang).find((r) => r.id === id)!;

describe('start', () => {
  it('pre-synthesizes phrases, then schedules the timeline per set on the native timer', async () => {
    const f = fakes({ running: true });
    await f.c.start(tpl('routine-bodyweight'));
    expect(f.c.state().phase).toBe('running');
    expect(f.calls.prepared).toEqual(expect.arrayContaining(['하나', '열다섯', '스물', '셋', '휴식 30초', '스쿼트 15개 3세트', '10초 남았어요']));
    const ids = f.calls.scheduled.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(f.calls.scheduled.some((s) => s.id.includes(':1.') && s.beats[0]!.text === '하나')).toBe(true);
    const sq1 = f.calls.scheduled.find((s) => s.beats.some((b) => b.tag.startsWith('b1|rep|1|1')))!;
    const counts = sq1.beats.filter((b) => b.tag.includes('|rep|1|'));
    expect(counts).toHaveLength(15);
    expect(counts[1]!.offsetMs - counts[0]!.offsetMs).toBe(3000);
    expect(f.calls.spoken).toEqual([]); // nothing is spoken live just by starting
  });

  it('starts the native session when it is not running, and survives a failed prepare', async () => {
    const f = fakes({ failPrepare: true });
    await f.c.start(tpl('routine-taegeuk-1', 'en'));
    expect(f.calls.started).toBe(1);
    expect(f.c.state().phase).toBe('running');
    expect(f.c.state().notice).toMatch(/live speech/);
    expect(f.calls.scheduled.length).toBeGreaterThan(0);
  });

  it('startLast reuses the most recent run, and reports when there is none', async () => {
    const f = fakes({ running: true });
    expect(await f.c.startLast('ko')).toBe(false);
    await f.c.start(tpl('routine-taegeuk-1'));
    await f.c.close(false);
    expect(await f.c.startLast('ko')).toBe(true);
    expect(f.c.state().run!.template.id).toBe('routine-taegeuk-1');
  });
});

describe('live commands during a run', () => {
  async function running(id = 'routine-bodyweight', lang: Lang = 'ko') {
    const f = fakes({ running: true });
    await f.c.start(tpl(id, lang));
    f.calls.scheduled.length = 0;
    return f;
  }

  it('skip changes the session copy, replies, and re-plans from the new unit', async () => {
    const f = await running();
    f.advance(5000);
    f.c.onFinal('이거 건너뛰어');
    const s = f.c.state();
    expect(s.turns[0]!.reply).toContain('푸시업');
    expect(f.calls.spoken[0]).toContain('푸시업');
    expect(f.calls.cancel).toBeGreaterThan(0);
    expect(f.calls.scheduled[0]!.beats[0]!.text).toContain('푸시업');
    expect(s.run!.template.items).toEqual(tpl('routine-bodyweight').items);
  });

  it('pauses at a stop word on a partial transcript, then resumes', async () => {
    const f = await running();
    f.advance(4000);
    f.c.onPartial('멈춰');
    expect(f.c.state().phase).toBe('paused');
    f.calls.scheduled.length = 0;
    f.c.onFinal('다시 시작');
    expect(f.c.state().phase).toBe('running');
    expect(f.calls.scheduled.length).toBeGreaterThan(0);
  });

  it('works in English too (swap, more reps)', async () => {
    const f = await running('routine-bodyweight', 'en');
    f.advance(4000);
    f.c.onFinal('five more reps');
    expect(f.c.state().run!.items[0]).toMatchObject({ reps: 20 });
    f.c.onFinal('swap push-ups for dips');
    expect(f.c.state().run!.items[1]!.name).toBe('dips');
  });

  it('ends early, offers to save changes (default no), and saves a copy of a built-in on request', async () => {
    const f = await running();
    f.c.onFinal('휴식 20초로 바꿔줘');
    f.c.onFinal('운동 그만할래');
    const s = f.c.state();
    expect(s.phase).toBe('ended');
    expect(s.offerSave).toBe(true);
    expect(f.db.finished).toHaveLength(1);
    const saved = await f.c.close(true);
    expect(saved!.id).not.toBe('routine-bodyweight');
    expect(saved!.items[0]).toMatchObject({ restSec: 20 });
    expect(saved!.name).toContain('내 버전');
    expect(f.db.routines).toHaveLength(1);
  });

  it('does not save by default and never touches the template', async () => {
    const f = await running();
    f.c.onFinal('휴식 20초로 바꿔줘');
    f.c.end();
    await f.c.close(false);
    expect(f.db.routines).toEqual([]);
  });

  it('finishes by itself after the closing unit', async () => {
    const f = await running('routine-taegeuk-1', 'en');
    f.advance(10 * 60_000);
    f.c.tick();
    expect(f.c.state().phase).toBe('ended');
    expect(f.c.state().run!.endedEarly).toBe(false);
  });
});

describe('correction notes', () => {
  it('attaches mid-practice to the current movement, stores it, journals it, and plays the cue before it', async () => {
    const f = fakes({ running: true });
    await f.c.start(tpl('routine-taegeuk-1'));
    // Move into movement 5.
    const t0 = f.c.state().timelineStart!;
    const m5 = f.c.state().run!.items[0]!.kind === 'poomsae' ? 0 : 0;
    expect(m5).toBe(0);
    f.advance(1500 + 2500 * 4 + 1800 + 1500); // lead-in + intro + four movements, then 1.5 s into movement 5
    f.calls.scheduled.length = 0;
    f.c.onFinal('오른손 먼저 나가야되는데 자꾸 왼손이 나가요');
    const c = f.db.corrections[0]!;
    expect(c).toMatchObject({ cue: '오른손 먼저!', movementNo: 5, templateId: 'routine-taegeuk-1', side: 'right' });
    expect(f.db.journal[0]).toMatchObject({ source: 'user_note', taskLabel: expect.stringContaining('5번 동작'), taskId: 'routine-taegeuk-1:t1-5' });
    expect(f.c.state().turns[0]!.reply).toContain('5번 동작');
    expect(t0).toBeGreaterThan(0);
    await Promise.resolve();
    await Promise.resolve();
    // Re-planned from the next boundary on the same grid, so future passes include the cue before movement 5... (pass 1 is already past it)
    expect(f.calls.prepared).toContain('오른손 먼저!');
  });

  it('an explicit note with a named movement and a technique name ambiguity uses the picker + askLlm stub', async () => {
    const f = fakes({ running: true });
    await f.c.start(tpl('routine-taegeuk-1'));
    f.advance(3000);
    f.c.onFinal('문제: 아래막기 할 때 왼손이 나가요');
    const pick = f.c.state().pick!;
    expect(pick.candidates.length).toBeGreaterThan(1);
    expect(askLlm).toHaveBeenCalled();
    expect(f.db.corrections).toEqual([]);
    const target = pick.candidates[2]!;
    f.c.pickTarget(target);
    expect(f.db.corrections[0]!.movementNo).toBe(target.kind === 'movement' ? target.no : -1);
    expect(f.c.state().pick).toBeNull();
  });

  it('a named movement beats position; "mark as fixed" stops the cue', async () => {
    const f = fakes({ running: true });
    await f.c.start(tpl('routine-taegeuk-1', 'en'));
    f.advance(3000);
    f.c.onFinal('note: movement 12 I keep dropping my left hand');
    expect(f.db.corrections[0]).toMatchObject({ movementNo: 12, cue: 'left hand!' });
    f.c.onFinal('note: squeeze the hip');
    expect(f.db.corrections).toHaveLength(2);
    f.c.onFinal('mark as fixed'); // two active notes and nothing played or current: ask for the editor
    expect(f.db.corrections.every((c) => !c.fixed)).toBe(true);
    f.c.onPaceBeat({ tag: `cue:${f.db.corrections[0]!.id}` });
    f.c.onFinal('mark as fixed');
    expect(f.db.corrections[0]!.fixed).toBe(true);
    expect(f.db.corrections[1]!.fixed).toBe(false);
  });

  it('counts the cues that played and writes the session summary line', async () => {
    const f = fakes({ running: true });
    await f.c.start(tpl('routine-taegeuk-1'));
    f.advance(3000);
    f.c.addCorrectionFromText('5번 동작 오른손 먼저 나가야되는데 자꾸 왼손이 나가요');
    const id = f.db.corrections[0]!.id;
    for (let i = 0; i < 3; i++) f.c.onPaceBeat({ tag: `cue:${id}` });
    f.c.end();
    expect(f.c.state().summaryLine).toBe('오늘 5번 동작 오른손 먼저 큐 3번 나왔어요');
    expect(f.db.shown.get(id)).toBe(3);
    expect(f.db.journal.some((j) => j.source === 'generated_summary')).toBe(true);
  });

  it('loads stored corrections into the next run and pre-synthesizes their cues', async () => {
    const f = fakes({ running: true });
    f.db.corrections.push({ id: 'old', templateId: 'routine-taegeuk-1', movementId: 't1-5', itemId: 'p1', movementNo: 5, text: 'x', cue: '오른손 먼저!', lang: 'ko', fixed: false, createdAt: 1, shown: 0 });
    await f.c.start(tpl('routine-taegeuk-1'));
    expect(f.calls.prepared).toContain('오른손 먼저!');
    const all = f.calls.scheduled.flatMap((s) => s.beats);
    expect(all.filter((b) => b.tag === 'cue:old')).toHaveLength(1);
    const kihap = all.filter((b) => b.tag === 'cue:kihap:t1-18');
    expect(kihap).toHaveLength(1);
  });
});

describe('setup text', () => {
  it('parse stores a draft, logs the unparsed part and calls the LLM stub for leftovers', () => {
    const f = fakes();
    const p = f.c.parseText('스쿼트 15개 3세트, 열심히 하기');
    expect(p.items).toHaveLength(1);
    expect(f.c.state().draft).toBe(p);
    expect(f.db.events).toContain('llm_needed');
    expect(askLlm).toHaveBeenCalled();
    const saved = f.c.saveDraft('내 루틴', p.items, 'ko');
    expect(f.db.routines[0]!.id).toBe(saved.id);
    expect(f.c.state().draft).toBeNull();
  });
});

describe('voice setup', () => {
  it('"루틴 만들기" prompts, a spoken list becomes a draft, and "start my last routine" starts it', async () => {
    const f = fakes();
    await f.c.startVoiceSetup('ko');
    expect(f.calls.started).toBe(1);
    expect(f.c.isListening()).toBe(true);
    f.c.onFinal('루틴 만들기', 'ko');
    expect(f.calls.spoken[0]).toContain('어떤 운동');
    f.c.onFinal('스쿼트 15개 3세트, 플랭크 45초, 세트 사이 휴식 30초', 'ko');
    expect(f.c.state().draft!.items).toHaveLength(2);
    expect(f.calls.spoken[1]).toContain('2개 운동');
    f.c.onFinal('start my last routine', 'en');
    await Promise.resolve();
    expect(f.calls.spoken[2]).toBe('There is no previous routine yet.');
    await f.c.stopVoiceSetup();
    expect(f.c.isListening()).toBe(false);
  });
});
