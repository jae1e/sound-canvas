import { rmsDbfs, spectralCentroid } from '../src/dsp';
import type { Frame } from '../src/types';
import { yin } from '../src/yin';

export const SR = 16000;

/** Deterministic PRNG so tests are stable. */
export function rng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface Seg {
  /** Seconds. */
  dur: number;
  /** Hz; null = silence. */
  hz: number | null;
  vibratoCents?: number;
  vibratoHz?: number;
  amp?: number;
  /** Harmonic amplitudes (1 = fundamental). Default: 1, 0.5, 0.3, 0.2. */
  harmonics?: number[];
  /** White-noise amplitude added on top. */
  noise?: number;
}

/** Renders segments to a mono signal with phase-continuous vibrato. */
export function render(segs: Seg[], sr = SR, seed = 1): Float32Array {
  const rand = rng(seed);
  const total = segs.reduce((a, s) => a + Math.round(s.dur * sr), 0);
  const out = new Float32Array(total);
  let pos = 0;
  let phase = 0;
  for (const s of segs) {
    const n = Math.round(s.dur * sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let v = 0;
      if (s.hz !== null) {
        const cents = (s.vibratoCents ?? 0) * Math.sin(2 * Math.PI * (s.vibratoHz ?? 5.5) * t);
        const f = s.hz * Math.pow(2, cents / 1200);
        phase += (2 * Math.PI * f) / sr;
        const hs = s.harmonics ?? [1, 0.5, 0.3, 0.2];
        for (let h = 0; h < hs.length; h++) v += hs[h]! * Math.sin(phase * (h + 1));
        v *= (s.amp ?? 0.3) / hs.reduce((a, b) => a + b, 0);
      }
      if (s.noise) v += (rand() * 2 - 1) * s.noise;
      out[pos++] = v;
    }
  }
  return out;
}

/** Runs the TS YIN over the signal with the native frame layout (40 ms window, 20 ms hop). */
export function analyzeSignal(x: Float32Array, sr = SR, win = 0.04, hop = 0.02): Frame[] {
  const w = Math.round(win * sr);
  const h = Math.round(hop * sr);
  const frames: Frame[] = [];
  for (let s = 0; s + w <= x.length; s += h) {
    const slice = x.subarray(s, s + w);
    const rmsDb = rmsDbfs(slice);
    const quiet = rmsDb < -60;
    const r = quiet ? { f0: null, voicing: 0, hnrDb: -20 } : yin(slice, sr);
    frames.push({ t: (s + w / 2) / sr, f0: r.f0, voicing: r.voicing, rmsDb, centroid: quiet ? 0 : spectralCentroid(slice, sr), hnrDb: r.hnrDb });
  }
  return frames;
}
