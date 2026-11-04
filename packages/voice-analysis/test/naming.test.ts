import { describe, expect, it } from 'vitest';
import { centsLevel, centsWord, describeRange, enharmonics, formatNote, noteLabel, parseNote, relativeNoteName, solfegeName, subscriptOctave, summarizeTake } from '../src';

const m = (s: string) => parseNote(s)!;

describe('naming', () => {
  it('maps solfège in both languages', () => {
    expect(solfegeName(m('B2'), 'ko')).toBe('시');
    expect(solfegeName(m('B2'), 'en')).toBe('Ti');
    expect(solfegeName(m('C4'), 'ko')).toBe('도');
  });
  it('changes octave at C', () => {
    expect(formatNote(m('B2'), 'scientific', 'en')).toBe('B2');
    expect(formatNote(m('B2') + 1, 'scientific', 'en')).toBe('C3');
    expect(formatNote(m('C4'), 'solfege', 'ko')).toBe('도₄');
    expect(subscriptOctave(2)).toBe('₂');
    expect(formatNote(m('B2'), 'letter', 'en')).toBe('B');
  });
  it('handles sharps and flats', () => {
    expect(formatNote(m('C#4'), 'scientific', 'en')).toBe('C#4');
    expect(solfegeName(m('C#4'), 'ko')).toBe('도#');
    expect(solfegeName(m('C#4'), 'ko', { spoken: true })).toBe('올림 도');
    expect(solfegeName(m('C#4'), 'ko', { accidental: 'flat', spoken: true })).toBe('내림 레');
    expect(solfegeName(m('C#4'), 'en')).toBe('Do#');
    expect(enharmonics(m('C#4'))).toEqual({ sharp: 'C#4', flat: 'Db4' });
    expect(enharmonics(m('D4'))).toEqual({ sharp: 'D4', flat: 'D4' });
  });
  it('builds the live label', () => {
    expect(noteLabel(123.47, 'scientific', 'ko')).toBe('B2 · 시 · 123 Hz');
    expect(noteLabel(123.47, 'scientific', 'en')).toBe('B2 · Ti · 123 Hz');
    expect(noteLabel(123.47, 'solfege', 'ko')).toBe('시₂ · 123 Hz');
    expect(noteLabel(123.47, 'letter', 'en')).toBe('B · Ti · 123 Hz');
  });
  it('describes ranges', () => {
    expect(describeRange(m('G2'), m('E4'), 'scientific', 'ko')).toBe('오늘의 음역: G2–E4 (솔₂–미₄)');
    expect(describeRange(m('G2'), m('E4'), 'scientific', 'en')).toBe('your range today: G2–E4 (Sol₂–Mi₄)');
    expect(describeRange(m('G2'), m('E4'), 'solfege', 'ko')).toBe('오늘의 음역: 솔₂–미₄ (G2–E4)');
  });
  it('names relative to a centre', () => {
    expect(relativeNoteName(m('B3'), m('C4'), 'ko')).toBe('낮은 시');
    expect(relativeNoteName(m('B2'), m('C4'), 'ko')).toBe('아주 낮은 시');
    expect(relativeNoteName(m('C5'), m('C4'), 'en')).toBe('high Do');
    expect(relativeNoteName(m('E4'), m('C4'), 'en')).toBe('Mi');
  });
  it('words cents with thresholds 10 and 25', () => {
    expect(centsLevel(10)).toBe(0);
    expect(centsLevel(-10.5)).toBe(-1);
    expect(centsLevel(25)).toBe(1);
    expect(centsLevel(26)).toBe(2);
    expect(centsWord(-5, 'ko')).toBe('정확');
    expect(centsWord(-15, 'ko')).toBe('약간 낮음');
    expect(centsWord(15, 'en')).toBe('a bit sharp');
    expect(centsWord(-40, 'en')).toBe('flat');
  });
});

describe('summarizeTake naming style', () => {
  it('uses the chosen style in target feedback', () => {
    const frames = Array.from({ length: 200 }, (_, i) => ({ t: i * 0.02, f0: 123.47, voicing: 1, rmsDb: -20, centroid: 1000 }));
    const target = { notes: [{ midi: m('B2') }] };
    const sci = summarizeTake({ mode: 'practice', frames, target });
    const sol = summarizeTake({ mode: 'practice', frames, target, noteStyle: 'solfege' });
    expect(sci.text.en).toContain('B2');
    expect(sol.text.ko).toContain('시₂');
    expect(sol.text.en).toContain('Ti₂');
  });
});
