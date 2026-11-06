export interface MemoFacts {
  isRecording: boolean;
  segmentCount: number;
  /** Segments with a terminal transcript (done, including no speech). */
  segmentsDone: number;
  segmentsFailed: number;
  pendingEvents: number;
  pendingObjects: number;
  deleted?: boolean;
  /** Recording is paused (only meaningful with isRecording). */
  paused?: boolean;
  recordedMs?: number;
  /** Rows in the local DB for this memo's recordings. */
  recordingCount?: number;
  /** Local rows with no recording_stopped yet (stale when native is not recording this memo). */
  hasOpenRecordingRows?: boolean;
  /** Segments whose audio object the server holds. */
  segmentsUploaded?: number;
  /** Segments the server marked as no speech (a subset of segmentsDone). */
  segmentsNoSpeech?: number;
  /** The last sync attempt failed with a network error, or the server is unreachable. */
  offline?: boolean;
}

export interface MemoTrust {
  recording: boolean;
  /** Everything is stored on the phone (nothing is being written). */
  savedOnPhone: boolean;
  /** The server has every event and every object (it verified the hashes). */
  synced: boolean;
  /** Every segment has a final transcript. */
  transcribed: boolean;
  failed: boolean;
  /** The highest state reached. */
  current: 'recording' | 'saved' | 'synced' | 'transcribed' | 'deleted';
}

export function deriveMemoState(f: MemoFacts): MemoTrust {
  if (f.deleted) {
    return { recording: false, savedOnPhone: false, synced: false, transcribed: false, failed: false, current: 'deleted' };
  }
  const savedOnPhone = !f.isRecording;
  const synced = savedOnPhone && f.pendingEvents === 0 && f.pendingObjects === 0;
  const transcribed = synced && f.segmentCount > 0 && f.segmentsDone === f.segmentCount;
  const current = f.isRecording ? 'recording' : transcribed ? 'transcribed' : synced ? 'synced' : 'saved';
  return { recording: f.isRecording, savedOnPhone, synced, transcribed, failed: f.segmentsFailed > 0, current };
}

/** A local recording row that never got its stop while native is not recording this memo. */
export function hasStaleRecording(f: MemoFacts): boolean {
  return !!f.hasOpenRecordingRows && !f.isRecording;
}

export type StatusKind =
  | 'recording'
  | 'paused'
  | 'deleted'
  | 'uploadWaiting'
  | 'uploading'
  | 'transcribing'
  | 'failed'
  | 'noSpeech'
  | 'done'
  | 'saved';

export type StatusTone = 'red' | 'amber' | 'blue' | 'green' | 'muted';

export interface MemoStatus {
  kind: StatusKind;
  tone: StatusTone;
  glyph: string;
  /** Segments uploaded out of total, for the upload states. */
  uploaded: number;
  total: number;
  recordedMs: number;
}

const TONES: Record<StatusKind, [StatusTone, string]> = {
  recording: ['red', '●'],
  paused: ['amber', '⏸'],
  deleted: ['muted', '–'],
  uploadWaiting: ['amber', '⬆'],
  uploading: ['blue', '⬆'],
  transcribing: ['blue', '…'],
  failed: ['red', '✕'],
  noSpeech: ['muted', '–'],
  done: ['green', '✓'],
  saved: ['muted', '📝'],
};

/** The single status of a memo, in priority order. A stale open recording never counts as recording. */
export function deriveMemoStatus(f: MemoFacts): MemoStatus {
  const total = f.segmentCount;
  const pendingTranscripts = total - f.segmentsDone - f.segmentsFailed;
  let kind: StatusKind;
  if (f.isRecording && !f.paused) kind = 'recording';
  else if (f.isRecording) kind = 'paused';
  else if (f.deleted) kind = 'deleted';
  else if (f.pendingEvents > 0 || f.pendingObjects > 0) kind = f.offline ? 'uploadWaiting' : 'uploading';
  else if (pendingTranscripts > 0) kind = 'transcribing';
  else if (f.segmentsFailed > 0) kind = 'failed';
  else if (total > 0 && (f.segmentsNoSpeech ?? 0) === total) kind = 'noSpeech';
  else if (total > 0) kind = 'done';
  else kind = 'saved';
  const [tone, glyph] = TONES[kind];
  return { kind, tone, glyph, uploaded: f.segmentsUploaded ?? 0, total, recordedMs: f.recordedMs ?? 0 };
}

export interface ProgressStep {
  key: 'recorded' | 'saved' | 'synced' | 'transcribed';
  done: boolean;
  /** The step in progress (the first one not done), shown in bold. */
  current: boolean;
  /** While recording the first step reads "Recording". */
  inProgress: boolean;
}

/** The four-step progress line of the memo screen. */
export function memoProgress(f: MemoFacts): ProgressStep[] {
  const recorded = !f.isRecording && (f.segmentCount > 0 || (f.recordingCount ?? 0) > 0);
  const saved = !f.isRecording;
  const synced = saved && f.pendingEvents === 0 && f.pendingObjects === 0;
  const transcribed = synced && f.segmentCount > 0 && f.segmentsDone === f.segmentCount;
  const flags = [recorded, saved, synced, transcribed];
  const keys = ['recorded', 'saved', 'synced', 'transcribed'] as const;
  const firstOpen = flags.findIndex((x) => !x);
  const currentIdx = firstOpen === -1 ? 3 : firstOpen;
  return keys.map((key, i) => ({ key, done: flags[i], current: i === currentIdx, inProgress: key === 'recorded' && f.isRecording }));
}
