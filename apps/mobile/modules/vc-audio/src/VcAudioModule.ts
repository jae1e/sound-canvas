import { NativeModule, requireNativeModule } from 'expo';

import type {
  AnalyzeOptions,
  EngineState,
  TakeFile,
  BeatConfig,
  DevicesEvent,
  InputPreference,
  OutputPreference,
  StartTakeOptions,
  TakeAnalysis,
  TakeStarted,
  TakeStopped,
  VcAudioModuleEvents,
} from './VcAudio.types';

declare class VcAudioModule extends NativeModule<VcAudioModuleEvents> {
  // ---- devices (also emitted as onDevices on every connect/disconnect and preference change)
  getDevices(): Promise<DevicesEvent>;
  /** Rejects ERR_LOCKED while a take records. Persisted natively; applies to the running monitor at once. */
  setInputPreference(pref: InputPreference): Promise<DevicesEvent>;
  /** Rejects ERR_LOCKED while a take records. Applies to beat, test tone and playback at once. */
  setOutputPreference(pref: OutputPreference): Promise<DevicesEvent>;

  // ---- monitor: live capture and analysis without writing (graphs before recording)
  /**
   * Starts capture from the active input and emits onFrame. Call when a recorder screen gains focus.
   * Capture is non-privacy-sensitive (API 30+) so it never silences other apps.
   * Stops by itself when the app leaves the foreground (onMonitorState reason 'left_app').
   * Rejects ERR_PERMISSION without RECORD_AUDIO.
   */
  startMonitor(): Promise<void>;
  stopMonitor(): Promise<void>;

  // ---- takes (the monitor keeps running during and after a take)
  /** Starts writing. Starts the monitor if needed. Locks device preferences until the take stops. */
  startTake(options: StartTakeOptions): Promise<TakeStarted>;
  /** Also emitted as onTakeStopped (also for auto-stops: left_app, error). */
  stopTake(): Promise<TakeStopped>;
  /** Deletes the take's files (WAV and ASR copy). */
  deleteTake(path: string): Promise<void>;

  // ---- beat (plays on the selected output, USAGE_MEDIA; only after a user action)
  setBeat(config: BeatConfig): Promise<void>;
  startBeat(): Promise<void>;
  stopBeat(): Promise<void>;
  /** Engine clock now, ms: for tap tempo and latency calibration taps. */
  nowMs(): number;
  /** Plays `count` clicks at 90 BPM on the selected output and resolves with the scheduled heard times (ms, engine clock, no latency applied). */
  playCalibrationClicks(count: number): Promise<number[]>;
  /** Sets the latency offset (ms) of an output device key; the engine applies it to beat events and beatTimesMs. */
  setOutputLatency(key: string, latencyMs: number): Promise<void>;
  /** STREAM_MUSIC volume as 0..1 (the output sheet's slider). */
  getMediaVolume(): Promise<number>;
  setMediaVolume(volume: number): Promise<void>;
  /** A short 440 Hz tone on the selected output. */
  playTestTone(): Promise<void>;

  // ---- playback (selected output, USAGE_MEDIA, media volume; only after a user action)
  play(path: string, startMs?: number): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  seek(positionMs: number): Promise<void>;

  // ---- reconcile
  getState(): Promise<EngineState>;
  /** Marks a stopped take as stored by the app; it no longer appears in EngineState.unacknowledged. */
  ackTake(id: string): Promise<void>;
  listTakeFiles(): Promise<TakeFile[]>;

  // ---- analysis
  analyzeTake(path: string, options?: AnalyzeOptions): Promise<TakeAnalysis>;
}

export default requireNativeModule<VcAudioModule>('VcAudio');
