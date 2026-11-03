export type Lang = 'ko' | 'en';
export type TakeMode = 'practice' | 'speech';

/** One analysis frame as emitted by the native tracker (and by the offline analysis contour). */
export interface Frame {
  /** Seconds from the start of the take. */
  t: number;
  /** Fundamental frequency in Hz, null when unvoiced. */
  f0: number | null;
  /** Voicing probability 0..1. */
  voicing: number;
  /** RMS level in dBFS (about -120 for digital silence). */
  rmsDb: number;
  /** Spectral centroid in Hz. */
  centroid: number;
  /** Harmonics-to-noise ratio in dB (optional; only meaningful on voiced frames). */
  hnrDb?: number | null;
}

export interface TimedWord {
  text: string;
  /** Seconds. */
  start: number;
  end: number;
}

/** A target pitch: a held note (no duration) or a sequence of notes with durations in seconds. */
export interface TargetNote {
  midi: number;
  /** Duration in seconds. Omit for a single held note that spans the whole take. */
  durationS?: number;
}
export interface TargetSpec {
  notes: TargetNote[];
}
