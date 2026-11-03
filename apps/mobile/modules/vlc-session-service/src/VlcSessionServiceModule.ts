import { NativeModule, requireNativeModule } from 'expo';

import type {
  AudioDevice,
  CapabilityReport,
  LogSummary,
  ModelCatalogEntry,
  ModelStatus,
  InstalledModelSet,
  DeleteModelResult,
  DeleteUnusedResult,
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
  MusicVolume,
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
  ttsLabRunAll(koText: string, enText: string, outputDeviceId: number | null, onlyEngine: TtsLabEngineId | null): boolean;
  /** outputDeviceId: AudioDeviceInfo id from the preview's outputs list, or null for the system route. */
  ttsLabPreviewRoute(outputDeviceId: number | null): Promise<TtsLabRoutePreview>;
  /** STREAM_MUSIC volume (what the hardware keys change while the app is in the foreground). */
  ttsLabGetVolume(): MusicVolume;
  ttsLabSetVolume(percent: number): MusicVolume;
  ttsLabStop(): void;
  ttsLabSetMlKitPlayback(enabled: boolean, sampleRate: number): void;

  getModelStatus(): Promise<ModelStatus[]>;
  downloadModels(setIds: string[]): Promise<ModelStatus[]>;
  /** Every directory under the model root (including strays and partial downloads) with its size. */
  listInstalledModels(): Promise<InstalledModelSet[]>;
  /** Releases engines using the set, then deletes its directory. */
  deleteModelSet(setId: string): Promise<DeleteModelResult>;
  /** Deletes every installed set except the ones in keep. */
  deleteUnusedModels(keep: string[]): Promise<DeleteUnusedResult>;
  cancelModelDownload(): void;
  getModelCatalog(): ModelCatalogEntry[];

  getLogPath(): string;
  getLogSummary(): Promise<LogSummary>;
  clearLog(): Promise<void>;
  writeLogMarker(label: string): Promise<void>;
  getCapabilityReport(): Promise<CapabilityReport>;
}

export default requireNativeModule<VlcSessionServiceNative>('VlcSessionService');
