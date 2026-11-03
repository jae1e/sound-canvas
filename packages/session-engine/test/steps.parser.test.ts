import { describe, expect, it } from 'vitest';
import { parseUtterance, type Intent } from '../src';

const ctx = { taskLabels: [] as string[], timerLabels: [] as string[] };
const first = (text: string, lang: 'ko' | 'en'): Intent | undefined => parseUtterance(text, lang, ctx).intents[0];
const action = (text: string, lang: 'ko' | 'en') => {
  const i = first(text, lang);
  return i?.kind === 'action' ? i.action : undefined;
};

describe('step navigation (en)', () => {
  it.each(['next', 'next step', 'Next step.', 'go to the next step', 'move on', "let's move on", 'go next', 'next one', 'ok next'])('%s -> next_step', (t) => {
    expect(action(t, 'en')).toEqual({ type: 'next_step' });
  });
  it.each(['back', 'go back', 'Go back.', 'previous step', 'previous', 'go back one step', 'step back', 'go back to the previous step'])('%s -> prev_step', (t) => {
    expect(action(t, 'en')).toEqual({ type: 'prev_step' });
  });
  it('keeps "skip" and "done" as before', () => {
    expect(action('skip', 'en')).toEqual({ type: 'skip_task', task: { implicit: true } });
    expect(action("it's done", 'en')?.type).toBe('report_task');
  });
  it('does not treat unrelated phrases as navigation', () => {
    for (const t of ['next time bring the screws', 'back to the store', 'go to the kitchen']) {
      expect(first(t, 'en')).toBeUndefined();
    }
  });
});

describe('step navigation (ko)', () => {
  it.each(['다음', '다음 단계', '다음으로', '다음 단계로 가자', '다음 거', '다음으로 넘어가줘'])('%s -> next_step', (t) => {
    expect(action(t, 'ko')).toEqual({ type: 'next_step' });
  });
  it.each(['이전', '이전 단계', '뒤로', '뒤로 가', '한 단계 전', '돌아가', '이전으로 돌아가'])('%s -> prev_step', (t) => {
    expect(action(t, 'ko')).toEqual({ type: 'prev_step' });
  });
  it('keeps skip and done', () => {
    expect(action('건너뛰어', 'ko')?.type).toBe('skip_task');
    expect(action('다 됐어', 'ko')?.type).toBe('report_task');
  });
});

describe('plan queries', () => {
  it.each([
    ["what's left?", 'steps_left'],
    ['what is left', 'steps_left'],
    ['what do I have left', 'steps_left'],
    ['how many steps are left', 'steps_left'],
    ['where was I?', 'where'],
    ['where were we', 'where'],
    ['what was I doing', 'where'],
    ['what step am I on', 'where'],
    ["what's the current step", 'where'],
    ['what comes next', 'next_step'],
  ] as const)('en %s -> %s', (t, q) => {
    expect(first(t, 'en')).toMatchObject({ kind: 'query', query: q });
  });
  it.each([
    ['뭐 남았어?', 'steps_left'],
    ['뭐 남았지', 'steps_left'],
    ['뭐가 남았어요', 'steps_left'],
    ['남은 거 알려줘', 'steps_left'],
    ['뭐 더 해야 돼', 'steps_left'],
    ['어디까지 했지?', 'where'],
    ['어디까지 했더라', 'where'],
    ['나 뭐 하고 있었지', 'where'],
    ['지금 몇 번째 단계야', 'where'],
    ['다음 뭐야', 'next_step'],
  ] as const)('ko %s -> %s', (t, q) => {
    expect(first(t, 'ko')).toMatchObject({ kind: 'query', query: q });
  });
  it('does not steal the time-left questions', () => {
    expect(first('how much time is left', 'en')).toMatchObject({ query: 'remaining' });
    expect(first('얼마나 남았어', 'ko')).toMatchObject({ query: 'remaining' });
  });
});

describe('timed quiet', () => {
  it.each([
    ['quiet for 10 minutes', 10],
    ['be quiet for ten minutes', 10],
    ['mute for 5 minutes', 5],
    ['quiet mode for 30 minutes', 30],
  ])('en %s', (t, min) => {
    expect(action(t, 'en')).toEqual({ type: 'set_quiet', quiet: true, forMs: min * 60_000 });
  });
  it.each([
    ['조용히 10분', 10],
    ['10분 동안 조용히 해줘', 10],
    ['조용히 해줘 5분', 5],
  ])('ko %s', (t, min) => {
    expect(action(t, 'ko')).toEqual({ type: 'set_quiet', quiet: true, forMs: min * 60_000 });
  });
  it('plain quiet is unchanged', () => {
    expect(action('quiet', 'en')).toEqual({ type: 'set_quiet', quiet: true });
    expect(action('조용히 해줘', 'ko')).toEqual({ type: 'set_quiet', quiet: true });
  });
  it('does not turn quiet into a timer', () => {
    expect(action('pasta 3 minutes', 'en')?.type).toBe('start_timer');
  });
});

describe('spoken plan', () => {
  it('en', () => {
    expect(first('steps: unpack, frame, shelves and doors', 'en')).toEqual({ kind: 'plan', steps: ['unpack', 'frame', 'shelves', 'doors'] });
    expect(first('The steps are unpack then frame then doors', 'en')).toEqual({ kind: 'plan', steps: ['unpack', 'frame', 'doors'] });
  });
  it('ko', () => {
    expect(first('단계: 포장 풀기, 프레임, 선반', 'ko')).toEqual({ kind: 'plan', steps: ['포장 풀기', '프레임', '선반'] });
  });
});
