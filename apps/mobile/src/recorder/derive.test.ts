import { describe, expect, it } from 'vitest';
import { calibrationMedian, centerPitchRange, centsColor, groupByDay, nextTip, rangeLabel, stabilityLabel } from './derive';
import { RingBuffer } from './ringBuffer';

describe('recorder derivations', () => {
  it('uses absolute cents and includes the threshold', () => {
    expect([centsColor(-15), centsColor(35), centsColor(-36)]).toEqual(['green', 'amber', 'red']);
  });
  it('formats ranges and chooses a single next action', () => {
    expect(rangeLabel(48, 60)).toBe('C3–C4');
    expect(rangeLabel(null, 60)).toBeNull();
    expect(stabilityLabel(null)).toBe('unknown');
    expect(nextTip(60, 100)).toBe('steady');
    expect(nextTip(10, 100)).toBe('beat');
  });
  it('smooths pitch centre and finds the median calibration', () => {
    expect(centerPitchRange(60, [70, 72, 71], 0.5)).toBe(65.5);
    expect(centerPitchRange(60, [])).toBe(60);
    expect(calibrationMedian([20, 5, 10, 15])).toBe(12.5);
  });
  it('groups by local calendar day', () => {
    const items = [new Date(2026, 0, 1, 23).getTime(), new Date(2026, 0, 2).getTime()];
    expect([...groupByDay(items, (n) => n).keys()]).toEqual(['2026-01-01', '2026-01-02']);
  });
  it('retains the most recent frames in order', () => {
    const b = new RingBuffer<number>(2); b.push(1); b.push(2); b.push(3);
    expect(b.values()).toEqual([2, 3]); b.clear(); expect(b.values()).toEqual([]);
  });
});
