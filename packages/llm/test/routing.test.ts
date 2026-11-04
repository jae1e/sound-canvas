import { apply, createSession, type Lang, type Session } from '@vlc/session-engine';
import { describe, expect, it } from 'vitest';

import { routeUtterance } from '../src';

function session(lang: Lang, labels: string[] = []): Session {
  let n = 0;
  const ctx = { now: 0, newId: () => `id${++n}` };
  let s = createSession({ id: 's', mode: 'activity', lang, now: 0 });
  for (const a of [{ type: 'start_session' as const }, ...labels.map((label) => ({ type: 'start_timer' as const, label, durationMs: 600000 }))]) {
    const r = apply(s, { action: a, source: 'ui' }, ctx);
    if (r.ok) s = r.session;
  }
  return s;
}

describe('routeUtterance', () => {
  it('sends hypotheses that disagree on a label the lexicon does not know to the LLM', () => {
    expect(routeUtterance(session('ko'), ['쿠키 5분 타이머', '쿠기 5분 타이머'], 'ko')).toEqual({ path: 'llm', why: 'hypotheses_disagree' });
    expect(routeUtterance(session('en'), ['set a timer for 5 minutes for the brownies', 'set a timer for 5 minutes for the brownies'], 'en').path).toBe('deterministic');
  });
  it('the cooking lexicon already resolves 리조트/리조또 and pasta/pastor without the LLM', () => {
    expect(routeUtterance(session('ko'), ['리조트 5분 타이머', '리조또 5분 타이머'], 'ko')).toMatchObject({ path: 'deterministic', why: 'known_label' });
    expect(routeUtterance(session('en'), ['Pasta 3 minutes', 'pastor 3 minutes'], 'en').path).toBe('deterministic');
  });
  it('keeps clear commands deterministic', () => {
    expect(routeUtterance(session('ko'), ['5분 타이머'], 'ko').path).toBe('deterministic');
    expect(routeUtterance(session('en'), ['set a timer for 5 minutes', 'set a timer for 5 minute'], 'en').path).toBe('deterministic');
  });
  it('trusts a hypothesis that names a known timer label', () => {
    expect(routeUtterance(session('ko', ['리조또']), ['리조트 5분 더', '리조또 5분 더'], 'ko')).toMatchObject({ path: 'deterministic', why: 'known_label' });
  });
  it('sends unparsed questions and sentences to the LLM but ignores stray words', () => {
    expect(routeUtterance(session('en'), ['how long should the rice rest after cooking'], 'en').path).toBe('llm');
    expect(routeUtterance(session('en'), ['uh huh'], 'en')).toEqual({ path: 'deterministic', why: 'noise' });
    expect(routeUtterance(session('ko'), [''], 'ko').why).toBe('noise');
  });
});
