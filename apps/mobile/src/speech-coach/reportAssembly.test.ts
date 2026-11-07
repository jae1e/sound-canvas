import { describe, expect, it } from 'vitest';
import { assembleSpeechReport } from './reportAssembly';

const analysis = {
  durationMs: 30000,
  syllableTimesMs: [100, 200, 300],
  pauses: [],
  pitchSpreadSemitones: 6,
  rmsDb: [],
};
describe('speech report assembly', () => {
  it('keeps target time for free speaking and adds transcript after arrival', () => {
    const base = { plan: null, targetMs: 60000, analysis, transcript: null, boundaries: [], previous: null };
    const local = assembleSpeechReport(base);
    expect(local.timeVerdict).toBe('under');
    expect(local.transcriptAvailable).toBe(false);
    const complete = assembleSpeechReport({
      ...base,
      transcript: {
        text: 'um hello',
        language: 'en',
        words: [
          { w: 'um', start_ms: 0, end_ms: 200 },
          { w: 'hello', start_ms: 300, end_ms: 600 },
        ],
      },
      previous: local,
    });
    expect(complete.transcriptAvailable).toBe(true);
    expect(complete.tiles.fillers.value).toBeGreaterThan(0);
    expect(complete.tiles.pace.deltaVsPrevious).not.toBeNull();
  });
});
