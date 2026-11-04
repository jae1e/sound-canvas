import { TAEGEUK_1_MOVEMENTS, poomsaeItem } from '@vlc/session-engine';
import { describe, expect, it } from 'vitest';

import { BackendTransport, FakeBackend, runTask, TASKS, WorkerTransport, correctionItems, LlmBackendError } from '../src';

const flat = (o: Record<string, unknown>) => ({ type: 'none', target: '', label: '', from: '', seconds: 0, count: 0, flag: false, ...o });
const run = <T extends keyof typeof TASKS>(name: T, response: unknown, input: Parameters<typeof runTask<T>>[2]) =>
  runTask(new BackendTransport(new FakeBackend([typeof response === 'string' ? response : JSON.stringify(response)])), name, input);

const workCtx = { mode: 'work' as const, tasks: ['파스타'], timers: [{ label: '파스타', remainingSec: 70 }], items: [] };

describe('align', () => {
  const input = { hypotheses: ['리조트 5분 타이머', '리조또 5분 타이머'], lang: 'ko' as const, context: workCtx, recentTurns: [] };
  const ans = { text: '리조또 5분 타이머', ...flat({ type: 'start_timer', label: '리조또', seconds: 300 }), confidence: 'medium', needsConfirmation: true, confirmQuestion: '리조또 5분 타이머 맞나요?' };

  it('maps the device case to a start_timer action that needs confirmation', async () => {
    const r = await run('align', ans, input);
    expect(r.ok && r.value.mapped).toEqual({ domain: 'work', action: { type: 'start_timer', label: '리조또', durationMs: 300000 } });
    expect(r.ok && r.value.needsConfirmation).toBe(true);
    expect(r.ok && r.value.confirmQuestion).toBe('리조또 5분 타이머 맞나요?');
  });
  it('forces confirmation for hard-to-undo actions and fills a default question', async () => {
    const r = await run('align', { ...ans, ...flat({ type: 'cancel_timer', target: '파스타' }), confidence: 'high', needsConfirmation: false, confirmQuestion: '' }, input);
    expect(r.ok && r.value.needsConfirmation).toBe(true);
    expect(r.ok && r.value.confirmQuestion).toContain('파스타');
  });
  it('treats low confidence as needing confirmation', async () => {
    const r = await run('align', { ...ans, confidence: 'low', needsConfirmation: false, confirmQuestion: '' }, input);
    expect(r.ok && r.value.needsConfirmation).toBe(true);
  });
  it('type none is not a command', async () => {
    const r = await run('align', { ...ans, ...flat({}), needsConfirmation: false, confirmQuestion: '' }, input);
    expect(r.ok && r.value.mapped).toBeNull();
  });
  it('rejects routine types in work mode, bad durations and malformed JSON', async () => {
    expect((await run('align', { ...ans, ...flat({ type: 'skip' }) }, input)).ok).toBe(false);
    const d = await run('align', { ...ans, seconds: 0 }, input);
    expect(!d.ok && d.detail).toBe('bad_duration');
    const j = await run('align', 'not json at all', input);
    expect(!j.ok && j.reason).toBe('invalid_json');
  });
  it('tolerates a fenced JSON answer', async () => {
    const r = await run('align', '```json\n' + JSON.stringify(ans) + '\n```', input);
    expect(r.ok).toBe(true);
  });
  it('puts context and every hypothesis in the prompt', () => {
    const p = TASKS.align.buildPrompt(TASKS.align.inputSchema.parse(input));
    expect(p.user).toContain('1. 리조트 5분 타이머');
    expect(p.user).toContain('2. 리조또 5분 타이머');
    expect(p.user).toContain('파스타 (1:10 left)');
    expect(p.system).toContain('start_timer');
  });
  it('restricts the schema enum to the mode', () => {
    const s = JSON.stringify(TASKS.align.outputSchema(TASKS.align.inputSchema.parse({ ...input, context: { ...workCtx, mode: 'routine' } })));
    expect(s).toContain('tempo_slower');
    expect(s).not.toContain('start_timer');
  });
});

describe('command', () => {
  const input = { utterance: '2분 더 줘', lang: 'ko' as const, context: workCtx, recentTurns: [] };
  it('maps an action, clarify and not_command', async () => {
    const a = await run('command', { kind: 'action', ...flat({ type: 'extend_timer', target: '파스타', seconds: 120 }), question: '' }, input);
    expect(a.ok && a.value).toMatchObject({ kind: 'action', mapped: { domain: 'work', action: { type: 'extend_timer', byMs: 120000, timer: { label: '파스타' } } } });
    const c = await run('command', { kind: 'clarify', ...flat({}), question: '어느 타이머요?' }, input);
    expect(c.ok && c.value).toEqual({ kind: 'clarify', question: '어느 타이머요?' });
    const n = await run('command', { kind: 'not_command', ...flat({}), question: '' }, input);
    expect(n.ok && n.value.kind).toBe('not_command');
  });
  it('rejects a clarify without a question and an action without a type', async () => {
    expect((await run('command', { kind: 'clarify', ...flat({}), question: '' }, input)).ok).toBe(false);
    expect((await run('command', { kind: 'action', ...flat({}), question: '' }, input)).ok).toBe(false);
  });
  it('maps routine commands', async () => {
    const ri = { utterance: '5개 더', lang: 'ko' as const, context: { mode: 'routine' as const, tasks: [], timers: [], items: ['스쿼트'] }, recentTurns: [] };
    const r = await run('command', { kind: 'action', ...flat({ type: 'more_reps', count: 5 }), question: '' }, ri);
    expect(r.ok && r.value).toMatchObject({ mapped: { domain: 'routine', command: { kind: 'more_reps', n: 5 } } });
    const e = await run('command', { kind: 'action', ...flat({ type: 'end' }), question: '' }, ri);
    expect(e.ok && e.value).toMatchObject({ needsConfirmation: true });
  });
});

describe('routine_setup', () => {
  const item = (o: Record<string, unknown>) => ({ kind: 'exercise', name: '스쿼트', reps: 12, sets: 3, secPerRep: 3, holdSec: 0, perSide: false, restSec: 20, repeat: 0, formNo: 0, ...o });
  const base = { name: '하체', targetMinutes: 0, items: [item({})], assumptions: [], needsConfirmation: false, question: '' };
  it('builds a validated template', async () => {
    const r = await run('routine_setup', { ...base, items: [item({}), item({ kind: 'poomsae', name: '태극 1장', formNo: 1, repeat: 2, reps: 0, sets: 0, secPerRep: 0, restSec: 0 })] }, { text: '오늘은 하체', lang: 'ko' });
    expect(r.ok && r.value.template.items.map((i) => i.kind)).toEqual(['exercise', 'poomsae']);
    expect(r.ok && r.value.template.items[1]).toMatchObject({ repeat: 2, movements: expect.any(Array) });
  });
  it('rejects unknown forms, empty routines and absurd lengths', async () => {
    expect((await run('routine_setup', { ...base, items: [item({ kind: 'poomsae', formNo: 3, repeat: 1 })] }, { text: 'x', lang: 'ko' })).ok).toBe(false);
    expect((await run('routine_setup', { ...base, items: [] }, { text: 'x', lang: 'ko' })).ok).toBe(false);
    expect((await run('routine_setup', { ...base, items: [item({ reps: 500, sets: 50, secPerRep: 30 })] }, { text: 'x', lang: 'ko' })).ok).toBe(false);
  });
  it('asks for confirmation when the length misses the requested minutes', async () => {
    const r = await run('routine_setup', { ...base, targetMinutes: 20 }, { text: '20분', lang: 'ko' });
    expect(r.ok && r.value.needsConfirmation).toBe(true);
  });
});

describe('correction', () => {
  const items = correctionItems([poomsaeItem('ko', 'p1')], 'ko');
  const input = { note: '오른손 먼저 나가야되는데 자꾸 왼손이 나가요', lang: 'ko' as const, items, practice: { itemId: 'p1', movementNo: 2 } };
  const ans = { scope: 'movement', itemId: 'p1', movementNo: 2, side: 'right', part: 'hand', cueKo: '오른손 먼저!', cueEn: 'right hand first!', needsConfirmation: false, question: '' };
  it('resolves the real movement id', async () => {
    const r = await run('correction', ans, input);
    expect(r.ok && r.value.target).toEqual({ kind: 'movement', itemId: 'p1', movementId: TAEGEUK_1_MOVEMENTS[1]!.id, no: 2 });
    expect(r.ok && r.value.side).toBe('right');
  });
  it('rejects invented items or movements and long cues', async () => {
    expect((await run('correction', { ...ans, itemId: 'zz' }, input)).ok).toBe(false);
    expect((await run('correction', { ...ans, movementNo: 99 }, input)).ok).toBe(false);
    expect((await run('correction', { ...ans, cueKo: '아주 아주 아주 아주 아주 길고 긴 설명입니다 정말로요!' }, input)).ok).toBe(false);
  });
  it('accepts routine scope', async () => {
    const r = await run('correction', { ...ans, scope: 'routine', itemId: '', movementNo: 0 }, input);
    expect(r.ok && r.value.target).toEqual({ kind: 'routine' });
  });
});

describe('travel_qa', () => {
  const src = '경복궁은 1395년에 태조가 지었어요. 화요일은 쉬어요.';
  const input = { question: '언제 지었어요?', lang: 'ko' as const, landmarkName: '경복궁', sourceText: src };
  it('accepts a grounded answer', async () => {
    const r = await run('travel_qa', { answerable: true, answer: '1395년에 태조가 지었어요.', quote: '경복궁은 1395년에 태조가 지었어요.' }, input);
    expect(r.ok && r.value).toMatchObject({ answered: true, grounding: 'ok' });
  });
  it('replaces ungrounded answers with the fixed not-in-source message', async () => {
    const q = await run('travel_qa', { answerable: true, answer: '1400년에 지었어요.', quote: '1400년에 지었다는 기록이 있어요' }, input);
    expect(q.ok && q.value).toMatchObject({ answered: false, grounding: 'quote_missing', text: '경복궁에 대한 자료에는 그 내용이 나와 있지 않아요.' });
    const n = await run('travel_qa', { answerable: true, answer: '1400년에 지었어요.', quote: '경복궁은 1395년에 태조가 지었어요.' }, input);
    expect(n.ok && n.value).toMatchObject({ answered: false, grounding: 'number_missing' });
    const none = await run('travel_qa', { answerable: false, answer: '', quote: '' }, { ...input, lang: 'en' });
    expect(none.ok && none.value.text).toBe("My source for 경복궁 doesn't say.");
  });
});

describe('transports', () => {
  it('reports backend errors without throwing', async () => {
    const r = await runTask({ name: 'x', call: async () => { throw new LlmBackendError('down', 'network'); } }, 'travel_qa', { question: 'q', lang: 'en', landmarkName: 'n', sourceText: 's' });
    expect(r).toMatchObject({ ok: false, reason: 'backend_error', backendKind: 'network' });
  });
  it('rejects invalid input before calling the model', async () => {
    const b = new FakeBackend(['{}']);
    const r = await runTask(new BackendTransport(b), 'align', { hypotheses: [], lang: 'ko', context: workCtx } as never);
    expect(r).toMatchObject({ ok: false, reason: 'invalid_input' });
    expect(b.requests).toHaveLength(0);
  });
  it('WorkerTransport posts {task,input} with the bearer token and times out', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const t = new WorkerTransport({ baseUrl: 'https://w.example/', token: () => 'tok', timeoutMs: 20, fetchImpl: (async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response(JSON.stringify({ text: '{}', promptTokens: 5, completionTokens: 2 })); }) as never });
    const r = await t.call('travel_qa', { a: 1 });
    expect(calls[0]!.url).toBe('https://w.example/llm');
    expect((calls[0]!.init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({ task: 'travel_qa', input: { a: 1 } });
    expect(r.promptTokens).toBe(5);
    const slow = new WorkerTransport({ baseUrl: 'https://w', token: () => 't', timeoutMs: 10, fetchImpl: ((_u: string, init: RequestInit) => new Promise((_res, rej) => init.signal!.addEventListener('abort', () => rej(new Error('abort'))))) as never });
    await expect(slow.call('align', {})).rejects.toMatchObject({ kind: 'timeout' });
  });
});
