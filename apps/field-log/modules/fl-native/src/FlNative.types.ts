// Contract between the Kotlin module (FlNativeModule) and the app's TypeScript code.
// Wire formats for the server are in docs/products/industrial-voice-logging/api-v0.md.
// All numbers are integers unless noted. Times: wallMs = System.currentTimeMillis(),
// elapsedUs = SystemClock.elapsedRealtimeNanos() / 1000, bootCount = Settings.Global.BOOT_COUNT.

export type AudioSourceName = 'UNPROCESSED' | 'VOICE_RECOGNITION' | 'MIC';

export type RouteType =
  | 'builtin_mic'
  | 'bluetooth_sco'
  | 'ble_headset'
  | 'wired_headset'
  | 'usb'
  | 'other';

/** Same shape as the api-v0 `Route` (camelCase here, snake_case on the wire). */
export interface Route {
  type: RouteType;
  productName?: string;
  /** SHA-256 hex of the Bluetooth address; never the address itself. */
  addressHash?: string;
  /** AudioDeviceInfo.getId() of the routed input. */
  deviceId?: number;
}

export type EffectState = 'off' | 'on' | 'unavailable';

export interface Effects {
  ns: EffectState;
  agc: EffectState;
  aec: EffectState;
}

/** api-v0 location payload; built by the app, echoed by the module into journal records. */
export interface LocationPayload {
  lat_e7: number;
  lon_e7: number;
  accuracy_cm: number;
  altitude_cm?: number;
  provider: string;
  fix_wall_ms: number;
  fix_elapsed_us: number;
}

export interface InputDevice {
  /** AudioDeviceInfo.getId(). Changes on every reconnect; never persist it. */
  id: number;
  type: RouteType;
  productName: string;
  /** SHA-256 hex of the device address when it has one (Bluetooth, USB). Stable across reconnects. */
  addressHash?: string;
}

/**
 * Which microphone to record from (api-v0 section 6, "Input selection").
 * Resolved once when a recording starts and locked for that recording (api-v0 section 6).
 * - auto: a connected headset microphone, else the phone microphone. Priority: wired_headset or usb,
 *   then ble_headset, then bluetooth_sco, then builtin_mic.
 * - phone: always the built-in microphone.
 * - device: one headset, matched by type + productName (+ addressHash when both have one); if it is
 *   not connected, the phone microphone is used until it reconnects.
 */
export type InputPreference =
  | { mode: 'auto' }
  | { mode: 'phone' }
  | { mode: 'device'; type: RouteType; productName: string; addressHash?: string };

/** Fired on start of listening, on every input connect/disconnect and on setInputPreference(). */
export interface InputsEvent {
  inputs: InputDevice[];
  /** The input the current preference resolves to right now (what a recording would use or is using). */
  selected: InputDevice | null;
  preference: InputPreference;
}

export interface Capabilities {
  /** AudioManager.PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED. */
  unprocessedSupported: boolean;
  /** AudioManager.getDevices(GET_DEVICES_INPUTS), mapped. */
  inputs: InputDevice[];
  sdkInt: number;
  model: string;
  manufacturer: string;
  bootCount: number;
}

export interface ClockReading {
  wallMs: number;
  elapsedUs: number;
  bootCount: number;
}

export type LiveLanguage = 'auto' | 'ko' | 'en';

export interface LiveOptions {
  /** For example ws://100.84.83.35:8787/v1/live */
  url: string;
  /** Device token, sent as `Authorization: Bearer <token>`. */
  token: string;
  language: LiveLanguage;
}

export interface StartRecordingOptions {
  memoId: string;
  recordingId: string;
  /** Omitted = the preference last set with setInputPreference(), default { mode: 'auto' }. */
  input?: InputPreference;
  /** Omitted = UNPROCESSED when supported, else VOICE_RECOGNITION, else MIC. */
  source?: AudioSourceName;
  /** Echoed into the recording_started journal record. */
  location?: LocationPayload;
  /** Live draft transcript over WebSocket (api-v0 section 5). Omitted = no live draft. */
  live?: LiveOptions;
}

export interface RecordingStarted {
  recordingId: string;
  source: AudioSourceName;
  sampleRate: 16000;
  route: Route;
  effects: Effects;
  startWallMs: number;
  startElapsedUs: number;
}

export type LiveState = 'off' | 'connecting' | 'live' | 'paused' | 'busy';

export interface RecorderStatus {
  recording: boolean;
  recordingId?: string;
  memoId?: string;
  /** Milliseconds since the current recording started; 0 when idle. */
  elapsedMs: number;
  /** Index of the segment being written, or -1 when idle. */
  segmentIndex: number;
  liveState: LiveState;
  /** True between pauseRecording() and resumeRecording(); the microphone is released while paused. */
  paused: boolean;
  /** AudioRecordingConfiguration.isClientSilenced() for our capture (another app took the mic). */
  silenced: boolean;
}

export type StopReason = 'user' | 'left_app' | 'error' | 'interrupted' | 'recovered';

/**
 * Automatic stop when the app goes to the background (persisted natively).
 * onLeaveApp: stop and save (reason 'left_app') when the app is no longer visible because the user went
 *   home or to another app. Decided natively on process ON_STOP, not on a transient pause (permission
 *   dialogs and the notification shade must not stop a recording). Default true.
 * keepWhenScreenOff: if the app stopped being visible because the screen turned off or the keyguard
 *   locked, keep recording. Default true.
 */
export interface AutoStopOptions {
  onLeaveApp: boolean;
  keepWhenScreenOff: boolean;
}

/** Fields every journal record has. journalSeq is native, monotonic, persisted, starts at 1. */
interface JournalBase {
  journalSeq: number;
  memoId: string;
  recordingId: string;
  wallMs: number;
  elapsedUs: number;
  bootCount: number;
}

export interface JournalRecordingStarted extends JournalBase {
  kind: 'recording_started';
  source: AudioSourceName;
  sampleRate: 16000;
  route: Route;
  effects: Effects;
  location?: LocationPayload;
}

export interface JournalSegmentClosed extends JournalBase {
  kind: 'segment_closed';
  segmentId: string;
  index: number;
  /** Absolute file path (no file:// prefix) in app-private storage. */
  path: string;
  sha256: string;
  bytes: number;
  startElapsedUs: number;
  endElapsedUs: number;
  startWallMs: number;
  durationMs: number;
  peakDbfsX100: number;
  clippedSamples: number;
  hfRatio4kPpm: number;
  /** Subset of ['clipped', 'narrowband']. */
  flags: string[];
  /** True when the segment was finalised by recoverInterrupted() after a crash. */
  recovered: boolean;
}

/** The input is locked per recording; it only moves when the locked input disconnects or the system reroutes. */
export type RouteChangeReason = 'device_disconnected' | 'system';

/** The open segment was closed at the switch (segment_closed comes first), so each segment has one route. */
export interface JournalRouteChanged extends JournalBase {
  kind: 'route_changed';
  route: Route;
  reason: RouteChangeReason;
}

export interface JournalRecordingStopped extends JournalBase {
  kind: 'recording_stopped';
  reason: StopReason;
  location?: LocationPayload;
}

export interface JournalRecordingPaused extends JournalBase {
  kind: 'recording_paused';
}

export interface JournalRecordingResumed extends JournalBase {
  kind: 'recording_resumed';
}

/** Android silenced (or un-silenced) our capture because another app holds the microphone. */
export interface JournalCaptureState extends JournalBase {
  kind: 'capture_state';
  silenced: boolean;
}

export type JournalRecord =
  | JournalRecordingStarted
  | JournalSegmentClosed
  | JournalRouteChanged
  | JournalRecordingStopped
  | JournalRecordingPaused
  | JournalRecordingResumed
  | JournalCaptureState;

export interface UploadResult {
  status: number;
  body: string;
}

export interface LevelEvent {
  /** RMS of the last ~100 ms in dBFS x 100 (integer, <= 0). */
  rmsDbfsX100: number;
  elapsedMs: number;
}

export interface JournalEvent {
  journalSeq: number;
}

export type LiveEvent =
  | { type: 'state'; state: LiveState }
  | { type: 'partial'; text: string; utterance: number }
  | { type: 'final'; text: string; utterance: number; startMs: number; endMs: number };

/**
 * Live waveform while recording, about 25 Hz: one value per 40 ms block of captured audio
 * (max |sample| in dBFS x 100, integer, -9600 for digital zero). Usually one value per event;
 * more when events were coalesced. Not sent while paused.
 */
export interface WaveEvent {
  peaksDbfsX100: number[];
  /** Recorded milliseconds (pauses excluded) at the end of the last block. */
  recordedMs: number;
}

export interface CaptureEvent {
  silenced: boolean;
}

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'ended' | 'error';

/** About 20 Hz while playing, and on every state change. Positions span all files of playFiles(). */
export interface PlaybackEvent {
  state: PlaybackState;
  positionMs: number;
  durationMs: number;
  /** Index into the playFiles() list of the file being played. */
  index: number;
  error?: string;
}

export type FlNativeModuleEvents = {
  onLevel: (e: LevelEvent) => void;
  onJournal: (e: JournalEvent) => void;
  onLive: (e: LiveEvent) => void;
  onWave: (e: WaveEvent) => void;
  onCapture: (e: CaptureEvent) => void;
  onPlayback: (e: PlaybackEvent) => void;
  onInputs: (e: InputsEvent) => void;
};
