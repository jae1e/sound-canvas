import { afterEach, describe, expect, it } from 'vitest';
import { stepsOf, type Lang, type Session } from '@vlc/session-engine';

import type { NewJournalEntry } from '../db/repos/journal';
import { WorkController, type NativePort, type StorePort, type WorkSettings } from './controller';

const MIN = 60_000;
const T0 = 1_700_000_000_000;

function setup(opts: { running?: boolean; settings?: Partial<WorkSettings> } = {}) {
  const clock = { now: T0 };
  const native = {
    running: opts.running ?? true,
    spoken: [] as { text: string; priority: string }[],
    cues: new Map<string, { at: number; text: string }>(),
    acked: [] as string[],
    scheduleLog: [] as string[],
    isRunning() {
      return this.running;
    },
    async start() {
      this.running = true;
    },
    async stop() {
      this.running = false;
      this.cues.clear();
    },
    speak(text: string, priority: 'high' | 'normal') {
      this.spoken.push({ text, priority });
    },
    stopSpeaking() {},
    scheduleCue(id: string, at: number, text: string) {
      this.cues.set(id, { at, text });
      this.scheduleLog.push(`+${id}`);
    },
    cancelCue(id: string) {
      this.cues.delete(id);
      this.scheduleLog.push(`-${id}`);
    },
    ackCue(id: string) {
      this.acked.push(id);
      return true;
    },
  };
  const db = {
    saved: [] as { session: Session; title: string | null }[],
    events: [] as { kind: string; payload: any }[],
    journal: new Map<string, NewJournalEntry>(),
  };
  const store: StorePort = {
    saveSession: (session, title) => db.saved.push({ session: structuredClone(session), title }),
    appendEvent: (kind, payload) => db.events.push({ kind, payload }),
    createJournal: (e) => db.journal.set(e.id, e),
    deleteJournal: (id) => db.journal.delete(id),
  };
  let n = 0;
  const settings: WorkSettings = { nudgeLevel: 'normal', focusBreakEnabled: false, focusBreakMinutes: 50, ...opts.settings };
  const c = new WorkController(native as NativePort, store, { now: () => clock.now, newId: () => `id${++n}`, settings: () => settings });
  controllers.push(c);
  return { c, clock, native, db, settings };
}
const controllers: WorkController[] = [];
afterEach(() => {
  controllers.splice(0).forEach((c) => c.dispose());
});

const plan = [
  { label: 'unpack', estimateMs: 5 * MIN },
  { label: 'frame', estimateMs: 20 * MIN },
  { label: 'shelves' },
];
function started(o: Parameters<typeof setup>[0] = {}, lang: Lang = 'en') {
  const t = setup(o);
  t.c.createDraft({ lang, title: 'Shelf', steps: plan });
  t.c.begin();
  return t;
}
const cur = (c: WorkController) => stepsOf(c.state().session as Session).find((s) => s.status === 'in_progress')?.label;

describe('lifecycle and persistence', () => {
  it('persists the draft and every applied action', () => {
    const { c, db } = setup();
    c.createDraft({ lang: 'en', title: 'Shelf', steps: plan });
    const afterDraft = db.saved.length;
    expect(afterDraft).toBe(4); // draft + three add_step
    expect(db.saved.at(-1)?.session.status).toBe('ready');
    c.begin();
    expect(db.saved.length).toBe(afterDraft + 2); // start_session, next_step
    expect(db.saved.at(-1)?.session.status).toBe('active');
    c.dispatch({ type: 'next_step' });
    expect(db.saved.length).toBe(afterDraft + 3);
    expect(db.saved.at(-1)?.title).toBe('Shelf');
    expect(cur(c)).toBe('frame');
  });

  it('speaks the first step when it begins and listening is on', () => {
    const { native } = started();
    expect(native.spoken.map((s) => s.text)).toEqual(['Next is step 1 of 3: unpack, about 5 minutes.']);
  });

  it('is silent while the native session is off (nothing to speak through)', () => {
    const { native } = started({ running: false });
    expect(native.spoken).toEqual([]);
  });

  it('refuses a second open session', () => {
    const { c } = started();
    expect(() => c.createDraft({ lang: 'en' })).toThrow();
  });

  it('end writes a generated summary, cancels cues and stops accepting speech', () => {
    const { c, db, native } = started();
    c.dispatch({ type: 'next_step' });
    c.end();
    const summary = [...db.journal.values()].find((e) => e.source === 'generated_summary');
    expect(summary).toMatchObject({ mode: 'work', sessionId: c.state().session?.id });
    expect(summary?.text).toContain('1 of 3 steps done');
    expect(native.cues.size).toBe(0);
    expect(c.onFinal('next step', undefined, 'en')).toBeNull();
  });

  it('Korean summary text', () => {
    const { c, db } = started({}, 'ko');
    c.end();
    expect([...db.journal.values()][0]?.text).toContain('3단계 중 0단계 완료');
  });
});

describe('voice loop', () => {
  it('applies a spoken command, persists it and says the acknowledgement', () => {
    const { c, db, native } = started();
    native.spoken.length = 0;
    const saves = db.saved.length;
    c.onFinal('next step', ['next step'], 'en');
    expect(cur(c)).toBe('frame');
    expect(db.saved.length).toBe(saves + 1);
    expect(native.spoken[0]?.text).toBe('Marked the unpack done. Next is step 2 of 3: frame, about 20 minutes.');
    expect(c.state().turns[0]).toMatchObject({ heard: 'next step', outcome: 'applied' });
  });

  it('answers "what\'s left" without changing or persisting anything', () => {
    const { c, db, native } = started();
    native.spoken.length = 0;
    const saves = db.saved.length;
    c.onFinal("what's left", undefined, 'en');
    expect(native.spoken[0]?.text).toBe('3 steps left: unpack, frame, and shelves.');
    expect(db.saved.length).toBe(saves);
  });

  it('uses the n-best list', () => {
    const { c } = started();
    c.onFinal('nest step', ['nest step', 'next step'], 'en');
    expect(cur(c)).toBe('frame');
    expect(c.state().turns[0]?.chosenIndex).toBe(1);
  });

  it('saves a voice note linked to the current step, and undo removes it', () => {
    const { c, db, native } = started();
    native.spoken.length = 0;
    c.onFinal('note: use the longer screws', undefined, 'en');
    const [note] = [...db.journal.values()];
    expect(note).toMatchObject({ source: 'user_note', mode: 'work', text: 'use the longer screws', taskLabel: 'unpack' });
    expect(note?.taskId).toBe(stepsOf(c.state().session as Session)[0]?.id);
    expect(native.spoken[0]?.text).toBe('Saved the note on unpack.');
    expect(c.undoLast()).toBe(true);
    expect(db.journal.size).toBe(0);
  });

  it('hands unanswerable questions to the LLM stub: logs llm_needed and says it cannot answer', () => {
    const { c, db, native } = started();
    native.spoken.length = 0;
    c.onFinal('how much is three quarters of a cup in grams', undefined, 'en');
    expect(native.spoken.map((s) => s.text)).toEqual(["I can't answer that yet."]);
    const ev = db.events.find((e) => e.kind === 'llm_needed');
    expect(ev?.payload).toMatchObject({ heard: 'how much is three quarters of a cup in grams', lang: 'en' });
  });

  it('stays silent on chatter but logs it', () => {
    const { c, db, native } = started();
    native.spoken.length = 0;
    c.onFinal('the screws are in the box', undefined, 'en');
    expect(native.spoken).toEqual([]);
    expect(db.events.some((e) => e.kind === 'unrecognized')).toBe(true);
  });

  it('records partial transcripts and clears them on a final', () => {
    const { c } = started();
    c.onPartial('다음');
    expect(c.state().partial).toBe('다음');
    c.onFinal('next step', undefined, 'en');
    expect(c.state().partial).toBe('');
  });
});

describe('ending by voice', () => {
  it('needs a second request within the window, and the first one changes nothing', () => {
    const { c, clock, native, db } = started();
    native.spoken.length = 0;
    c.onFinal('end session', undefined, 'en');
    expect(c.state().session?.status).toBe('active');
    expect(native.spoken.map((s) => s.text)).toEqual(['End the session? Say it again to confirm.']);
    clock.now += 5000;
    c.onFinal('end session', undefined, 'en');
    expect(c.state().session?.status).toBe('ended');
    expect([...db.journal.values()].some((e) => e.source === 'generated_summary')).toBe(true);
  });

  it('a stale first request does not count', () => {
    const { c, clock } = started();
    c.onFinal('end session', undefined, 'en');
    clock.now += 60_000;
    c.onFinal('end session', undefined, 'en');
    expect(c.state().session?.status).toBe('active');
  });

  it('Korean confirmation prompt', () => {
    const { c, native } = started({}, 'ko');
    native.spoken.length = 0;
    c.onFinal('세션 종료', undefined, 'ko');
    expect(native.spoken[0]?.text).toBe('세션을 끝낼까요? 끝내려면 한 번 더 말씀해 주세요.');
  });
});

describe('undo and correct', () => {
  it('undo restores the previous engine state and re-persists it', () => {
    const { c, db } = started();
    c.onFinal('next step', undefined, 'en');
    expect(cur(c)).toBe('frame');
    expect(c.state().canUndo).toBe(true);
    c.undoLast();
    expect(cur(c)).toBe('unpack');
    expect(stepsOf(db.saved.at(-1)!.session)[0]?.status).toBe('in_progress');
  });

  it('undo with nothing to undo does nothing', () => {
    const { c } = setup();
    c.createDraft({ lang: 'en' });
    expect(c.undoLast()).toBe(false);
  });

  it('correct rewinds the last voice turn and applies the corrected text', () => {
    const { c } = started();
    c.dispatch({ type: 'add_step', label: 'doors' });
    c.onFinal('skip', undefined, 'en'); // wrong: the user meant "next step"
    expect(stepsOf(c.state().session as Session)[0]?.status).toBe('skipped');
    c.correct('next step');
    const steps = stepsOf(c.state().session as Session);
    expect(steps[0]?.status).toBe('completed');
    expect(cur(c)).toBe('frame');
    expect(c.state().turns[0]?.outcome).toBe('correction');
  });

  it('correct after a button press does not rewind it', () => {
    const { c } = started();
    c.dispatch({ type: 'next_step' });
    c.correct('what is left');
    expect(cur(c)).toBe('frame');
  });
});

describe('cues and nudges', () => {
  it('arms the overrun check-in and timer cues natively when listening', () => {
    const { c, native } = started();
    c.dispatch({ type: 'start_timer', label: 'glue', durationMs: 10 * MIN });
    const times = [...native.cues.values()].map((x) => x.at - T0).sort((a, b) => a - b);
    expect(times).toEqual([5 * MIN, 9 * MIN, 10 * MIN]);
    expect([...native.cues.values()].map((x) => x.text)).toContain('The unpack step is taking longer than planned. How is it going? Tell me if you need more time.');
  });

  it('cancels cues of a step that was finished early', () => {
    const { c, native } = started();
    expect(native.cues.size).toBe(1);
    c.dispatch({ type: 'next_step' });
    expect([...native.cues.values()].map((x) => x.at - T0)).toEqual([20 * MIN]);
  });

  it('the quiet level arms only what the user asked for', () => {
    const { c, native } = started({ settings: { nudgeLevel: 'quiet' } });
    c.dispatch({ type: 'start_timer', label: 'glue', durationMs: 10 * MIN });
    expect([...native.cues.values()].map((x) => x.at - T0)).toEqual([10 * MIN]);
  });

  it('voice "quiet for 10 minutes" drops nudge cues but keeps the timer expiry', () => {
    const { c, native } = started();
    c.dispatch({ type: 'start_timer', label: 'glue', durationMs: 10 * MIN });
    c.onFinal('quiet for 10 minutes', undefined, 'en');
    expect([...native.cues.values()].map((x) => x.at - T0)).toEqual([10 * MIN]);
  });

  it('a fired cue is acked and spoken once; the 1 Hz tick does not repeat it', () => {
    const { c, clock, native } = started();
    c.dispatch({ type: 'start_timer', label: 'glue', durationMs: 3 * MIN });
    native.spoken.length = 0;
    clock.now = T0 + 3 * MIN;
    const id = [...native.cues.entries()].find(([, v]) => v.at === T0 + 3 * MIN)![0];
    c.onCueDue(id);
    expect(native.acked).toEqual([id]);
    expect(native.spoken).toEqual([{ text: 'The glue timer is up. Check it and let me know.', priority: 'high' }]);
    c.tick();
    expect(native.spoken).toHaveLength(1);
    expect(native.cues.has(id)).toBe(false);
  });

  it('speaks an overrun check-in as a normal-priority nudge, once', () => {
    const { c, clock, native } = started();
    native.spoken.length = 0;
    clock.now = T0 + 5 * MIN;
    c.tick();
    expect(native.spoken).toHaveLength(1);
    expect(native.spoken[0]).toMatchObject({ priority: 'normal' });
    expect(native.spoken[0]?.text).toContain('taking longer than planned');
    clock.now = T0 + 5 * MIN + 1000;
    c.tick();
    expect(native.spoken).toHaveLength(1);
  });

  it('quiet mode keeps overrun and milestone nudges silent but still closes them', () => {
    const { c, clock, native } = started();
    c.setQuiet(true);
    native.spoken.length = 0;
    clock.now = T0 + 6 * MIN;
    c.tick();
    expect(native.spoken).toEqual([]);
    expect(Object.values((c.state().session as Session).checkIns).every((ci) => ci.status !== 'scheduled')).toBe(true);
  });

  it('stale nudges after a long gap (killed app) are dropped, a stale timer expiry is still said', () => {
    const { c, clock, native } = started();
    c.dispatch({ type: 'start_timer', label: 'glue', durationMs: 2 * MIN });
    native.spoken.length = 0;
    clock.now = T0 + 40 * MIN;
    c.tick();
    expect(native.spoken.map((s) => s.text)).toEqual(['The glue timer ran out. Check it and let me know.']);
  });

  it('skipped-step question is said once, after the delay', () => {
    const { c, clock, native } = started();
    c.dispatch({ type: 'skip_task', task: { implicit: true } });
    native.spoken.length = 0;
    clock.now = T0 + 29_000;
    c.tick();
    expect(native.spoken).toEqual([]);
    clock.now = T0 + 31_000;
    c.tick();
    expect(native.spoken.map((s) => s.text)).toEqual(['You skipped unpack. Was that on purpose? Say go back to return to it.']);
  });

  it('focus break is armed from settings and fires after N minutes', () => {
    const { c, clock, native } = started({ settings: { focusBreakEnabled: true, focusBreakMinutes: 50 } });
    expect([...native.cues.values()].some((x) => x.at === T0 + 50 * MIN)).toBe(true);
    native.spoken.length = 0;
    clock.now = T0 + 50 * MIN;
    c.tick();
    expect(native.spoken.map((s) => s.text)).toEqual(["That's 50 minutes of focus. Want to take a short break?"]);
  });

  it('chatty level adds the derived halfway cue and speaks it when it fires', () => {
    const { c, clock, native } = started({ settings: { nudgeLevel: 'chatty' } });
    const half = [...native.cues.entries()].find(([id]) => id.startsWith('half:'));
    expect(half?.[1].at).toBe(T0 + 2.5 * MIN + 0); // 5 min estimate is below the 2 min floor? 5 min / 2
    native.spoken.length = 0;
    clock.now = T0 + 2.5 * MIN;
    c.onCueDue(half![0]);
    expect(native.spoken[0]?.text).toBe('Halfway through unpack. About 2 minutes 30 seconds left.');
  });

  it('cue sync is idempotent: repeating it schedules nothing new', () => {
    const { c, native } = started();
    const before = native.scheduleLog.length;
    c.syncCues();
    c.syncCues();
    expect(native.scheduleLog.length).toBe(before);
  });
});

describe('restore after the app was killed', () => {
  it('re-attaches the saved session, keeps due events visible while nothing can speak, and speaks on resume', async () => {
    const first = started();
    first.c.dispatch({ type: 'start_timer', label: 'glue', durationMs: 3 * MIN });
    const saved = first.db.saved.at(-1)!;
    first.c.dispose();

    const t = setup({ running: false });
    t.c.restore(saved.session, saved.title);
    expect(t.c.state().session?.status).toBe('active');
    expect(t.c.state().title).toBe('Shelf');
    t.clock.now = T0 + 4 * MIN;
    t.c.tick();
    expect(t.c.state().missed.map((m) => m.text)).toEqual(['The glue timer is up. Check it and let me know.']);
    expect(t.native.spoken).toEqual([]);

    t.native.running = false;
    await t.c.startListening();
    expect(t.c.state().listen).toBe('on');
    // Arms what is still ahead of us (the overrun check-in already passed and the timer is due now).
    expect(t.native.spoken.map((s) => s.text)).toEqual(expect.arrayContaining(['The glue timer is up. Check it and let me know.']));
    expect(t.c.state().missed).toEqual([]);
  });

  it('shows the on-screen alert and lets the user dismiss it', () => {
    const first = started();
    first.c.dispatch({ type: 'start_timer', label: 'glue', durationMs: 1 * MIN });
    const saved = first.db.saved.at(-1)!;
    const t = setup({ running: false });
    t.c.restore(saved.session, saved.title);
    t.clock.now = T0 + 2 * MIN;
    t.c.tick();
    const key = t.c.state().missed[0]!.key;
    t.c.acknowledgeMissed(key);
    expect(t.c.state().missed).toEqual([]);
  });
});

describe('native session control', () => {
  it('start failure is reported and leaves the session usable', async () => {
    const t = setup({ running: false });
    t.native.start = async () => {
      throw new Error('Microphone permission was not granted.');
    };
    t.c.createDraft({ lang: 'en', steps: plan });
    expect(await t.c.startListening()).toBe(false);
    expect(t.c.state()).toMatchObject({ listen: 'error', listenError: 'Microphone permission was not granted.' });
    t.c.begin();
    expect(cur(t.c)).toBe('unpack');
  });

  it('stopListening clears armed cues so they are re-armed on the next start', async () => {
    const t = started();
    expect(t.native.cues.size).toBe(1);
    await t.c.stopListening();
    expect(t.c.state().listen).toBe('off');
    await t.c.startListening();
    expect(t.native.cues.size).toBe(1);
  });
});

describe('templates', () => {
  it('captures the plan as a template and loads a template into a new draft', () => {
    const { c } = started();
    const tpl = c.planAsTemplate('My shelf');
    expect(tpl.steps.map((s) => s.label)).toEqual(['unpack', 'frame', 'shelves']);
    c.end();
    c.dismiss();
    c.createDraft({ lang: 'en' });
    c.loadTemplate(tpl);
    expect(stepsOf(c.state().session as Session).map((s) => s.label)).toEqual(['unpack', 'frame', 'shelves']);
    expect(c.state().title).toBe('My shelf');
  });
});
