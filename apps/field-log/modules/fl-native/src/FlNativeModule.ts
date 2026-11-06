import { NativeModule, requireNativeModule } from 'expo';

import type {
  Capabilities,
  ClockReading,
  FlNativeModuleEvents,
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
