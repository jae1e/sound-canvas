import { describe, expect, it } from 'vitest';
import {
  findSustainedSegments,
  hzToMidi,
  midiToHz,
  nearestNote,
  noteName,
  parseNote,
  parseTarget,
  pitchRange,
  pitchStability,
  scoreTarget,
  yin,
} from '../src';
import { analyzeSignal, render, SR } from './signals';

describe('note math', () => {
  it('maps hz to nearest note and cents', () => {
    expect(nearestNote(440)).toMatchObject({ name: 'A4', midi: 69 });
    expect(nearestNote(440).cents).toBeCloseTo(0, 6);
    const n = nearestNote(midiToHz(57.2));
    expect(n.name).toBe('A3');
    expect(n.cents).toBeCloseTo(20, 4);
    expect(hzToMidi(220)).toBeCloseTo(57, 9);
    expect(noteName(61)).toBe('C#4');
  });
  it('parses notes and targets', () => {
    expect(parseNote('A3')).toBe(57);
    expect(parseNote('db4')).toBe(61);
    expect(parseNote('H3')).toBeNull();
    expect(parseTarget('A3')).toEqual({ notes: [{ midi: 57 }] });
    expect(parseTarget('A3:2 C4')!.notes).toEqual([{ midi: 57, durationS: 2 }, { midi: 60, durationS: 1 }]);
    expect(parseTarget('A3 nope')).toBeNull();
  });
});

describe('yin', () => {
  it.each([82.4, 110, 196, 261.6, 440, 880])('finds %f Hz within 0.5 percent (no octave error)', (hz) => {
    const x = render([{ dur: 0.1, hz }]);
    const r = yin(x.subarray(0, 640), SR);
    expect(r.f0).not.toBeNull();
    expect(Math.abs(1200 * Math.log2(r.f0! / hz))).toBeLessThan(8);
  });
  it('handles a weak fundamental (strong 2nd harmonic) without jumping an octave up', () => {
    const x = render([{ dur: 0.1, hz: 150, harmonics: [0.3, 1, 0.6, 0.3] }]);
    const r = yin(x.subarray(0, 640), SR);
    expect(r.f0!).toBeGreaterThan(145);
    expect(r.f0!).toBeLessThan(155);
  });
  it('returns unvoiced for silence and for white noise', () => {
    expect(yin(new Float32Array(640), SR).f0).toBeNull();
    const noise = render([{ dur: 0.1, hz: null, noise: 0.3 }]);
    expect(yin(noise.subarray(0, 640), SR).f0).toBeNull();
  });
  it('reports lower HNR for a noisy tone than for a clean one', () => {
    const clean = yin(render([{ dur: 0.1, hz: 200 }]).subarray(0, 640), SR);
    const noisy = yin(render([{ dur: 0.1, hz: 200, noise: 0.15 }]).subarray(0, 640), SR);
    expect(clean.hnrDb).toBeGreaterThan(noisy.hnrDb + 3);
  });
});

describe('contour analysis on synthetic signals', () => {
  const a3 = 220;
  it('measures near-zero stability for a steady tone', () => {
    const frames = analyzeSignal(render([{ dur: 2, hz: a3 }]));
    const segs = findSustainedSegments(frames);
    expect(segs).toHaveLength(1);
    expect(pitchStability(segs).sdCents!).toBeLessThan(5);
  });
  it('reads vibrato of +-30 cents as about 21 cents SD', () => {
    const frames = analyzeSignal(render([{ dur: 2, hz: a3, vibratoCents: 30, vibratoHz: 5.5 }]));
    const sd = pitchStability(findSustainedSegments(frames)).sdCents!;
    expect(sd).toBeGreaterThan(15);
    expect(sd).toBeLessThan(27);
  });
  it('splits notes and reports the stable range', () => {
    const frames = analyzeSignal(render([{ dur: 1, hz: midiToHz(55) }, { dur: 0.3, hz: null }, { dur: 1, hz: midiToHz(67) }, { dur: 0.2, hz: midiToHz(80) }]));
    const segs = findSustainedSegments(frames);
    expect(segs.length).toBe(2);
    const r = pitchRange(segs)!;
    expect(r.low).toBe('G3');
    expect(r.high).toBe('G4');
  });
  it('scores a held target: on pitch vs 40 cents flat', () => {
    const on = analyzeSignal(render([{ dur: 2, hz: a3 }]));
    expect(scoreTarget(on, { notes: [{ midi: 57 }] }).within25Pct).toBeGreaterThan(95);
    const flat = analyzeSignal(render([{ dur: 2, hz: a3 * Math.pow(2, -40 / 1200) }]));
    const s = scoreTarget(flat, { notes: [{ midi: 57 }] });
    expect(s.within25Pct).toBeLessThan(5);
    expect(s.within50Pct).toBeGreaterThan(95);
    expect(s.meanSignedCents!).toBeCloseTo(-40, -1);
  });
  it('scores a note sequence, with silence counting against the target', () => {
    const frames = analyzeSignal(render([{ dur: 1, hz: midiToHz(57) }, { dur: 1, hz: midiToHz(60) }]));
    const s = scoreTarget(frames, { notes: [{ midi: 57, durationS: 1 }, { midi: 60, durationS: 1 }] });
    expect(s.within25Pct).toBeGreaterThan(90);
    const wrong = scoreTarget(frames, { notes: [{ midi: 57, durationS: 1 }, { midi: 64, durationS: 1 }] });
    expect(wrong.within25Pct).toBeGreaterThan(40);
    expect(wrong.within25Pct).toBeLessThan(60);
    const longer = scoreTarget(frames, { notes: [{ midi: 57, durationS: 1 }, { midi: 60, durationS: 3 }] });
    expect(longer.within25Pct).toBeLessThan(s.within25Pct + 1);
  });
});
