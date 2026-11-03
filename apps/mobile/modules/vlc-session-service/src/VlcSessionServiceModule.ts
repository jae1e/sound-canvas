import { NativeModule, requireNativeModule } from 'expo';

import type {
  AudioDevice,
  CapabilityReport,
  LogSummary,
  ModelCatalogEntry,
  ModelStatus,
  PriorityName,
  RouteState,
  SessionOptions,
  SessionStateName,
  SpeechOutputMode,
  SpeechOutputRoute,
  TtsLabEngineId,
  TtsLabEngineInfo,
  TtsLabPrepareResult,
  TtsLabRoutePreview,
  TtsLabSpeakOptions,
  TtsLabVoice,
  VlcSessionServiceModuleEvents,
} from './VlcSessionService.types';

declare class VlcSessionServiceNative extends NativeModule<VlcSessionServiceModuleEvents> {
  startSession(options: SessionOptions): Promise<{ state: SessionStateName }>;
  stopSession(): Promise<{ state: SessionStateName }>;
  getSessionState(): SessionStateName;
  setBargeIn(enabled: boolean): Promise<void>;

  /** Synchronous (no queue hop). Returns the utterance id, or null if skipped. */
  speak(text: string, priority: PriorityName, cueId: string | null): string | null;
  stopSpeaking(): void;
  scheduleCue(id: string, atEpochMs: number, fallbackText: string): void;
  cancelCue(id: string): void;
  /** Synchronous. Returns false if the cue is unknown, not fired yet, or already acked. */
  ackCue(id: string): boolean;

  listCommunicationDevices(): Promise<AudioDevice[]>;
  setCommunicationDevice(id: number): Promise<{ ok: boolean; reason?: string; route?: RouteState }>;
  clearCommunicationDevice(): Promise<{ ok: boolean; route: RouteState }>;
  getRouteState(): Promise<RouteState>;

  /** 'speaker' forces speech to the phone speaker (see SPIKE.md for how and the trade-offs). Default 'auto'. */
  setSpeechOutput(mode: SpeechOutputMode): Promise<SpeechOutputRoute>;
  getSpeechOutputRoute(): Promise<SpeechOutputRoute>;

  ttsLabEngines(): TtsLabEngineInfo[];
  /** Binds / loads the engine for a BCP-47 locale tag such as "ko-KR". */
  ttsLabPrepare(engine: TtsLabEngineId, locale: string): Promise<TtsLabPrepareResult>;
  ttsLabVoices(engine: TtsLabEngineId, locale: string): Promise<TtsLabVoice[]>;
  /** Downloads one ML Kit voice; progress arrives as ttsLabProgress events. */
  ttsLabDownloadVoice(voice: string): Promise<{ ok: boolean; error?: string }>;
  /** Returns a request id; results arrive as ttsLabEvent. voice: engine specific voice id or null. */
  ttsLabSpeak(engine: TtsLabEngineId, text: string, locale: string, voice: string | null, options: TtsLabSpeakOptions): string;
  /** Starts the sequential all-engines self-test; returns false if one is already running. Results arrive as ttsLabSelfTest events. */
  ttsLabRunAll(koText: string, enText: string): boolean;
  ttsLabPreviewRoute(output: SpeechOutputMode): Promise<TtsLabRoutePreview>;
  ttsLabStop(): void;
  ttsLabSetMlKitPlayback(enabled: boolean, sampleRate: number): void;

  getModelStatus(): Promise<ModelStatus[]>;
  downloadModels(setIds: string[]): Promise<ModelStatus[]>;
  cancelModelDownload(): void;
  getModelCatalog(): ModelCatalogEntry[];

  getLogPath(): string;
  getLogSummary(): Promise<LogSummary>;
  clearLog(): Promise<void>;
  writeLogMarker(label: string): Promise<void>;
  getCapabilityReport(): Promise<CapabilityReport>;
}

export default requireNativeModule<VlcSessionServiceNative>('VlcSessionService');
