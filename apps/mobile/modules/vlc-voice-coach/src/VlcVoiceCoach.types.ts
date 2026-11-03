export interface CaptureInfo {
  sampleRate: number;
  /** UNPROCESSED, MIC or VOICE_RECOGNITION (the first that worked). */
  source: string;
}

/** Live frame event (about 40 Hz). */
export interface FrameEvent {
  /** Seconds since the capture started. */
  t: number;
  f0: number | null;
  voicing: number;
  rmsDb: number;
  centroid: number;
  hnrDb: number;
  /** Nearest note name such as "A3"; null when unvoiced. */
  note: string | null;
  /** Deviation from that note in cents, -50..+50; null when unvoiced. */
  cents: number | null;
}

export interface TakeInfo {
  id: string;
  path: string;
  sampleRate: number;
  durationS: number;
  sizeBytes: number;
  createdAtMs: number;
}

export interface StartedTake {
  id: string;
  sampleRate: number;
  source: string;
}

export interface TargetNoteArg {
  midi: number;
  durationS?: number;
}

/** Columnar contour, same length per array. f0 entries are null when unvoiced. */
export interface NativeContour {
  t: number[];
  f0: (number | null)[];
  voicing: number[];
  rmsDb: number[];
  centroid: number[];
  hnrDb: number[];
}

export interface NativeTargetScore {
  within25Pct: number;
  within50Pct: number;
  within25OfVoicedPct: number;
  within50OfVoicedPct: number;
  meanAbsCents: number | null;
  meanSignedCents: number | null;
}

export interface NativeMetrics {
  durationS: number;
  voicedRatio: number;
  stabilitySdCents: number | null;
  sustainedS: number;
  rangeLowMidi: number | null;
  rangeHighMidi: number | null;
  rangeLow: string | null;
  rangeHigh: string | null;
  target: NativeTargetScore | null;
  loudnessMeanDb: number | null;
  loudnessSdDb: number | null;
  pauseCount: number;
  pauseDurationsS: number[];
  pauseTotalS: number;
  hnrDb: number | null;
  brightnessHz: number | null;
}

export interface NativeTakeAnalysis {
  id: string;
  sampleRate: number;
  contour: NativeContour;
  metrics: NativeMetrics;
}

export interface AnalyzeOptions {
  maxContourPoints?: number;
  target?: TargetNoteArg[];
}

export type PlaybackState = 'playing' | 'stopped' | 'completed' | 'error';

export type VlcVoiceCoachModuleEvents = {
  frame: (e: FrameEvent) => void;
  captureError: (e: { message: string }) => void;
  playbackState: (e: { id: string; state: PlaybackState }) => void;
};
