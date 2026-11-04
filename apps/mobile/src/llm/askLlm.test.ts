import { createSession, apply } from '@vlc/session-engine';
import { LlmBackendError, type TaskTransport } from '@vlc/llm';
import { afterEach, describe, expect, it } from 'vitest';

import { askLlm, isLlmAvailable, setLlmTransport } from './askLlm';
import { parseYesNo } from './confirm';

const ok = (obj: unknown): TaskTransport => ({ name: 'fake', call: async () => ({ text: JSON.stringify(obj), promptTokens: 10, completionTokens: 5, ms: 3 }) });
const flat = (o: Record<string, unknown> = {}) => ({ type: 'none', target: '', label: '', from: '', seconds: 0, count: 0, flag: false, ...o });

const session = (() => {
  const s = createSession({ id: 's', mode: 'activity', lang: 'ko', now: 0 });
  const r = apply(s, { action: { type: 'start_session' }, source: 'ui' }, { now: 0, newId: () => 'x' });
  return r.ok ? r.session : s;
})();
const req = { hypotheses: ['리조트 5분 타이머', '리조또 5분 타이머'], lang: 'ko' as const, session, recentTurns: [] };

afterEach(() => setLlmTransport(null));

describe('askLlm', () => {
  it('reports not_implemented without a transport', async () => {
    expect(isLlmAvailable()).toBe(false);
    expect(await askLlm(req)).toMatchObject({ ok: false, reason: 'not_implemented' });
  });

  it('routes align and returns an engine-ready action', async () => {
    setLlmTransport(ok({ text: '리조또 5분 타이머', ...flat({ type: 'start_timer', label: '리조또', seconds: 300 }), confidence: 'medium', needsConfirmation: true, confirmQuestion: '리조또 5분 타이머 맞나요?' }));
    const r = await askLlm(req);
    expect(r).toMatchObject({ ok: true, task: 'align', reply: '리조또 5분 타이머 맞나요?' });
    expect(r.ok && r.task === 'align' && r.align.mapped).toEqual({ domain: 'work', action: { type: 'start_timer', label: '리조또', durationMs: 300000 } });
  });

  it('rejects invalid output instead of passing it on', async () => {
    setLlmTransport(ok({ nonsense: true }));
    expect(await askLlm(req)).toMatchObject({ ok: false, reason: 'rejected' });
  });

  it('maps transport failures to offline and timeout', async () => {
    setLlmTransport({ name: 'x', call: async () => { throw new LlmBackendError('down', 'network'); } });
    expect(await askLlm(req)).toMatchObject({ ok: false, reason: 'offline' });
    setLlmTransport({ name: 'x', call: async () => { throw new LlmBackendError('slow', 'timeout'); } });
    expect(await askLlm(req)).toMatchObject({ ok: false, reason: 'timeout' });
  });

  it('gives up after the voice-loop budget when the transport hangs', async () => {
    setLlmTransport({ name: 'hang', call: (_t, _i, signal) => new Promise((_res, rej) => signal?.addEventListener('abort', () => rej(new LlmBackendError('aborted', 'timeout')))) });
    const t0 = Date.now();
    const r = await askLlm(req);
    expect(r).toMatchObject({ ok: false, reason: 'timeout' });
    expect(Date.now() - t0).toBeLessThan(3500);
  });

  it('routes travel_qa and routine_setup', async () => {
    setLlmTransport(ok({ answerable: true, answer: '1395년에 지었어요.', quote: '1395년에 태조가 지었어요.' }));
    const r = await askLlm({ hypotheses: ['언제 지었어요?'], lang: 'ko', kind: 'travel_qa', recentTurns: [], travel: { landmarkName: '경복궁', sourceText: '경복궁은 1395년에 태조가 지었어요.' } });
    expect(r).toMatchObject({ ok: true, task: 'travel_qa', reply: '1395년에 지었어요.' });
    setLlmTransport(ok({ name: 'x', targetMinutes: 0, items: [{ kind: 'exercise', name: '스쿼트', reps: 10, sets: 2, secPerRep: 3, holdSec: 0, perSide: false, restSec: 30, repeat: 0, formNo: 0 }], assumptions: [], needsConfirmation: false, question: '' }));
    const s = await askLlm({ hypotheses: ['스쿼트'], lang: 'ko', kind: 'routine_setup', recentTurns: [] });
    expect(s).toMatchObject({ ok: true, task: 'routine_setup' });
  });
});

describe('parseYesNo', () => {
  it('understands short Korean and English answers', () => {
    expect(parseYesNo('네', 'ko')).toBe('yes');
    expect(parseYesNo('응 맞아', 'ko')).toBe('other');
    expect(parseYesNo('맞아요', 'ko')).toBe('yes');
    expect(parseYesNo('아니', 'ko')).toBe('no');
    expect(parseYesNo('yeah', 'en')).toBe('yes');
    expect(parseYesNo('no.', 'en')).toBe('no');
    expect(parseYesNo('set a timer', 'en')).toBe('other');
  });
});
