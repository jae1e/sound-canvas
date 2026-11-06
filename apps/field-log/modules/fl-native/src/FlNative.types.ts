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
  /** AudioDeviceInfo.getId(). */
  id: number;
  type: RouteType;
  productName: string;
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
  /** AudioDeviceInfo id from Capabilities.inputs; omitted = system default input. */
  preferredInputId?: number;
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
}

export type StopReason = 'user' | 'error' | 'interrupted' | 'recovered';

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

export interface JournalRouteChanged extends JournalBase {
  kind: 'route_changed';
  route: Route;
}

export interface JournalRecordingStopped extends JournalBase {
  kind: 'recording_stopped';
  reason: StopReason;
  location?: LocationPayload;
}

export type JournalRecord =
  | JournalRecordingStarted
  | JournalSegmentClosed
  | JournalRouteChanged
  | JournalRecordingStopped;

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

export type FlNativeModuleEvents = {
  onLevel: (e: LevelEvent) => void;
  onJournal: (e: JournalEvent) => void;
  onLive: (e: LiveEvent) => void;
};
