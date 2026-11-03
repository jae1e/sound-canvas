import { hzToMidi, noteName } from './notes';
import type { Frame, TargetSpec } from './types';

export const VOICED_MIN_PROBABILITY = 0.5;

export function isVoiced(f: Frame, minVoicing = VOICED_MIN_PROBABILITY): boolean {
  return f.f0 !== null && f.f0 > 0 && f.voicing >= minVoicing;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function sd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / xs.length);
}
function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const h = s.length >> 1;
  return s.length % 2 ? s[h]! : (s[h - 1]! + s[h]!) / 2;
}
function percentile(xs: number[], p: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))]!;
}
/** Typical frame spacing in seconds. */
export function frameStep(frames: Frame[]): number {
  if (frames.length < 2) return 0.02;
  const d: number[] = [];
  for (let i = 1; i < frames.length; i++) d.push(frames[i]!.t - frames[i - 1]!.t);
  return median(d) || 0.02;
}

// ---------------------------------------------------------------- sustained segments

export interface SustainedSegment {
  startS: number;
  endS: number;
  durationS: number;
  /** Median pitch as a fractional MIDI number. */
  medianMidi: number;
  /** SD of the pitch in cents about the segment mean, edges trimmed (see options). */
  sdCents: number;
  /** Indices into the frames array covered by the segment. */
  firstIndex: number;
  lastIndex: number;
}
export interface SegmentOptions {
  /** A jump bigger than this (cents, vs the running mean of recent frames) starts a new segment. Default 100. */
  jumpCents?: number;
  /** Unvoiced gap tolerated inside a segment, seconds. Default 0.06. */
  maxGapS?: number;
  /** Minimum segment length, seconds. Default 0.4. */
  minDurationS?: number;
  /** Trimmed from both ends before computing the SD (onset/offset glides), seconds. Default 0.1. */
  trimS?: number;
  minVoicing?: number;
}

/**
 * Splits the contour into sustained pitched segments (notes held roughly steady, vibrato included).
 * Note: vibrato counts as deviation; a +-50 cent vibrato reads as about 35 cents SD.
 */
export function findSustainedSegments(frames: Frame[], opts: SegmentOptions = {}): SustainedSegment[] {
  const jump = opts.jumpCents ?? 100;
  const maxGap = opts.maxGapS ?? 0.06;
  const minDur = opts.minDurationS ?? 0.4;
  const trim = opts.trimS ?? 0.1;
  const out: SustainedSegment[] = [];
  let cur: { idx: number[]; midi: number[] } | null = null;
  let lastT = -Infinity;

  const flush = () => {
    if (!cur || cur.idx.length < 2) {
      cur = null;
      return;
    }
    const first = cur.idx[0]!;
    const last = cur.idx[cur.idx.length - 1]!;
    const startS = frames[first]!.t;
    const endS = frames[last]!.t;
    const durationS = endS - startS + frameStep(frames);
    if (durationS >= minDur) {
      let core = cur.idx.map((i, k) => ({ t: frames[i]!.t, m: cur!.midi[k]! })).filter((p) => p.t >= startS + trim && p.t <= endS - trim);
      if (core.length < 3) core = cur.idx.map((i, k) => ({ t: frames[i]!.t, m: cur!.midi[k]! }));
      const ms = core.map((p) => p.m);
      out.push({
        startS,
        endS,
        durationS,
        medianMidi: median(cur.midi),
        sdCents: sd(ms) * 100,
        firstIndex: first,
        lastIndex: last,
      });
    }
    cur = null;
  };

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i]!;
    if (!isVoiced(f, opts.minVoicing)) continue;
    const midi = hzToMidi(f.f0!);
    if (cur && f.t - lastT > maxGap + frameStep(frames) * 1.01) flush();
    if (cur) {
      const recent = cur.midi.slice(-8);
      if (Math.abs(midi - median(recent)) * 100 > jump) flush();
    }
    if (!cur) cur = { idx: [], midi: [] };
    cur.idx.push(i);
    cur.midi.push(midi);
    lastT = f.t;
  }
  flush();
  return out;
}

// ---------------------------------------------------------------- stability and range

export interface Stability {
  /** Duration-weighted mean SD over sustained segments; null when no sustained segment exists. */
  sdCents: number | null;
  segmentCount: number;
  sustainedS: number;
}
export function pitchStability(segments: SustainedSegment[]): Stability {
  const total = segments.reduce((a, s) => a + s.durationS, 0);
  if (!segments.length || total <= 0) return { sdCents: null, segmentCount: 0, sustainedS: 0 };
  const w = segments.reduce((a, s) => a + s.sdCents * s.durationS, 0) / total;
  return { sdCents: w, segmentCount: segments.length, sustainedS: total };
}

export interface PitchRange {
  lowMidi: number;
  highMidi: number;
  low: string;
  high: string;
}
/** Lowest and highest stable notes: segments of at least `minDurationS` (default 0.5 s), rounded to a note. */
export function pitchRange(segments: SustainedSegment[], minDurationS = 0.5): PitchRange | null {
  const notes = segments.filter((s) => s.durationS >= minDurationS).map((s) => Math.round(s.medianMidi));
  if (!notes.length) return null;
  const lowMidi = Math.min(...notes);
  const highMidi = Math.max(...notes);
  return { lowMidi, highMidi, low: noteName(lowMidi), high: noteName(highMidi) };
}

// ---------------------------------------------------------------- target scoring

export interface TargetScore {
  /** Share (0..100) of target time during which the singer was voiced and within the tolerance. */
  within25Pct: number;
  within50Pct: number;
  /** Same, relative to the voiced frames inside target windows only. */
  within25OfVoicedPct: number;
  within50OfVoicedPct: number;
  meanAbsCents: number | null;
  /** Positive = sharp, negative = flat. */
  meanSignedCents: number | null;
  targetFrames: number;
}
export interface TargetScoreOptions {
  /** When true, octave errors/octave-displaced singing count as on target (pitch class only). */
  octaveInvariant?: boolean;
  /** For sequences, start the target clock at the first voiced frame (default) or at t = 0. */
  startAt?: 'firstVoiced' | 'take';
  minVoicing?: number;
}

/** Target note at time t (seconds since the target clock started), or null after the sequence ends. */
export function targetMidiAt(spec: TargetSpec, t: number): number | null {
  if (t < 0) return null;
  let acc = 0;
  for (const n of spec.notes) {
    if (n.durationS === undefined) return n.midi;
    acc += n.durationS;
    if (t < acc) return n.midi;
  }
  return null;
}
export function targetClockStart(frames: Frame[], spec: TargetSpec, opts: TargetScoreOptions = {}): number {
  const single = spec.notes.length === 1 && spec.notes[0]!.durationS === undefined;
  if (single || opts.startAt === 'take') return 0;
  const first = frames.find((f) => isVoiced(f, opts.minVoicing));
  return first ? first.t : 0;
}

export function scoreTarget(frames: Frame[], spec: TargetSpec, opts: TargetScoreOptions = {}): TargetScore {
  const t0 = targetClockStart(frames, spec, opts);
  let inWindow = 0;
  let voiced = 0;
  let w25 = 0;
  let w50 = 0;
  const abs: number[] = [];
  const signed: number[] = [];
  for (const f of frames) {
    const tm = targetMidiAt(spec, f.t - t0);
    if (tm === null) continue;
    inWindow++;
    if (!isVoiced(f, opts.minVoicing)) continue;
    voiced++;
    let c = (hzToMidi(f.f0!) - tm) * 100;
    if (opts.octaveInvariant) c = ((((c + 600) % 1200) + 1200) % 1200) - 600;
    abs.push(Math.abs(c));
    signed.push(c);
    if (Math.abs(c) <= 25) w25++;
    if (Math.abs(c) <= 50) w50++;
  }
  const pct = (n: number, d: number) => (d > 0 ? (100 * n) / d : 0);
  return {
    within25Pct: pct(w25, inWindow),
    within50Pct: pct(w50, inWindow),
    within25OfVoicedPct: pct(w25, voiced),
    within50OfVoicedPct: pct(w50, voiced),
    meanAbsCents: abs.length ? mean(abs) : null,
    meanSignedCents: signed.length ? mean(signed) : null,
    targetFrames: inWindow,
  };
}

// ---------------------------------------------------------------- pauses and loudness

export interface PauseOptions {
  /** Frames quieter than this are silent. Default: adaptive from the take (see {@link silenceThresholdDb}). */
  silenceDb?: number;
  /** Shortest silent run that counts as a pause, seconds. Default 0.3. */
  minPauseS?: number;
}
export interface Pauses {
  count: number;
  durationsS: number[];
  totalS: number;
  longestS: number;
  meanS: number;
}

/** Adaptive silence threshold: between the noise floor (10th percentile) and the speech level (90th). */
export function silenceThresholdDb(frames: Frame[]): number {
  const db = frames.map((f) => f.rmsDb);
  if (!db.length) return -60;
  const lo = percentile(db, 0.1);
  const hi = percentile(db, 0.9);
  if (hi - lo < 12) return Math.min(lo - 1, -55); // essentially no contrast: treat only very quiet frames as silence
  return lo + 0.3 * (hi - lo);
}

/** Pauses are silent runs between speech; leading and trailing silence is not counted. */
export function findPauses(frames: Frame[], opts: PauseOptions = {}): Pauses {
  const thr = opts.silenceDb ?? silenceThresholdDb(frames);
  const minPause = opts.minPauseS ?? 0.3;
  const dt = frameStep(frames);
  const loud = frames.map((f) => f.rmsDb >= thr);
  const first = loud.indexOf(true);
  const last = loud.lastIndexOf(true);
  const durations: number[] = [];
  if (first >= 0) {
    let runStart = -1;
    for (let i = first; i <= last; i++) {
      if (!loud[i]) {
        if (runStart < 0) runStart = i;
      } else if (runStart >= 0) {
        const d = (i - runStart) * dt;
        if (d >= minPause) durations.push(d);
        runStart = -1;
      }
    }
  }
  const totalS = durations.reduce((a, b) => a + b, 0);
  return {
    count: durations.length,
    durationsS: durations,
    totalS,
    longestS: durations.length ? Math.max(...durations) : 0,
    meanS: durations.length ? totalS / durations.length : 0,
  };
}

export interface Loudness {
  meanDb: number | null;
  sdDb: number | null;
}
/** Mean and SD of RMS dBFS over non-silent frames. */
export function loudness(frames: Frame[], silenceDb?: number): Loudness {
  const thr = silenceDb ?? silenceThresholdDb(frames);
  const v = frames.filter((f) => f.rmsDb >= thr).map((f) => f.rmsDb);
  return v.length ? { meanDb: mean(v), sdDb: sd(v) } : { meanDb: null, sdDb: null };
}

// ---------------------------------------------------------------- whole-take metrics

export interface TakeMetrics {
  durationS: number;
  voicedRatio: number;
  stability: Stability;
  range: PitchRange | null;
  target: TargetScore | null;
  loudness: Loudness;
  pauses: Pauses;
  /** Mean harmonics-to-noise ratio over voiced frames, dB. Lower = breathier (heuristic). */
  hnrDb: number | null;
  /** Mean spectral centroid over non-silent frames, Hz. Higher = brighter (heuristic). */
  brightnessHz: number | null;
}

export function analyzeFrames(frames: Frame[], target?: TargetSpec | null, opts: TargetScoreOptions = {}): TakeMetrics {
  const dt = frameStep(frames);
  const durationS = frames.length ? frames[frames.length - 1]!.t - frames[0]!.t + dt : 0;
  const thr = silenceThresholdDb(frames);
  const voicedFrames = frames.filter((f) => isVoiced(f));
  const hnr = voicedFrames.map((f) => f.hnrDb).filter((x): x is number => typeof x === 'number');
  const cent = frames.filter((f) => f.rmsDb >= thr && f.centroid > 0).map((f) => f.centroid);
  const segments = findSustainedSegments(frames);
  return {
    durationS,
    voicedRatio: frames.length ? voicedFrames.length / frames.length : 0,
    stability: pitchStability(segments),
    range: pitchRange(segments),
    target: target ? scoreTarget(frames, target, opts) : null,
    loudness: loudness(frames, thr),
    pauses: findPauses(frames, { silenceDb: thr }),
    hnrDb: hnr.length ? mean(hnr) : null,
    brightnessHz: cent.length ? mean(cent) : null,
  };
}

/** Evenly thins a contour to at most `maxPoints` frames (for charts). */
export function downsampleFrames(frames: Frame[], maxPoints: number): Frame[] {
  if (frames.length <= maxPoints) return frames;
  const step = frames.length / maxPoints;
  const out: Frame[] = [];
  for (let i = 0; i < maxPoints; i++) out.push(frames[Math.floor(i * step)]!);
  return out;
}
