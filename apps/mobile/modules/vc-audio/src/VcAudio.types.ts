// Contract between the Kotlin module VcAudio and the Voice Coach app (UX v2, 2026-11-07).
// Design: docs/products/voice-life-companion/voice-coach-ux-v2.md and design/voice-coach-ui-v2.html.
// Policies: voice-coach-renovation-plan.md sections 3.1 (input) and 3.2 (output); Field Voice Log lessons FT-03..FT-19.
// One engine, one audio clock. All times are in milliseconds since the engine's monotonic clock
// (SystemClock.elapsedRealtimeNanos / 1e6) unless named otherwise.

// ---------------------------------------------------------------- devices

export type DeviceType = 'builtin' | 'wired' | 'usb' | 'bluetooth' | 'speaker' | 'other';

export interface AudioDevice {
  /** Stable key for matching: `${type}:${productName}:${addressHash}`. Never the Android id (FVL FT-06). */
  key: string;
  type: DeviceType;
  /** Human name, for example "Galaxy Buds3" or "휴대폰 마이크" (the app localizes builtin and speaker). */
  productName: string;
  /** SHA-256 of the Bluetooth/USB address, first 12 hex chars; '' for builtin. */
  addressHash: string;
  /** Bluetooth SCO/LE-audio headset microphones are narrowband call-quality inputs. */
  callQuality: boolean;
}

/** Input preference. Default { mode: 'builtin' } (user decision Q2: phone mic by default). */
export type InputPreference = { mode: 'builtin' } | { mode: 'device'; key: string };

/** Output preference. Default { mode: 'system' }: follow Android's media route. The speaker is used only when chosen. */
export type OutputPreference = { mode: 'system' } | { mode: 'device'; key: string };

export interface DevicesEvent {
  inputs: AudioDevice[];
  outputs: AudioDevice[];
  inputPreference: InputPreference;
  outputPreference: OutputPreference;
  /** The input actually captured now (or that will be captured), after resolving the preference. */
  activeInput: AudioDevice | null;
  /** Where media audio goes now. For 'system', the device Android routes media to. */
  activeOutput: AudioDevice | null;
  /** True while a take is recording: preferences are locked. */
  locked: boolean;
}

// ---------------------------------------------------------------- live analysis

/** About 50 Hz while the monitor runs. */
export interface FrameEvent {
  /** Engine clock, ms. */
  tMs: number;
  /** Fundamental frequency in Hz, null when unvoiced. YIN/MPM, ported from vlc-voice-coach FrameAnalyzer. */
  f0: number | null;
  /** Fractional MIDI note (69 = A4), null when unvoiced. */
  midi: number | null;
  voicing: number;
  /** RMS level of the frame, dBFS (-100..0). */
  rmsDb: number;
  /** Peak absolute sample of the frame, 0..1 (for the waveform bars). */
  peak: number;
  /** True on the frame where a syllable nucleus was detected (speech pace; de Jong & Wempe style intensity peaks). */
  syllable: boolean;
  /** Frames where the app's own beat click may bleed into the mic (±30 ms around a click on a speaker route). */
  beatMasked: boolean;
}

/**
 * Silencing and lifecycle. `silenced` = another app holds the mic with priority
 * (AudioRecordingCallback.isClientSilenced); the app shows it in words.
 */
export interface MonitorStateEvent {
  running: boolean;
  silenced: boolean;
  /** Why it stopped, when running becomes false. */
  reason?: 'stopped' | 'left_app' | 'error' | 'permission';
  error?: string;
}

// ---------------------------------------------------------------- takes

export type TakeKind = 'song' | 'speech';

export interface StartTakeOptions {
  kind: TakeKind;
  /** When the beat is on and countIn is true, recording starts on beat 1 after one bar of count-in. */
  countIn?: boolean;
}

export interface TakeStarted {
  id: string;
  /** Absolute path of the 48 kHz mono 16-bit WAV being written. */
  path: string;
  sampleRate: number;
  /** AudioSource used: 'UNPROCESSED' | 'VOICE_RECOGNITION' | 'MIC' (never VOICE_COMMUNICATION, VC-01). */
  source: string;
  input: AudioDevice;
  output: AudioDevice | null;
  /** Engine clock ms of sample 0 of the file. */
  startMs: number;
}

export interface TakeStopped {
  id: string;
  path: string;
  /** 16 kHz mono 16-bit WAV copy for the server transcript (speech takes only). */
  asrPath: string | null;
  durationMs: number;
  sizeBytes: number;
  reason: 'user' | 'left_app' | 'error' | 'permission';
  /** Beat times (ms from file start) of every beat played during the take, empty without a beat. */
  beatTimesMs: number[];
  /** Input changes during the take (disconnect → phone mic), ms from file start. */
  inputChanges: { atMs: number; input: AudioDevice; reason: 'device_disconnected' | 'system' }[];
  /** Latency offset (ms) of the output that was applied to beatTimesMs, 0 if none. */
  outputLatencyMs: number;
}

// ---------------------------------------------------------------- beat

export type BeatPattern = 'click' | 'eight' | 'sixteen' | 'ballad' | 'shuffle' | 'bossa' | 'hiphop';

export interface BeatConfig {
  bpm: number; // 30..240
  /** 2, 3, 4 or 6 (6 = 6/8, counted in eighths with an accent on 1 and 4). */
  beatsPerBar: 2 | 3 | 4 | 6;
  pattern: BeatPattern;
  /** 0..1, mixed on the selected output. */
  volume: number;
  /** Speech pacer: a soft tick at this rate instead of a musical pattern (syllables per tick is the app's business). */
  pacer?: boolean;
}

/** Emitted on every beat while the beat plays. `atMs` is when the beat is heard (engine clock, latency applied). */
export interface BeatEvent {
  bar: number;
  beat: number; // 1-based
  atMs: number;
  countIn: boolean;
}

// ---------------------------------------------------------------- playback and analysis

export interface PlaybackEvent {
  state: 'playing' | 'paused' | 'stopped' | 'ended' | 'error';
  positionMs: number;
  durationMs: number;
  error?: string;
}

/** Whole-take analysis for the review graphs and the song result card. Columnar, same length. */
export interface TakeAnalysis {
  durationMs: number;
  /** About 50 points per second, decimated to at most maxPoints. */
  tMs: number[];
  midi: (number | null)[];
  rmsDb: number[];
  /** Waveform peaks, one per bucket (buckets = waveformBuckets option). */
  peaks: number[];
  /** Song metrics. */
  rangeLowMidi: number | null;
  rangeHighMidi: number | null;
  /** SD in cents of voiced frames after removing the note-level trend; lower is steadier. */
  stabilityCents: number | null;
  /** Mean signed onset offset to the nearest beat, ms (+ = late), null without beats. */
  beatOffsetMs: number | null;
  /** Speech: syllable nuclei times and pauses (> 250 ms of silence), ms from file start. */
  syllableTimesMs: number[];
  pauses: { startMs: number; endMs: number }[];
  /** Pitch spread of voiced frames in semitones (5th to 95th percentile), for "monotone". */
  pitchSpreadSemitones: number | null;
}

export interface AnalyzeOptions {
  maxPoints?: number; // default 3000
  waveformBuckets?: number; // default 400
  beatTimesMs?: number[];
}

// ---------------------------------------------------------------- reconcile (ARCHITECTURE.md: reconcile on start and resume)

/** Native truth for reconcile on app start and resume. */
export interface EngineState {
  monitorRunning: boolean;
  silenced: boolean;
  /** The take being recorded now, or null. */
  take: TakeStarted | null;
  /**
   * Stopped takes the app has not acknowledged yet, oldest first. Native writes a `<id>.json` sidecar
   * (the TakeStopped) next to each WAV on stop, so these survive process death. Cleared by ackTake().
   */
  unacknowledged: TakeStopped[];
}

/** A WAV in the takes folder, for orphan recovery (a take cut off by a crash has no sidecar). */
export interface TakeFile {
  id: string;
  path: string;
  sizeBytes: number;
  modifiedMs: number;
  /** The sidecar if present; null for an orphan. listTakeFiles() repairs orphan WAV headers before returning. */
  meta: TakeStopped | null;
  acknowledged: boolean;
}

// ---------------------------------------------------------------- events map

export type VcAudioModuleEvents = {
  onDevices: (e: DevicesEvent) => void;
  onFrame: (e: FrameEvent) => void;
  onMonitorState: (e: MonitorStateEvent) => void;
  onTakeStopped: (e: TakeStopped) => void;
  onBeat: (e: BeatEvent) => void;
  onPlayback: (e: PlaybackEvent) => void;
};
