import { describe, expect, it } from 'vitest';
import {
  analyzeFrames,
  countEnglishSyllables,
  countFillers,
  countKoreanSyllables,
  countSyllableNuclei,
  findPauses,
  rateFromEnergy,
  rateFromWords,
  silenceThresholdDb,
  summarizeTake,
} from '../src';
import { analyzeSignal, render } from './signals';

describe('syllables', () => {
  it('counts Hangul blocks and ignores other characters', () => {
    expect(countKoreanSyllables('안녕하세요, hello 123!')).toBe(5);
    expect(countKoreanSyllables('')).toBe(0);
  });
  it('estimates English syllables', () => {
    expect(countEnglishSyllables('hello')).toBe(2);
    expect(countEnglishSyllables('make')).toBe(1);
    expect(countEnglishSyllables('table')).toBe(2);
    expect(countEnglishSyllables('beautiful')).toBeGreaterThanOrEqual(2);
  });
});

describe('fillers', () => {
  it('counts ko fillers only as whole tokens', () => {
    const c = countFillers('음... 그 저기 어제 그게 음식 어어 그러니까', 'ko');
    expect(c.byWord).toEqual({ 음: 1, 그: 1, 저기: 1, 어: 1 });
    expect(c.total).toBe(4);
  });
  it('counts en fillers on word boundaries', () => {
    const c = countFillers("Um, I uh like the album, you know? Umbrella, hum, likely, unlike.", 'en');
    expect(c.byWord['um/uh']).toBe(2);
    expect(c.byWord['like']).toBe(1);
    expect(c.byWord['you know']).toBe(1);
    expect(c.total).toBe(4);
  });
});

describe('speaking rate', () => {
  it('computes ko syllables/s and en wpm from timestamps, excluding long gaps from articulation', () => {
    const ko = rateFromWords([{ text: '안녕하세요', start: 0, end: 1 }, { text: '반갑습니다', start: 1, end: 2 }, { text: '여러분', start: 3, end: 4 }], 'ko')!;
    expect(ko.unit).toBe('syl/s');
    expect(ko.value).toBeCloseTo(13 / 4, 5);
    expect(ko.articulationValue).toBeCloseTo(13 / 3, 5);
    const words = Array.from({ length: 30 }, (_, i) => ({ text: 'word', start: i * 0.4, end: i * 0.4 + 0.3 }));
    const en = rateFromWords(words, 'en')!;
    expect(en.unit).toBe('wpm');
    expect(en.value).toBeGreaterThan(140);
    expect(en.value).toBeLessThan(160);
    expect(rateFromWords([], 'en')).toBeNull();
  });
  it('counts energy-peak nuclei: 10 syllable bursts at 4/s', () => {
    // 0.25 s period, 0.1 s loud / 0.15 s quiet, at 10 ms frames.
    const db: number[] = [];
    for (let i = 0; i < 10; i++) for (let k = 0; k < 25; k++) db.push(k < 10 ? -20 : -45);
    expect(countSyllableNuclei(db, 0.01)).toBe(10);
  });
  it('estimates rate from a synthetic tone-burst signal', () => {
    const segs = [];
    for (let i = 0; i < 12; i++) segs.push({ dur: 0.12, hz: 180 + (i % 3) * 20 }, { dur: 0.13, hz: null });
    const frames = analyzeSignal(render(segs));
    const r = rateFromEnergy(frames, 'ko', silenceThresholdDb(frames))!;
    expect(r.estimated).toBe(true);
    expect(r.value).toBeGreaterThan(3);
    expect(r.value).toBeLessThan(5);
  });
});

describe('pauses and metrics', () => {
  const frames = analyzeSignal(render([{ dur: 0.5, hz: null }, { dur: 1, hz: 200 }, { dur: 0.6, hz: null }, { dur: 1, hz: 220 }, { dur: 0.1, hz: null }, { dur: 1, hz: 200 }, { dur: 0.5, hz: null }]));
  it('finds interior pauses only', () => {
    const p = findPauses(frames);
    expect(p.count).toBe(1);
    expect(p.totalS).toBeGreaterThan(0.4);
    expect(p.totalS).toBeLessThan(0.7);
  });
  it('computes take metrics', () => {
    const m = analyzeFrames(frames);
    expect(m.voicedRatio).toBeGreaterThan(0.6);
    expect(m.voicedRatio).toBeLessThan(0.85);
    expect(m.loudness.meanDb!).toBeLessThan(0);
    expect(m.brightnessHz!).toBeGreaterThan(150);
  });
});

describe('summarizeTake', () => {
  it('reports a held target in both languages and trends vs the previous take', () => {
    const steady = analyzeSignal(render([{ dur: 2, hz: 220 }]));
    const wobbly = analyzeSignal(render([{ dur: 2, hz: 220, vibratoCents: 40 }]));
    const target = { notes: [{ midi: 57 }] };
    const prev = summarizeTake({ mode: 'practice', frames: wobbly, target }).metrics;
    const s = summarizeTake({ mode: 'practice', frames: steady, target }, prev);
    expect(s.text.en).toMatch(/^Your A3 held within ±25 cents for \d+% of the time\./);
    expect(s.text.ko).toMatch(/A3/);
    expect(s.text.en).toMatch(/up \d+ points/);
    expect(s.text.en).not.toMatch(/diagnos|disease|medical/i);
  });
  it('labels tone trends as heuristic', () => {
    const dull = analyzeSignal(render([{ dur: 1.5, hz: 200, harmonics: [1, 0.2] }]));
    const bright = analyzeSignal(render([{ dur: 1.5, hz: 200, harmonics: [0.3, 0.6, 1, 1, 0.9, 0.8] }]));
    const prev = summarizeTake({ mode: 'practice', frames: dull }).metrics;
    const s = summarizeTake({ mode: 'practice', frames: bright }, prev);
    expect(s.text.en).toMatch(/brighter than the last take \(heuristic\)/);
  });
  it('reports a silent take gracefully', () => {
    const s = summarizeTake({ mode: 'practice', frames: analyzeSignal(render([{ dur: 1, hz: null }])) });
    expect(s.text.en).toMatch(/barely detected/);
  });
  it('speech mode combines rate, pauses and fillers', () => {
    const frames = analyzeSignal(render([{ dur: 1, hz: 180 }, { dur: 0.6, hz: null }, { dur: 1, hz: 190 }]));
    const words = [{ text: 'hello', start: 0, end: 0.5 }, { text: 'um', start: 0.5, end: 1 }, { text: 'there', start: 1.6, end: 2.1 }];
    const s = summarizeTake({ mode: 'speech', frames, speechLang: 'en', words, transcript: 'hello um there' });
    expect(s.speech!.fillers!.total).toBe(1);
    expect(s.text.en).toMatch(/words per minute/);
    expect(s.text.en).toMatch(/paused 1 time/);
    expect(s.text.en).toMatch(/1 filler word\./);
    expect(s.text.ko).toMatch(/군말은 1번/);
  });
});
