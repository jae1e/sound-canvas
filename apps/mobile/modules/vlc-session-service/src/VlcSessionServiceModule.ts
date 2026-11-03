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
