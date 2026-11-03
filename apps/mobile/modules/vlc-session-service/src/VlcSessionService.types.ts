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
  /** Session STT: "platform" (on-device SpeechRecognizer, default) or "sherpa" (own AudioRecord, dev/fallback). */
  sttEngine?: 'platform' | 'sherpa';
  /** Platform STT only: fall back to sherpa automatically when recognition stops working. Default true. */
  sttAutoFallback?: boolean;
  /** Product mode that owns the session: "work" (default), "travel" or "coach". Shown in the notification and the log. */
  mode?: 'work' | 'travel' | 'coach';
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
export type PipelineStateEvent = { sttEnabled: boolean; loadMs: number; engine?: 'platform' | 'sherpa' };
/** The session switched STT engine (platform -> sherpa) because recognition stopped working; `reason` is also logged as stt_fallback. */
export type SessionSttEngineEvent = { engine: 'sherpa'; reason: string };
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
  /** Platform STT only. */
  engine?: 'platform' | 'sherpa';
  /** Platform STT only: language decided by detection / script / prior. */
  lang?: SttLang;
  /** Platform STT only: n-best list, top hypothesis first (includes `text`). */
  alternatives?: string[];
  timing?: SttTiming;
};
export type EchoSuppressedEvent = { seq: number; text: string };
export type TtsStartEvent = { utteranceId: string; text: string; cueId: string | null; speakToStartMs: number; routeLabel?: string; engine: SessionTtsEngine };
export type TtsDoneEvent = { utteranceId: string; outcome: string; cueId: string | null; engine: SessionTtsEngine };

/** Engine that spoke a session utterance. */
export type SessionTtsEngine = 'supertonic' | 'platform';
export type SessionTtsRequested = 'auto' | 'platform' | 'supertonic';
export type SessionTtsConfig = {
  engine: SessionTtsRequested;
  /** Supertonic speaker id 0-9 (F1-F5, M1-M5). Clamped. */
  voice: number;
  /** Supertonic diffusion steps 1-32. Clamped. */
  steps: number;
};
export type SessionTtsStatus = {
  requested: SessionTtsRequested;
  supertonicModelReady: boolean;
  supertonicLoaded: boolean;
  supertonicLoading: boolean;
  active: SessionTtsEngine;
  lastError: string | null;
};
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
  phase: 'downloading' | 'verified' | 'skipped' | 'extracting';
  fileBytes: number;
  fileTotalBytes: number;
  overallBytes: number;
  overallTotalBytes: number;
  overallFraction: number;
};

// ---- Speech output route + TTS lab -------------------------------------------------------------

export type SpeechOutputMode = 'auto' | 'speaker';

/** Where speech goes (AudioManager.getAudioDevicesForAttributes + full output list). */
export type SpeechOutputRoute = {
  /** Why it was reported: tts_start, device_added, device_removed, mode_change, query. */
  reason: string;
  usage: string;
  mode: SpeechOutputMode;
  /** Mode actually in force (the TTS lab can override the global mode per utterance). */
  effectiveMode?: SpeechOutputMode;
  /** Who holds MODE_IN_COMMUNICATION / the communication device: speech_output, route_picker, unknown_external, none. */
  commOwner?: string;
  /** For example "Bluetooth A2DP \u2014 Galaxy Buds3". */
  label: string;
  /** True when the device is the phone speaker or the communication device the user selected. */
  ok: boolean;
  warning: string | null;
  /** Devices the platform would route a track with the usage above to. */
  planned: AudioDevice[];
  /** Device an in-process AudioTrack reported via getRoutedDevice(), when the engine owns the track. */
  trackRouted: AudioDevice | null;
  allOutputs: AudioDevice[];
  communicationDevice: AudioDevice | null;
  audioMode: number;
  utteranceId?: string;
  requestId?: string;
  engine?: string;
};

export type TtsLabEngineId = 'platform-google' | 'platform-samsung' | 'mlkit' | 'supertonic' | 'kitten' | 'kokoro';

export type TtsLabEngineInfo = {
  id: TtsLabEngineId;
  label: string;
  inProcess: boolean;
  supportsKo: boolean;
  supportsEn: boolean;
};

export type TtsLabVoice = {
  name: string;
  label: string;
  networkRequired?: boolean;
  installed?: boolean;
  status?: string;
};

/** Free-form engine status for the UI (ok/error plus engine specific fields). */
export type TtsLabPrepareResult = { ok: boolean; error?: string | null; needsDownload?: string } & Record<string, unknown>;

export type MusicVolume = { volume: number; max: number; percent: number };

export type TtsLabOutputDevice = AudioDevice & { label: string };

/** Side-effect free route preview for a lab output selection (null id = system route). */
export type TtsLabRoutePreview = {
  /** "system" or the device id as text. */
  output: string;
  /** Human readable selection, also what is logged as outputSelection. */
  selection: string;
  /** Device the selection plays on (the selected device, or the system route). */
  label: string;
  /** What the OS would pick right now for media speech. */
  systemRoute: string;
  ok: boolean;
  warning: string | null;
  /** Set when a specific device is selected: platform engines ignore it and follow the system route. */
  platformNote: string | null;
  audioMode: number;
  communicationDevice: AudioDevice | null;
  commOwner: string;
  /** Connected outputs the picker can offer (phone speaker, Bluetooth A2DP / LE, wired, USB). */
  outputs: TtsLabOutputDevice[];
  allOutputs: AudioDevice[];
  music: MusicVolume;
};

/** Options for ttsLabSpeak. outputDeviceId omitted/null = system route; steps is Supertonic only. */
export type TtsLabSpeakOptions = { outputDeviceId?: number | null; steps?: number };

/** One row of the "Run all engines" self-test (also logged natively as tts_lab_selftest). */
export type TtsLabSelfTestRow = {
  engine: TtsLabEngineId;
  lang: 'ko' | 'en';
  ok: boolean;
  error?: string | null;
  modelMB?: number;
  prepareMs?: number;
  firstAudioMs?: number | null;
  genMs?: number | null;
  rtf?: number | null;
  audioDurationMs?: number | null;
  totalMs?: number;
  routeLabel?: string | null;
  routeOk?: boolean | null;
  routedDevice?: AudioDevice | null;
  voice?: string | null;
  outputSelection?: string;
};
export type TtsLabSelfTestDone = { count: number; okCount: number; failed: string[]; cancelled: boolean; outputSelection?: string };

/** Emitted whenever a prepare finishes (also when started from Speak). */
export type TtsLabPreparedEvent = { engine: TtsLabEngineId; locale: string; result: TtsLabPrepareResult };

export type TtsLabEvent = {
  requestId: string;
  engine: TtsLabEngineId;
  phase: 'requested' | 'first_audio' | 'done' | 'error';
  outputSelection?: string;
  /** phase first_audio: request -> first audio, ms. */
  latencyMs?: number;
  routeLabel?: string;
  routeOk?: boolean;
  routeWarning?: string | null;
  totalMs?: number;
  outcome?: string;
  message?: string | null;
  /** Engine stats: genMs, audioSec, rtf, firstChunkMs, sampleRate, chunks, pcmBytes, method... */
  info?: Record<string, unknown>;
};

export type TtsLabProgressEvent = {
  engine: string;
  voice: string;
  phase: 'started' | 'progress';
  bytes: number;
  totalBytes: number;
};

export type VlcSessionServiceModuleEvents = {
  sttState: (e: SttStateEvent) => void;
  sttPartial: (e: SttPartialEvent) => void;
  sttFinal: (e: SttFinalEvent) => void;
  sttError: (e: SttErrorEvent) => void;
  sttLevel: (e: SttLevelEvent) => void;
  sttLangDetect: (e: SttLangDetectEvent) => void;
  sttMicRoute: (e: SttMicRouteEvent) => void;
  sttSupport: (e: SttSupport) => void;
  sttDownload: (e: SttDownloadEvent) => void;
  speechOutputRoute: (e: SpeechOutputRoute) => void;
  ttsLabEvent: (e: TtsLabEvent) => void;
  ttsLabPrepared: (e: TtsLabPreparedEvent) => void;
  ttsLabSelfTest: (e: TtsLabSelfTestRow) => void;
  ttsLabSelfTestDone: (e: TtsLabSelfTestDone) => void;
  ttsLabProgress: (e: TtsLabProgressEvent) => void;
  sessionState: (e: SessionStateEvent) => void;
  sessionError: (e: SessionErrorEvent) => void;
  pipelineState: (e: PipelineStateEvent) => void;
  sessionSttEngine: (e: SessionSttEngineEvent) => void;
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

export type InstalledModelSet = {
  setId: string;
  title: string;
  bytes: number;
  files: number;
  inCatalog: boolean;
  ready: boolean;
  partial: boolean;
};

export type DeleteModelResult = { setId: string; bytesFreed: number; deleted: boolean };
export type DeleteUnusedResult = { totalBytes: number; bytesFreed: number; kept: string[]; deleted: string[]; results: DeleteModelResult[] };

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

// ---- STT lab ----------------------------------------------------------------------------------

export type SttEngineId = 'platform' | 'sherpa';
export type SttLangMode = 'auto' | 'ko' | 'en';
export type SttMicMode = 'phone' | 'bluetooth';
export type SttLang = 'ko' | 'en';

export type SttStartOptions = {
  engine: SttEngineId;
  lang: SttLangMode;
  mic: SttMicMode;
  /** Platform engine only: request EXTRA_SEGMENTED_SESSION on API 33+ (otherwise a restart loop is used). Default true. */
  segmented?: boolean;
};

/** idle -> starting -> loading (sherpa) -> listening -> processing -> ... -> stopped | error */
export type SttStateEvent = {
  state: string;
  detail: Record<string, unknown>;
  engine: SttEngineId | null;
  /** Platform engine: "on_device" or "system_prefer_offline". */
  path: string | null;
};
export type SttPartialEvent = { seq: number; text: string; atEpochMs: number };
export type SttFinalEvent = {
  seq: number;
  text: string;
  lang: SttLang;
  /** platform_detection | dual_decode | script | requested | prior_retry */
  detectedBy: string;
  confidence: number | null;
  engine: SttEngineId;
  path: string;
  requestedLang: SttLangMode;
  mic: SttMicMode;
  /** onEndOfSpeech (platform) / VAD end (sherpa) -> final, ms; null without an end event. Often ~0 on the platform recognizer. */
  endToFinalMs: number | null;
  /** Speech begin -> first partial, ms (same as timing.beginToFirstPartialMs). */
  firstPartialMs: number | null;
  timing: SttTiming;
  partials: number;
  platformDetectionFired: boolean | null;
  segmentedSeen: boolean | null;
  priorBefore: SttLang;
  nextLang: SttLang | null;
  nextReason: string | null;
  finalAtEpochMs: number;
  details: Record<string, unknown>;
};
/**
 * Per-utterance timestamps (SystemClock.elapsedRealtime, ms) and derived latencies. Reset per utterance; a derived value is
 * null when an input is missing or the difference would be negative.
 */
export type SttTiming = {
  listenStartRt: number | null;
  readyRt: number | null;
  speechBeginRt: number | null;
  firstPartialRt: number | null;
  lastPartialRt: number | null;
  speechEndRt: number | null;
  finalRt: number;
  readyMs: number | null;
  beginToFirstPartialMs: number | null;
  endToFinalMs: number | null;
  lastPartialToFinalMs: number | null;
  beginToFinalMs: number | null;
  partials: number;
  /** Callbacks ignored because they arrived out of order (for example onEndOfSpeech after the final). */
  lateEvents: number;
};
export type SttErrorEvent = { code: string; message: string; recoverable: boolean; atEpochMs: number };
export type SttLevelEvent = { level: number };
export type SttLangDetectEvent = { source: string; atEpochMs: number } & Record<string, unknown>;
export type SttMicRouteEvent = { kind: string; atEpochMs: number } & Record<string, unknown>;
export type SttDownloadEvent = { locale: string; event: string; percent?: number };

export type SttSupport = {
  sdk: number;
  recognitionAvailable: boolean;
  onDeviceAvailable: boolean;
  recognizerPath: 'on_device' | 'system_prefer_offline';
  defaultService: string | null;
  languageDetectionApi: boolean;
  segmentedSessionApi: boolean;
  supportCheck?: string;
  installedOnDevice?: string[];
  supportedOnDevice?: string[];
  pendingOnDevice?: string[];
  onlineLanguages?: string[];
  koInstalled?: boolean;
  enInstalled?: boolean;
  koSupported?: boolean;
  enSupported?: boolean;
  sherpaKoReady: boolean;
  sherpaEnReady: boolean;
  sherpaVadReady: boolean;
  bluetoothInput: AudioDevice | null;
  bluetoothCommunicationDevice: AudioDevice | null;
  sessionRunning: boolean;
};

export type SttDownloadResult = { ok: boolean; locale: string; outcome?: string; error?: string; reason?: string };
