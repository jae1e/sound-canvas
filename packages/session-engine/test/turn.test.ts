import { describe, expect, it } from 'vitest';
import { apply, createSession, handleUtterance, type Session } from '../src';

function fresh(lang: 'ko' | 'en'): Session {
  const s = createSession({ id: 's', mode: 'activity', lang, now: 0 });
  const r = apply(s, { action: { type: 'start_session' }, source: 'ui' }, { now: 0, newId: () => 'x' });
  if (!r.ok) throw new Error('start');
  return r.session;
}
let n = 0;
const ctx = { now: 1000, newId: () => `id${++n}` };

describe('handleUtterance', () => {
  it('picks the cooking-word alternative, applies it and acknowledges', () => {
    const r = handleUtterance(fresh('ko'), ['리조트 5분 타이머', '리조또 5분 타이머'], 'ko', ctx);
    expect(r.outcome).toBe('applied');
    expect(r.chosen?.index).toBe(1);
    expect(Object.values(r.session.timers).map((t) => t.label)).toEqual(['리조또']);
    expect(r.reply).toBeTruthy();
  });
  it('handles the elliptical English form', () => {
    const r = handleUtterance(fresh('en'), ['Pasta 3 minutes'], 'en', ctx);
    expect(r.outcome).toBe('applied');
    expect(Object.values(r.session.timers)[0]?.durationMs).toBe(180_000);
  });
  it('stays silent on unrecognised speech', () => {
    const s = fresh('en');
    const r = handleUtterance(s, ['Hey Google turn'], 'en', ctx);
    expect(r).toMatchObject({ outcome: 'no_intent', reply: null });
    expect(r.session).toBe(s);
  });
  it('uses live labels for later turns', () => {
    const a = handleUtterance(fresh('en'), ['pasta 3 minutes'], 'en', ctx);
    const b = handleUtterance(a.session, ['pause the pasta timer'], 'en', ctx);
    expect(b.outcome).toBe('applied');
  });
  it('returns empty for no hypotheses', () => {
    expect(handleUtterance(fresh('en'), [], 'en', ctx).outcome).toBe('empty');
  });
});
