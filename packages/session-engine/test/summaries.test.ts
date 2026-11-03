import { describe, expect, it } from 'vitest';
import {
  describeNextStep,
  describeStepsLeft,
  describeTimeLeft,
  describeWhere,
  handleUtterance,
  looksLikeQuestion,
  type Lang,
  type Session,
} from '../src';
import { MIN, T0, harness } from './helpers';

function work(lang: Lang = 'en') {
  const h = harness();
  h.session = { ...h.session, lang };
  h.do({ type: 'start_session' });
  for (const [label, est] of [['unpack', 5], ['frame', 20], ['shelves', 15]] as const) {
    h.do({ type: 'add_step', label, estimateMs: est * MIN });
  }
  h.do({ type: 'next_step' });
  return h;
}

describe('deterministic summaries', () => {
  it('what is left (en)', () => {
    const h = work();
    expect(describeStepsLeft(h.session, h.now, 'en')).toBe('3 steps left: unpack, frame, and shelves.');
    h.do({ type: 'next_step' });
    expect(describeStepsLeft(h.session, h.now, 'en')).toBe('2 steps left: frame and shelves.');
  });
  it('what is left (ko)', () => {
    const h = work('ko');
    expect(describeStepsLeft(h.session, h.now, 'ko')).toBe('3개 남았어요: unpack, frame, shelves.');
  });
  it('includes live timers', () => {
    const h = work();
    h.do({ type: 'start_timer', label: 'glue', durationMs: 10 * MIN });
    expect(describeStepsLeft(h.session, h.now, 'en')).toContain('The glue timer has 10 minutes left.');
  });
  it('says so when everything is done', () => {
    const h = work();
    for (let i = 0; i < 3; i++) h.do({ type: 'next_step' });
    expect(describeStepsLeft(h.session, h.now, 'en')).toBe('Nothing is left. All steps are done.');
    expect(describeWhere(h.session, h.now, 'en')).toBe('All 3 steps are done.');
  });
  it('where was I: position, elapsed time, estimate and what is next', () => {
    const h = work();
    h.advance(3 * MIN + 10_000);
    expect(describeWhere(h.session, h.now, 'en')).toBe(
      "You're on step 1 of 3: unpack, for 3 minutes 10 seconds so far. It was planned for 5 minutes. Next is frame.",
    );
    expect(describeWhere(h.session, h.now, 'ko')).toBe('3단계 중 1번째, unpack 하는 중이에요. 3분 10초 지났어요. 예상 시간은 5분이에요. 다음은 frame이에요.');
  });
  it('where was I on the last step and before starting', () => {
    const h = work();
    h.do({ type: 'next_step' });
    h.do({ type: 'next_step' });
    expect(describeWhere(h.session, h.now, 'en')).toContain("That's the last step.");
    const fresh = harness();
    fresh.do({ type: 'start_session' });
    expect(describeWhere(fresh.session, fresh.now, 'en')).toBe("You're not working on anything yet.");
    fresh.do({ type: 'add_step', label: 'a' });
    expect(describeWhere(fresh.session, fresh.now, 'en')).toBe("You haven't started yet. The first step is a.");
  });
  it('next step', () => {
    const h = work();
    expect(describeNextStep(h.session, 'en')).toBe('Next is step 2 of 3: frame.');
    expect(describeNextStep(h.session, 'ko')).toBe('다음은 3단계 중 2번째, frame이에요.');
  });
  it('loose tasks (cooking) are reported too', () => {
    const h = harness();
    h.do({ type: 'start_session' });
    h.do({ type: 'add_task', label: 'pasta' });
    h.do({ type: 'add_task', label: 'sauce' });
    expect(describeStepsLeft(h.session, h.now, 'en')).toBe('2 items left: pasta and sauce.');
    expect(describeWhere(h.session, h.now, 'en')).toBe("You're working on pasta and sauce.");
  });
  it('time left for a named or every timer', () => {
    const h = harness();
    h.do({ type: 'start_session' });
    h.do({ type: 'start_timer', label: 'pasta', durationMs: 10 * MIN });
    h.advance(MIN);
    expect(describeTimeLeft(h.session, h.now, 'en', { label: 'pasta' })).toBe('9 minutes left on the pasta.');
    expect(describeTimeLeft(h.session, h.now, 'ko')).toBe('pasta 타이머 9분 남음.');
    const none = harness();
    expect(describeTimeLeft(none.session, none.now, 'en')).toBe('No timers are running.');
  });
});

describe('looksLikeQuestion', () => {
  it.each([
    ['how much is 3/4 cup in grams', 'en'],
    ["what's the capital of France?", 'en'],
    ['can you explain this', 'en'],
    ['이 단계 얼마나 걸려', 'ko'],
    ['이거 어떻게 해', 'ko'],
    ['이게 뭐야', 'ko'],
    ['괜찮을까', 'ko'],
  ] as const)('%s is a question', (t, l) => expect(looksLikeQuestion(t, l)).toBe(true));
  it.each([
    ['hey google turn', 'en'],
    ['the screws are in the box', 'en'],
    ['오늘 날씨 좋다', 'ko'],
    ['', 'en'],
  ] as const)('%s is not a question', (t, l) => expect(looksLikeQuestion(t, l)).toBe(false));
});

describe('handleUtterance answers and the LLM hand-off', () => {
  const ctx = { now: T0, newId: (() => { let n = 0; return () => `n${++n}`; })() };
  const fresh = (): Session => work().session;

  it('answers "what\'s left" without changing the session', () => {
    const s = fresh();
    const r = handleUtterance(s, ["what's left"], 'en', ctx);
    expect(r.outcome).toBe('answered');
    expect(r.reply).toBe('3 steps left: unpack, frame, and shelves.');
    expect(r.session).toBe(s);
  });
  it('answers "뭐 남았어" and "어디까지 했지"', () => {
    const s = { ...fresh(), lang: 'ko' as const };
    expect(handleUtterance(s, ['뭐 남았어'], 'ko', ctx)).toMatchObject({ outcome: 'answered' });
    expect(handleUtterance(s, ['어디까지 했지'], 'ko', ctx).reply).toContain('3단계 중 1번째');
  });
  it('maps "what\'s next" in an activity session to the next step', () => {
    const r = handleUtterance(fresh(), ["what's next"], 'en', ctx);
    expect(r).toMatchObject({ outcome: 'answered', reply: 'Next is step 2 of 3: frame.' });
  });
  it('"next step" advances and speaks the new step', () => {
    const r = handleUtterance(fresh(), ['next step'], 'en', { now: T0 + MIN, newId: ctx.newId });
    expect(r.outcome).toBe('applied');
    expect(r.reply).toBe('Marked the unpack done. Next is step 2 of 3: frame, about 20 minutes.');
  });
  it('"go back" at the first step is rejected with a spoken reason', () => {
    const r = handleUtterance(fresh(), ['go back'], 'en', ctx);
    expect(r.outcome).toBe('rejected');
    expect(r.reply).toBeTruthy();
  });
  it('quiet for N minutes is applied', () => {
    const r = handleUtterance(fresh(), ['quiet for 10 minutes'], 'en', ctx);
    expect(r.outcome).toBe('applied');
    expect(r.session.quiet).toBe(true);
    expect(r.session.quietUntil).toBe(ctx.now + 10 * MIN);
  });
  it('a spoken plan adds the steps and starts the first', () => {
    const h = harness();
    h.do({ type: 'start_session' });
    const r = handleUtterance(h.session, ['steps: unpack, frame, shelves'], 'en', ctx);
    expect(r.outcome).toBe('applied');
    expect(r.reply).toBe('Added 3 steps. Next is step 1 of 3: unpack.');
    expect(r.session.currentTaskId).toBeDefined();
  });
  it('hands unanswerable questions to the LLM tier with a short spoken reply', () => {
    const r = handleUtterance(fresh(), ['how much is three quarters cup in grams'], 'en', ctx);
    expect(r).toMatchObject({ outcome: 'needs_llm', reply: "I can't answer that yet." });
    const ko = handleUtterance({ ...fresh(), lang: 'ko' }, ['이 단계 얼마나 걸려'], 'ko', ctx);
    expect(ko).toMatchObject({ outcome: 'needs_llm', reply: '그건 아직 대답할 수 없어요.' });
  });
  it('keeps journal notes for the app to handle', () => {
    const r = handleUtterance(fresh(), ['note: use the longer screws'], 'en', ctx);
    expect(r).toMatchObject({ outcome: 'unsupported_intent', intent: { kind: 'journal', text: 'use the longer screws' } });
  });
  it('stays silent on chatter that is not a question', () => {
    expect(handleUtterance(fresh(), ['the screws are in the box'], 'en', ctx)).toMatchObject({ outcome: 'no_intent', reply: null });
  });
});
