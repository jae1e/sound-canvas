export const WAVE_FLOOR_X100 = -6000;
export const WAVE_GUIDE_X100 = -3000;
/** About 6 s of 40 ms bars. */
export const WAVE_BARS = 150;

/** Bar height fraction: -60..0 dBFS maps to 0..1. */
export function peakToFraction(dbX100: number): number {
  if (!Number.isFinite(dbX100)) return 0;
  return Math.min(1, Math.max(0, (dbX100 - WAVE_FLOOR_X100) / -WAVE_FLOOR_X100));
}

export type LevelBand = 'quiet' | 'good' | 'hot';

/** quiet below -40 dBFS, hot above -6 dBFS (near clipping), good between. */
export function levelBand(dbX100: number): LevelBand {
  if (dbX100 < -4000) return 'quiet';
  if (dbX100 > -600) return 'hot';
  return 'good';
}

/** Appends new peaks to a scrolling window of at most `max` bars. */
export function pushWave(buf: number[], peaks: number[], max = WAVE_BARS): number[] {
  const next = buf.concat(peaks);
  return next.length > max ? next.slice(next.length - max) : next;
}

/** Splits `total` buckets over segments in proportion to their durations (at least 1 each, sum = total when possible). */
export function bucketsPerSegment(durationsMs: number[], total = 300): number[] {
  const sum = durationsMs.reduce((a, b) => a + b, 0);
  if (durationsMs.length === 0) return [];
  if (sum <= 0) return durationsMs.map(() => 1);
  const out = durationsMs.map((d) => Math.max(1, Math.round((d / sum) * total)));
  // Trim rounding drift from the largest bucket.
  let drift = out.reduce((a, b) => a + b, 0) - total;
  const big = out.indexOf(Math.max(...out));
  if (drift !== 0 && out[big] - drift >= 1) out[big] -= drift;
  return out;
}

export function playheadFraction(positionMs: number, durationMs: number): number {
  return durationMs > 0 ? Math.min(1, Math.max(0, positionMs / durationMs)) : 0;
}

/** Touch x within a waveform of `width` px to a playback position. */
export function positionFromTouch(x: number, width: number, durationMs: number): number {
  if (width <= 0 || durationMs <= 0) return 0;
  return Math.round(Math.min(1, Math.max(0, x / width)) * durationMs);
}
