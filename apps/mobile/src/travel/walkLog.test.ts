import { describe, expect, it } from 'vitest';

import { WalkLog } from './walkLog';

const fix = (lat: number, lng: number, t: number, accuracyM = 5) => ({ lat, lng, accuracyM, timestampMs: t });

describe('WalkLog', () => {
  it('sums distance over moving fixes and ignores jitter, poor accuracy and jumps', () => {
    const log = new WalkLog(0);
    expect(log.add(fix(37.5, 127, 0))).toBe(true);
    expect(log.add(fix(37.50001, 127, 1000))).toBe(false); // about 1 m: jitter
    expect(log.add(fix(37.5002, 127, 20_000))).toBe(true); // about 22 m in 20 s
    expect(log.add(fix(37.5004, 127, 40_000, 120))).toBe(false); // poor accuracy
    expect(log.add(fix(37.52, 127, 41_000))).toBe(false); // 2 km in 1 s: jump
    expect(log.pointCount).toBe(2);
    const s = log.summary(60_000);
    expect(s.distanceM).toBeGreaterThan(20);
    expect(s.distanceM).toBeLessThan(25);
    expect(s.durationMs).toBe(60_000);
    expect(s.startedAt).toBe(0);
  });
});

import { walkSummaryText } from './walkLog';

describe('walkSummaryText', () => {
  it('writes ko and en summaries', () => {
    const base = { distanceM: 1234, durationMs: 23 * 60_000, destination: 'Cafe A', notes: 2, points: 40 };
    expect(walkSummaryText({ ...base, lang: 'en' })).toBe('Walk: 1.2 km in 23 min. Destination: Cafe A. 2 notes.');
    expect(walkSummaryText({ ...base, lang: 'ko' })).toBe('산책 1.2 km, 23분. 목적지: Cafe A. 메모 2개.');
  });
  it('says so when no distance was recorded', () => {
    expect(walkSummaryText({ lang: 'en', distanceM: 0, durationMs: 90_000, notes: 0, points: 0 })).toBe('Walked for 2 min. No distance was recorded.');
  });
});
