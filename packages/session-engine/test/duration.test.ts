import { describe, expect, it } from 'vitest';
import type { Lang } from '../src/types';
import { parseDuration, scanDurations } from '../src/parser/duration';
import { parseEnNumber } from '../src/parser/numbers-en';
import { parseKoNumber } from '../src/parser/numbers-ko';

const S = 1000;
const M = 60 * S;
const H = 60 * M;

const ko: Array<[string, number]> = [
  ['2분', 2 * M],
  ['30초', 30 * S],
  ['1시간', H],
  ['삼십 초', 30 * S],
  ['십오분', 15 * M],
  ['이 분', 2 * M],
  ['이분', 2 * M],
  ['오십 초', 50 * S],
  ['백이십 초', 120 * S],
  ['두 시간', 2 * H],
  ['한 시간', H],
  ['열다섯 분', 15 * M],
  ['스무 분', 20 * M],
  ['스물다섯 분', 25 * M],
  ['서른 초', 30 * S],
  ['마흔 분', 40 * M],
  ['쉰 초', 50 * S],
  ['세 시간', 3 * H],
  ['다섯 분', 5 * M],
  ['열두 시간', 12 * H],
  ['1분 반', 90 * S],
  ['반 시간', 30 * M],
  ['반시간', 30 * M],
  ['한 시간 반', 90 * M],
  ['1분 30초', 90 * S],
  ['1시간 20분 10초', H + 20 * M + 10 * S],
  ['이분삼십초', 150 * S],
  ['1.5시간', 90 * M],
  ['다이분', 2 * M], // run-together speech: filler "다" + "이분"
];

const en: Array<[string, number]> = [
  ['2 minutes', 2 * M],
  ['90 seconds', 90 * S],
  ['1 hour', H],
  ['one minute', M],
  ['a minute', M],
  ['an hour', H],
  ['thirty seconds', 30 * S],
  ['twenty five minutes', 25 * M],
  ['twenty-five minutes', 25 * M],
  ['ninety seconds', 90 * S],
  ['fifteen mins', 15 * M],
  ['a couple of minutes', 2 * M],
  ['a couple minutes', 2 * M],
  ['half a minute', 30 * S],
  ['half an hour', 30 * M],
  ['an hour and a half', 90 * M],
  ['a minute and a half', 90 * S],
  ['two and a half minutes', 150 * S],
  ['2 minutes 30 seconds', 150 * S],
  ['2 minutes and 30 seconds', 150 * S],
  ['an hour and 30 minutes', 90 * M],
  ['1.5 hours', 90 * M],
  ['two more minutes', 2 * M],
];

describe('parseDuration', () => {
  it.each(ko)('ko: %s', (text, ms) => expect(parseDuration(text, 'ko')).toBe(ms));
  it.each(en)('en: %s', (text, ms) => expect(parseDuration(text, 'en')).toBe(ms));

  const none: Array<[string, Lang]> = [
    ['a few minutes', 'en'],
    ['several minutes', 'en'],
    ['a few more minutes', 'en'],
    ['soon', 'en'],
    ['2 minutes then 3 minutes', 'en'],
    ['몇 분', 'ko'],
    ['조금', 'ko'],
    ['2분 그리고 3분', 'ko'],
    ['0분', 'ko'],
  ];
  it.each(none)('no single concrete duration: %s', (text, lang) => expect(parseDuration(text, lang)).toBeUndefined());

  it('flags vague amounts so callers can refuse to guess', () => {
    expect(scanDurations('a few minutes', 'en').vague).toBe(true);
    expect(scanDurations('2 minutes', 'en').vague).toBe(false);
  });

  it('reports the span and the "more" marker', () => {
    const scan = scanDurations('give it two more minutes please', 'en');
    expect(scan.durations).toHaveLength(1);
    expect(scan.durations[0]).toMatchObject({ ms: 2 * M, more: true });
  });
});

describe('number words', () => {
  it.each([
    ['일', 1], ['십', 10], ['십오', 15], ['이십오', 25], ['백', 100], ['삼십', 30], ['열', 10], ['열한', 11], ['스무', 20], ['일곱', 7], ['42', 42],
  ] as Array<[string, number]>)('ko %s', (w, n) => expect(parseKoNumber(w)).toBe(n));

  it.each(['', '가나', '스무한', '일이', '다'])('ko rejects %j', (w) => expect(parseKoNumber(w)).toBeUndefined());

  it.each([['seven', 7], ['nineteen', 19], ['forty two', 42], ['a', 1], ['an', 1], ['a couple of', 2]] as Array<[string, number]>)(
    'en %s',
    (w, n) => expect(parseEnNumber(w)).toBe(n),
  );
  it('en rejects non numbers', () => expect(parseEnNumber('banana')).toBeUndefined());
});
