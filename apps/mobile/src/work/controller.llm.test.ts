import type { TaskTransport } from '@vlc/llm';
import { afterEach, describe, expect, it } from 'vitest';

import { setLlmTransport } from '../llm/askLlm';
import { WorkController, type NativePort, type StorePort } from './controller';

const T0 = 1_700_000_000_000;
const flat = (o: Record<string, unknown> = {}) => ({ type: 'none', target: '', label: '', from: '', seconds: 0, count: 0, flag: false, ...o });
const align = (o: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({ text: '', ...flat(o), confidence: 'high', needsConfirmation: false, confirmQuestion: '', ...extra });

function setup(transport: TaskTransport | null) {
  setLlmTransport(transport);
  const clock = { now: T0 };
  const spoken: string[] = [];
  const events: { kind: string; payload: any }[] = [];
  const native = {
    isRunning: () => true, async start() {}, async stop() {}, speak: (t: string) => spoken.push(t), stopSpeaking() {}, scheduleCue() {}, cancelCue() {}, ackCue: () => true,
  };
  const store: StorePort = { saveSession() {}, appendEvent: (kind, payload) => events.push({ kind, payload }), createJournal() {}, deleteJournal() {} };
  let n = 0;
  const c = new WorkController(native as unknown as NativePort, store, { now: () => clock.now, newId: () => `id${++n}`, settings: () => ({ nudgeLevel: 'normal', focusBreakEnabled: false, focusBreakMinutes: 50 }) });
  c.createDraft({ lang: 'ko', title: 't', steps: [{ label: '파스타' }] });
  c.begin();
  spoken.length = 0;
  return { c, spoken, events, clock };
}
const reply = (o: unknown): TaskTransport => ({ name: 'fake', call: async () => ({ text: JSON.stringify(o), promptTokens: 1, completionTokens: 1, ms: 1 }) });
const settle = () => new Promise((r) => setTimeout(r, 5));
const controllers: WorkController[] = [];
afterEach(() => {
  setLlmTransport(null);
  controllers.splice(0).forEach((c) => c.dispose());
});

describe('Work Partner LLM tier', () => {
  it('applies a confident LLM action through the engine after hypotheses disagree', async () => {
    const t = setup(reply(align({ type: 'start_timer', label: '쿠키', seconds: 300 })));
    controllers.push(t.c);
    t.c.onFinal('쿠키 5분 타이머', ['쿠키 5분 타이머', '쿠기 5분 타이머'], 'ko');
    await settle();
    const timers = Object.values(t.c.state().session!.timers);
    expect(timers.map((x) => [x.label, x.durationMs])).toEqual([['쿠키', 300000]]);
    expect(t.events.some((e) => e.kind === 'utterance' && e.payload.outcome === 'llm' && e.payload.ok)).toBe(true);
  });

  it('asks before acting on a risky proposal and applies only on yes', async () => {
    const t = setup(reply(align({ type: 'start_timer', label: '쿠키', seconds: 300 }, { needsConfirmation: true, confirmQuestion: '쿠키 5분 타이머 맞나요?' })));
    controllers.push(t.c);
    t.c.onFinal('쿠키 5분 타이머', ['쿠키 5분 타이머', '쿠기 5분 타이머'], 'ko');
    await settle();
    expect(t.spoken).toEqual(['쿠키 5분 타이머 맞나요?']);
    expect(Object.keys(t.c.state().session!.timers)).toHaveLength(0);
    t.c.onFinal('네', undefined, 'ko');
    expect(Object.values(t.c.state().session!.timers).map((x) => x.label)).toEqual(['쿠키']);
  });

  it('drops the pending action on no, after a timeout, or when the user moves on', async () => {
    const t = setup(reply(align({ type: 'start_timer', label: '쿠키', seconds: 300 }, { needsConfirmation: true, confirmQuestion: 'q?' })));
    controllers.push(t.c);
    t.c.onFinal('쿠키 5분 타이머', ['쿠키 5분 타이머', '쿠기 5분 타이머'], 'ko');
    await settle();
    t.c.onFinal('아니', undefined, 'ko');
    expect(Object.keys(t.c.state().session!.timers)).toHaveLength(0);
    t.c.onFinal('쿠키 5분 타이머', ['쿠키 5분 타이머', '쿠기 5분 타이머'], 'ko');
    await settle();
    t.clock.now += 60_000;
    t.c.onFinal('네', undefined, 'ko');
    expect(Object.keys(t.c.state().session!.timers)).toHaveLength(0);
  });

  it('falls back to the deterministic choice when the call fails and hypotheses disagree', async () => {
    const t = setup({ name: 'down', call: async () => { throw new Error('offline'); } });
    controllers.push(t.c);
    t.c.onFinal('쿠키 5분 타이머', ['쿠키 5분 타이머', '쿠기 5분 타이머'], 'ko');
    await settle();
    expect(Object.values(t.c.state().session!.timers).map((x) => x.label)).toEqual(['쿠키']);
  });

  it('asks the user to repeat when a free-form question gets no answer', async () => {
    const t = setup({ name: 'down', call: async () => { throw new Error('offline'); } });
    controllers.push(t.c);
    t.c.onFinal('how long should the rice rest after cooking it', undefined, 'en');
    await settle();
    expect(t.spoken).toEqual(['잘 못 알아들었어요. 다시 말씀해 주세요.']);
  });

  it('rejects an LLM action the engine refuses (unknown timer) without changing state', async () => {
    const t = setup(reply(align({ type: 'cancel_timer', target: '없는타이머' }, { needsConfirmation: true, confirmQuestion: '취소할까요?' })));
    controllers.push(t.c);
    t.c.onFinal('없는타이머 취소', ['없는타이머 취소', '없는 타이머 취소해'], 'ko');
    await settle();
    t.c.onFinal('네', undefined, 'ko');
    expect(Object.keys(t.c.state().session!.timers)).toHaveLength(0);
  });
});
