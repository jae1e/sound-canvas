import { describe, expect, it } from 'vitest';
import { needsLlm, parseRoutineIntent, parseRoutineText, type ExerciseItem, type HoldItem, type PoomsaeItem } from '../src';

describe('parseRoutineText', () => {
  it('parses the Korean workout list', () => {
    const r = parseRoutineText('스쿼트 15개 3세트, 플랭크 45초, 세트 사이 휴식 30초');
    expect(r.lang).toBe('ko');
    expect(r.unparsed).toEqual([]);
    expect(r.items).toHaveLength(2);
    const sq = r.items[0] as ExerciseItem;
    expect(sq).toMatchObject({ kind: 'exercise', name: '스쿼트', reps: 15, sets: 3, restSec: 30 });
    const pl = r.items[1] as HoldItem;
    expect(pl).toMatchObject({ kind: 'hold', name: '플랭크', holdSec: 45, sets: 1, perSide: false, restSec: 30 });
  });

  it('parses the English workout list', () => {
    const r = parseRoutineText('squats 15 reps 3 sets, plank 45 seconds, rest 30 seconds');
    expect(r.lang).toBe('en');
    expect(r.unparsed).toEqual([]);
    expect(r.items.map((i) => i.kind)).toEqual(['exercise', 'hold', 'rest']);
    expect(r.items[0]).toMatchObject({ name: 'squats', reps: 15, sets: 3 });
    expect(r.items[1]).toMatchObject({ name: 'plank', holdSec: 45 });
    expect(r.items[2]).toMatchObject({ kind: 'rest', sec: 30 });
  });

  it('parses a per-side stretch', () => {
    const ko = parseRoutineText('햄스트링 스트레칭 좌우 30초');
    expect(ko.items[0]).toMatchObject({ kind: 'hold', name: '햄스트링 스트레칭', holdSec: 30, perSide: true });
    const en = parseRoutineText('hamstring stretch 30 seconds each side');
    expect(en.items[0]).toMatchObject({ kind: 'hold', name: 'hamstring stretch', holdSec: 30, perSide: true });
  });

  it('parses a poomsae with repeats', () => {
    const r = parseRoutineText('태극 1장 3번');
    const p = r.items[0] as PoomsaeItem;
    expect(p).toMatchObject({ kind: 'poomsae', repeat: 3 });
    expect(p.movements).toHaveLength(18);
    const en = parseRoutineText('taegeuk 1 jang 2 times');
    expect((en.items[0] as PoomsaeItem).repeat).toBe(2);
    expect((parseRoutineText('태극 1장').items[0] as PoomsaeItem).repeat).toBe(1);
  });

  it('handles variants of reps and sets', () => {
    expect(parseRoutineText('푸시업 10회 2세트').items[0]).toMatchObject({ reps: 10, sets: 2 });
    expect(parseRoutineText('3 sets of 12 lunges').items[0]).toMatchObject({ reps: 12, sets: 3 });
    expect(parseRoutineText('15 squats').items[0]).toMatchObject({ name: 'squats', reps: 15, sets: 1 });
    expect(parseRoutineText('열다섯 개 스쿼트').items[0]).toMatchObject({ reps: 15 });
  });

  it('reads inline rest, tempo and the between-sets default', () => {
    const r = parseRoutineText('squats 10 reps 2 sets rest 45 seconds, 4 seconds per rep');
    expect(r.items[0]).toMatchObject({ restSec: 45 });
    const t = parseRoutineText('스쿼트 10개 3세트 한 개에 4초');
    expect(t.items[0]).toMatchObject({ secPerRep: 4 });
    const d = parseRoutineText('squats 10 reps 3 sets');
    expect((d.items[0] as ExerciseItem).restSec).toBe(30);
    expect(d.assumed.length).toBeGreaterThan(0);
    const g = parseRoutineText('squats 10 reps 3 sets, rest 20 seconds between sets');
    expect((g.items[0] as ExerciseItem).restSec).toBe(20);
    expect(g.items).toHaveLength(1);
  });

  it('reports the parts it does not understand', () => {
    const r = parseRoutineText('스쿼트 15개 3세트, 그냥 열심히 하기, 태극 3장');
    expect(r.items).toHaveLength(1);
    expect(r.unparsed.map((u) => u.text)).toEqual(['그냥 열심히 하기', '태극 3장']);
    expect(needsLlm(r)).toBe(true);
    const e = parseRoutineText('do some cardio until you feel it');
    expect(e.items).toHaveLength(0);
    expect(needsLlm(e)).toBe(true);
  });
});

describe('parseRoutineIntent', () => {
  const c = (text: string) => {
    const i = parseRoutineIntent(text);
    return i?.kind === 'command' ? i.command : i;
  };

  it('start last routine and create routine', () => {
    expect(c('어제 루틴 시작')).toEqual({ kind: 'start_last' });
    expect(c('start my last routine')).toEqual({ kind: 'start_last' });
    expect(c('루틴 만들기')).toEqual({ kind: 'create' });
    expect(c('create routine')).toEqual({ kind: 'create' });
  });

  it('live commands in Korean', () => {
    expect(c('이거 건너뛰어')).toEqual({ kind: 'skip' });
    expect(c('다섯 개 더')).toEqual({ kind: 'more_reps', n: 5 });
    expect(c('한 세트 더')).toEqual({ kind: 'sets', delta: 1 });
    expect(c('한 세트 줄여줘')).toEqual({ kind: 'sets', delta: -1 });
    expect(c('휴식 20초로 바꿔줘')).toEqual({ kind: 'rest', sec: 20 });
    expect(c('스쿼트 대신 런지')).toEqual({ kind: 'swap', from: '런지', to: '스쿼트' });
    expect(c('5번 동작부터 다시')).toEqual({ kind: 'repeat_from', no: 5 });
    expect(c('한 동작 뒤로')).toEqual({ kind: 'back' });
    expect(c('더 천천히')).toEqual({ kind: 'tempo', dir: 'slower' });
    expect(c('좀 빠르게')).toEqual({ kind: 'tempo', dir: 'faster' });
    expect(c('멈춰')).toEqual({ kind: 'pause' });
    expect(c('다시 시작')).toEqual({ kind: 'resume' });
    expect(c('얼마나 남았어?')).toEqual({ kind: 'query', query: 'left' });
    expect(c('다음 뭐야')).toEqual({ kind: 'query', query: 'next' });
    expect(c('운동 그만할래')).toEqual({ kind: 'end' });
    expect(c('이제 괜찮아')).toEqual({ kind: 'fix' });
  });

  it('live commands in English', () => {
    expect(c('skip this exercise')).toEqual({ kind: 'skip' });
    expect(c('five more reps')).toEqual({ kind: 'more_reps', n: 5 });
    expect(c('one more set')).toEqual({ kind: 'sets', delta: 1 });
    expect(c('one fewer set')).toEqual({ kind: 'sets', delta: -1 });
    expect(c('change the rest to 20 seconds')).toEqual({ kind: 'rest', sec: 20 });
    expect(c('swap squats for lunges')).toEqual({ kind: 'swap', from: 'squats', to: 'lunges' });
    expect(c('repeat from movement 5')).toEqual({ kind: 'repeat_from', no: 5 });
    expect(c('go back one move')).toEqual({ kind: 'back' });
    expect(c('slower')).toEqual({ kind: 'tempo', dir: 'slower' });
    expect(c('speed up')).toEqual({ kind: 'tempo', dir: 'faster' });
    expect(c('pause')).toEqual({ kind: 'pause' });
    expect(c('resume')).toEqual({ kind: 'resume' });
    expect(c("how many left?")).toEqual({ kind: 'query', query: 'left' });
    expect(c("what's next?")).toEqual({ kind: 'query', query: 'next' });
    expect(c('end the routine early')).toEqual({ kind: 'end' });
    expect(c('mark as fixed')).toEqual({ kind: 'fix' });
  });

  it('does not treat unrelated speech as a command', () => {
    expect(parseRoutineIntent('오늘 날씨 좋다')).toBeNull();
    expect(parseRoutineIntent('hello there')).toBeNull();
  });
});
