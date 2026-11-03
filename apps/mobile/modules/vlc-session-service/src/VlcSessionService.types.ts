/** Typed surface of the native `VlcSessionService` Expo module (Android only for now). */

export type SessionStateName = 'starting' | 'running' | 'stopped' | 'error';

export type SessionOptions = {
  /** "ko" or "en": selects STT model set and default TTS locale. Default "ko". */
  language?: 'ko' | 'en';
  /** Emit finals while TTS speaks and stop TTS on speech start. Default false (half-duplex). */
  bargeIn?: boolean;
  /** Start without STT if models are not downloaded. Default true. */
  allowMissingModels?: boolean;
  /** Default true. */
  locationEnabled?: boolean;
};

export type AudioDevice = {
  id: number;
  type: number;
  typeName: string;
  productName: string | null;
  isSource: boolean;
  isSink: boolean;
};

export type RouteState = {
  audioMode: number;
  /** Device chosen by setCommunicationDevice (Android 12+), or null. */
  communicationDevice: AudioDevice | null;
  /** Device the AudioRecord is actually routed to, or null when not recording. */
  recordRoutedDevice: AudioDevice | null;
};

export type PriorityName = 'normal' | 'high' | 'cue';

// ---- Events ---------------------------------------------------------------------------------

export type SessionStateEvent = { state: SessionStateName; detail: string | null };
export type SessionErrorEvent = { code: string; message: string };
export type PipelineStateEvent = { sttEnabled: boolean; loadMs: number };
export type AudioLevelEvent = { rms: number; peak: number };
export type SpeechStartEvent = { seq: number; atEpochMs: number; duringTts: boolean; suppressed: boolean };
export type PartialTranscriptEvent = { seq: number; text: string; atEpochMs: number };
export type FinalTranscriptEvent = {
  seq: number;
  text: string;
  /** Estimated utterance start/end (epoch ms). End = VAD decision time minus trailing silence. */
  startEpochMs: number;
  endEpochMs: number;
  vadEndDetectedEpochMs: number;
  finalEpochMs: number;
  /** VAD end-of-speech decision -> final text. Excludes the VAD trailing silence (see trailingSilenceMs). */
  endpointLatencyMs: number;
  trailingSilenceMs: number;
  duringTts: boolean;
  forcedEnd: boolean;
};
export type EchoSuppressedEvent = { seq: number; text: string };
export type TtsStartEvent = { utteranceId: string; text: string; cueId: string | null; speakToStartMs: number };
export type TtsDoneEvent = { utteranceId: string; outcome: string; cueId: string | null };
export type CueDueEvent = {
  id: string;
  atEpochMs: number;
  firedEpochMs: number;
  /** Native fire time minus scheduled time. */
  driftMs: number;
  firedBy: 'handler' | 'alarm_backup';
};
export type CueAudibleEvent = { id: string; source: 'js' | 'native_fallback'; fireToAudibleMs: number };
export type LocationEvent = {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  provider: string | null;
  fixEpochMs: number;
  receivedEpochMs: number;
  count: number;
};
export type LocationGapEvent = { gapMs: number };
export type RouteChangedEvent = {
  change: 'added' | 'removed' | 'recordRoute';
  devices: AudioDevice[];
  route: RouteState;
};
export type ModelDownloadProgressEvent = {
  setId: string;
  file: string;
  phase: 'downloading' | 'verified' | 'skipped';
  fileBytes: number;
  fileTotalBytes: number;
  overallBytes: number;
  overallTotalBytes: number;
  overallFraction: number;
};

export type VlcSessionServiceModuleEvents = {
  sessionState: (e: SessionStateEvent) => void;
  sessionError: (e: SessionErrorEvent) => void;
  pipelineState: (e: PipelineStateEvent) => void;
  audioLevel: (e: AudioLevelEvent) => void;
  speechStart: (e: SpeechStartEvent) => void;
  partialTranscript: (e: PartialTranscriptEvent) => void;
  finalTranscript: (e: FinalTranscriptEvent) => void;
  echoSuppressed: (e: EchoSuppressedEvent) => void;
  ttsStart: (e: TtsStartEvent) => void;
  ttsDone: (e: TtsDoneEvent) => void;
  cueDue: (e: CueDueEvent) => void;
  cueAudible: (e: CueAudibleEvent) => void;
  location: (e: LocationEvent) => void;
  locationGap: (e: LocationGapEvent) => void;
  routeChanged: (e: RouteChangedEvent) => void;
  modelDownloadProgress: (e: ModelDownloadProgressEvent) => void;
};

// ---- Return types ---------------------------------------------------------------------------

export type ModelStatus = {
  id: string;
  title: string;
  ready: boolean;
  totalBytes: number;
  dir: string;
  files: { name: string; url: string; sizeBytes: number; present: boolean }[];
};

export type ModelCatalogEntry = {
  id: string;
  title: string;
  totalBytes: number;
  files: { name: string; url: string; sizeBytes: number; sha256: string }[];
};

export type TtsLanguageInfo = {
  availabilityCode: number;
  voiceCount: number;
  offlineInstalledVoices: string[];
  offlineInstalled: boolean;
};

export type CapabilityReport = {
  model: string;
  manufacturer: string;
  device: string;
  sdkInt: number;
  release: string;
  securityPatch: string;
  supportedAbis: string[];
  speechRecognizerAvailable: boolean;
  onDeviceRecognitionAvailable: boolean | null;
  aecAvailable: boolean;
  noiseSuppressorAvailable: boolean;
  playServicesStatus: number;
  ignoringBatteryOptimizations: boolean;
  tts: {
    defaultEngine: string | null;
    engines: {
      name: string;
      label: string;
      isDefault?: boolean;
      initFailed?: boolean;
      'ko-KR'?: TtsLanguageInfo;
      'en-US'?: TtsLanguageInfo;
    }[];
  };
  communicationDevices: AudioDevice[];
  models: { id: string; ready: boolean }[];
  mlKitGenAi: string;
};

type Percentiles = { count: number; min?: number; p50?: number; p90?: number; p95?: number; max?: number };

export type LogSummary = {
  spanMs: number;
  eventCounts: Record<string, number>;
  endpointLatencyMs: Percentiles;
  cueNativeFireDriftMs: Percentiles;
  cueJsAckMs: Percentiles;
  cueFireToAudibleMs: Percentiles;
  cueFallbackSpoken: number;
  ttsSpeakToStartMs: Percentiles;
  locationFixCount: number;
  locationGapsOver5s: number;
  locationMaxGapMs: number;
  locationAccuracyM: Percentiles;
  batteryFirstPct: number | null;
  batteryLastPct: number | null;
  batteryMaxTempC: number | null;
  recorderRestarts: number;
  errors: number;
};
