import { afterEach, describe, expect, it } from 'vitest';
import type { TaskTransport } from '@vlc/llm';
import { builtinRoutines } from '@vlc/session-engine';

import { setLlmTransport } from '../llm/askLlm';
import { RoutineController, type RoutineNativePort, type RoutineStorePort } from './controller';

const flat = (o: Record<string, unknown> = {}) => ({ type: 'none', target: '', label: '', from: '', seconds: 0, count: 0, flag: false, ...o });

function make() {
  const spoken: string[] = [];
  const native: RoutineNativePort = {
    isRunning: () => true,
    start: async () => undefined,
    stop: async () => undefined,
    speak: (t) => void spoken.push(t),
    stopSpeaking: () => undefined,
    prepare: async (clips) => ({ clips: clips.map((c) => ({ text: c.text, durationMs: 300, ok: true })), failed: [], engine: 'platform' }),
    schedule: () => undefined,
    cancel: () => undefined,
  };
  const store = {
    listCorrections: () => [],
    saveCorrection: () => undefined,
    deleteCorrection: () => undefined,
    setFixed: () => undefined,
    addShown: () => undefined,
    saveRoutine: () => undefined,
    listRoutines: () => [],
    getRoutine: () => null,
    touchUsed: () => undefined,
    startRun: () => undefined,
    finishRun: () => undefined,
    lastRun: () => null,
    appendEvent: () => undefined,
    createJournal: () => undefined,
  } as unknown as RoutineStorePort;
  let now = 1_000_000;
  let n = 0;
  const c = new RoutineController(native, store, { now: () => now, newId: () => `id${++n}`, level: () => 'full' });
  return { c, spoken, advance: (ms: number) => (now += ms) };
}

const setupJson = { name: '하체', targetMinutes: 20, items: [{ kind: 'exercise', name: '스쿼트', reps: 15, sets: 3, secPerRep: 3, holdSec: 0, perSide: false, restSec: 30, repeat: 0, formNo: 0 }, { kind: 'exercise', name: '런지', reps: 12, sets: 3, secPerRep: 3, holdSec: 0, perSide: false, restSec: 30, repeat: 0, formNo: 0 }], assumptions: ['세트 사이 30초 휴식'], needsConfirmation: false, question: '' };
const reply = (o: unknown): TaskTransport => ({ name: 'fake', call: async () => ({ text: JSON.stringify(o), promptTokens: 1, completionTokens: 1, ms: 1 }) });
const settle = () => new Promise((r) => setTimeout(r, 5));
afterEach(() => setLlmTransport(null));

describe('routine LLM tier', () => {
  it('a free-form description that the parser misreads becomes the model routine, as an editable draft', async () => {
    setLlmTransport(reply(setupJson));
    const { c, spoken } = make();
    await c.startVoiceSetup('ko');
    c.onFinal('오늘은 하체 위주로 20분 정도', 'ko');
    expect(spoken[0]).toBe('잠시만요, 정리해 볼게요.');
    await settle();
    const d = c.state().draft!;
    expect(d.items.map((i) => i.name)).toEqual(['스쿼트', '런지']);
    expect(d.assumed[0]).toMatch(/AI/);
    expect(spoken[1]).toBe('2개 운동을 찾았어요. 화면에서 확인해 주세요.');
  });

  it('keeps the deterministic draft and says so when the model fails', async () => {
    setLlmTransport({ name: 'down', call: async () => { throw new Error('offline'); } });
    const { c, spoken } = make();
    await c.startVoiceSetup('ko');
    c.onFinal('알아서 운동 좀 짜줘', 'ko');
    await settle();
    expect(spoken[spoken.length - 1]).toBe('이해하지 못했어요. 다시 말하거나 입력해 주세요.');
  });

  it('routes a live utterance the grammar misses to the command task and asks before ending', async () => {
    const { c, spoken } = make();
    await c.start(builtinRoutines('ko').find((r) => r.id === 'routine-bodyweight')!);
    setLlmTransport(reply({ kind: 'action', ...flat({ type: 'end' }), question: '여기서 끝낼까요?' }));
    c.onFinal('오늘 운동은 이만 접을게요', 'ko');
    await settle();
    expect(spoken[spoken.length - 1]).toBe('여기서 끝낼까요?');
    expect(c.state().phase).toBe('running');
    c.onFinal('네', 'ko');
    expect(c.state().phase).toBe('ended');
  });

  it('applies a safe live command from the model directly', async () => {
    const { c } = make();
    await c.start(builtinRoutines('ko').find((r) => r.id === 'routine-bodyweight')!);
    setLlmTransport(reply({ kind: 'action', ...flat({ type: 'tempo_slower' }), question: '' }));
    c.onFinal('조금만 여유롭게 가자', 'ko');
    await settle();
    expect(c.state().run!.tempoFactor).toBeGreaterThan(1);
  });
});
