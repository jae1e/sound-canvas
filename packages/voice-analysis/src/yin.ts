export interface YinOptions {
  minHz?: number;
  maxHz?: number;
  /** Absolute threshold on the cumulative mean normalised difference. */
  threshold?: number;
}
export interface YinResult {
  /** Null when unvoiced. */
  f0: number | null;
  /** 1 - d'(tau) at the chosen lag, clamped to 0..1. */
  voicing: number;
  /** Harmonics-to-noise ratio in dB derived from the same value. */
  hnrDb: number;
}

/**
 * YIN (de Cheveigne and Kawahara 2002) with an octave-error guard: among the local minima of the cumulative mean
 * normalised difference, pick the SHORTEST lag whose value is within 0.1 of the global minimum (a periodic
 * signal also dips at 2x, 3x ... its period; the shortest near-equal dip is the true period, which protects
 * against sub-octave errors). Voiced when the chosen value is under `threshold`. Mirrors YinPitch.kt.
 */
export function yin(frame: ArrayLike<number>, sampleRate: number, opts: YinOptions = {}): YinResult {
  const minHz = opts.minHz ?? 70;
  const maxHz = opts.maxHz ?? 1200;
  const threshold = opts.threshold ?? 0.15;
  const tauMin = Math.max(2, Math.floor(sampleRate / maxHz));
  const tauMax = Math.min(Math.floor(sampleRate / minHz), Math.floor(frame.length / 2) - 2);
  const none: YinResult = { f0: null, voicing: 0, hnrDb: -20 };
  if (tauMax <= tauMin + 2) return none;
  const w = Math.floor(frame.length / 2);

  const dp = new Float64Array(tauMax + 2);
  dp[0] = 1;
  let run = 0;
  for (let tau = 1; tau <= tauMax + 1; tau++) {
    let s = 0;
    for (let i = 0; i < w; i++) {
      const diff = frame[i]! - frame[i + tau]!;
      s += diff * diff;
    }
    run += s;
    dp[tau] = run > 0 ? (s * tau) / run : 1;
  }

  const dips: number[] = [];
  for (let tau = tauMin; tau <= tauMax; tau++) {
    if (dp[tau]! < dp[tau - 1]! && dp[tau]! <= dp[tau + 1]!) dips.push(tau);
  }
  if (dips.length === 0) return none;
  let best = dips[0]!;
  for (const t of dips) if (dp[t]! < dp[best]!) best = t;
  let chosen = best;
  for (const t of dips) {
    if (dp[t]! <= dp[best]! + 0.1) {
      chosen = t;
      break;
    }
  }
  const dpv = dp[chosen]!;
  const voicing = Math.min(1, Math.max(0, 1 - dpv));
  if (dpv > threshold) return { f0: null, voicing, hnrDb: hnr(dpv) };

  let tauF = chosen;
  const a = dp[chosen - 1]!;
  const b = dp[chosen]!;
  const c = dp[chosen + 1]!;
  const den = a - 2 * b + c;
  if (Math.abs(den) > 1e-12) tauF = chosen + (a - c) / (2 * den);
  return { f0: sampleRate / tauF, voicing, hnrDb: hnr(dpv) };
}

function hnr(dprime: number): number {
  const r = Math.min(0.999, Math.max(0.001, 1 - dprime));
  return 10 * Math.log10(r / (1 - r));
}
