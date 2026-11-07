import { describe, expect, it } from 'vitest';
import { takeSummary } from './takeSummary';

describe('takeSummary', () => {
  it('includes the analyzed pitch range on the second line', () => {
    const time = new Date(2026, 10, 7, 22, 23).getTime();
    expect(takeSummary(time, JSON.stringify({ rangeLowMidi: 55, rangeHighMidi: 62 }), null)).toBe(
      `${new Date(time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · G3–D4`,
    );
  });
  it('shows just the time for a silent take without a range', () => {
    const time = new Date(2026, 10, 7, 22, 23).getTime();
    expect(takeSummary(time, JSON.stringify({ rangeLowMidi: null, rangeHighMidi: null }), null)).toBe(
      new Date(time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    );
  });
});
