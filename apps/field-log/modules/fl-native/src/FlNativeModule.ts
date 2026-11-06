import { NativeModule, requireNativeModule } from 'expo';

import type {
  Capabilities,
  ClockReading,
  FlNativeModuleEvents,
  AppInfo,
  AutoStopOptions,
  InputPreference,
  InputsEvent,
  JournalRecord,
  LocationPayload,
  RecorderStatus,
  RecordingStarted,
  StartRecordingOptions,
  UploadResult,
} from './FlNative.types';

declare class FlNativeModule extends NativeModule<FlNativeModuleEvents> {
  getCapabilities(): Promise<Capabilities>;
  /** Synchronous clock reading for events created in JS. */
  clock(): ClockReading;
  /**
   * Starts the microphone foreground service and the capture. Call from a user action while the
   * app is in the foreground. Needs RECORD_AUDIO (and POST_NOTIFICATIONS for the notification).
   * Rejects with code ERR_ALREADY_RECORDING, ERR_PERMISSION or ERR_AUDIO_START.
   */
  startRecording(options: StartRecordingOptions): Promise<RecordingStarted>;
  /** Closes the open segment (journal: segment_closed, then recording_stopped reason 'user'). */
  stopRecording(location?: LocationPayload): Promise<void>;
  getStatus(): Promise<RecorderStatus>;
  /**
   * Sets the input preference (persisted natively) for the next recording. A running recording keeps its
   * locked input; rejects with ERR_BUSY_RECORDING while a session (recording or paused) exists.
   * Resolves with the resulting InputsEvent (also emitted as onInputs).
   */
  setInputPreference(preference: InputPreference): Promise<InputsEvent>;
  /** Sets the automatic-stop behaviour (persisted natively); call on app start and on change. */
  setAutoStop(options: AutoStopOptions): Promise<void>;
  /** Current inputs, preference and resolved selection, without changing anything. */
  getInputs(): Promise<InputsEvent>;
  /**
   * Closes the open segment (segment_closed), journals recording_paused and releases the
   * microphone; the foreground service stays with a "Paused" notification. No-op when paused.
   */
  pauseRecording(): Promise<void>;
  /** Re-acquires the microphone, journals recording_resumed; segment indexes continue. */
  resumeRecording(): Promise<void>;
  /** Peak level per bucket (dBFS x 100, -9600 for silence) across a WAV file, for drawing. */
  getWaveform(pathOrUri: string, buckets: number): Promise<number[]>;
  /**
   * Plays WAV files back to back, from startMs across the whole list. Media attributes
   * (USAGE_MEDIA), system output route and media volume; never forces the loudspeaker.
   * Call only from a user action. Replaces any current playback.
   */
  playFiles(pathsOrUris: string[], startMs?: number): Promise<void>;
  pausePlayback(): Promise<void>;
  resumePlayback(): Promise<void>;
  stopPlayback(): Promise<void>;
  seekPlayback(positionMs: number): Promise<void>;
  /** This app's package, versionName and versionCode. */
  getAppInfo(): Promise<AppInfo>;
  /**
   * Downloads url (OkHttp, with the given headers) into the app cache as `updates/<fileName>`, resuming with
   * `Range` when a partial file exists, emitting onDownload. Verifies sha256 (lowercase hex) at the end;
   * on mismatch it deletes the file and rejects with ERR_HASH. Resolves with the absolute path.
   */
  downloadFile(id: string, url: string, headers: Record<string, string>, fileName: string, sha256: string): Promise<string>;
  cancelDownload(id: string): Promise<void>;
  /** True when the user allowed this app to install packages (PackageManager.canRequestPackageInstalls). */
  canInstallPackages(): Promise<boolean>;
  /** Opens Settings → Install unknown apps for this app. */
  openInstallPermissionSettings(): Promise<void>;
  /** Starts the system installer for an APK under the app cache (FileProvider URI). Resolves once the installer is launched. */
  installApk(path: string): Promise<void>;
  /** Deletes downloaded APKs in the cache whose versionCode <= this app's (or all when all = true). Returns the number deleted. */
  cleanupUpdates(all?: boolean): Promise<number>;
  /** Journal records with journalSeq > afterJournalSeq, in order. */
  readJournal(afterJournalSeq: number): Promise<JournalRecord[]>;
  /**
   * Finalises recordings left open by a crash or process kill: repairs WAV headers, hashes the
   * partial segments, appends segment_closed (recovered: true) and recording_stopped (reason
   * 'recovered'). Returns the number of segments recovered. Call once at app start.
   */
  recoverInterrupted(): Promise<number>;
  /** SHA-256 (lowercase hex) of a file. Accepts a plain path or a file:// URI. */
  sha256File(pathOrUri: string): Promise<string>;
  /** HTTP PUT of a file's raw bytes (OkHttp). Accepts a plain path or a file:// URI. */
  uploadFile(
    url: string,
    pathOrUri: string,
    contentType: string,
    headers: Record<string, string>,
  ): Promise<UploadResult>;
}

export default requireNativeModule<FlNativeModule>('FlNative');
