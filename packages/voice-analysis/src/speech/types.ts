/** Coach language; auto is resolved from the server transcript when available. */
export type SpeechLanguage = 'ko' | 'en' | 'auto';
export type SpeechKind = 'free' | 'plan' | 'impromptu' | 'interview' | 'script';
/** Plan section with optional millisecond budget; null budgets can be auto-split. */
export interface SpeechSection { id: string; name: string; keyPoints: string[]; budgetMs: number | null }
/** User-authored speaking exercise. */
export interface SpeechPlan { id: string; title: string; targetMs: number; lang: SpeechLanguage; sections: SpeechSection[]; script: string | null; kind: SpeechKind }
/** Server contract word shape, with absolute take-relative millisecond offsets. */
export interface SpeechWord { w: string; start_ms: number; end_ms: number }
/** Final transcript returned by the coach server. */
export interface SpeechTranscript { text: string; words: SpeechWord[]; language?: 'ko' | 'en' }
/** Native VcAudio TakeAnalysis subset consumed by the pure analysis package. */
export interface SpeechTakeAnalysis { durationMs: number; syllableTimesMs: number[]; pauses: { startMs: number; endMs: number }[]; pitchSpreadSemitones: number | null; rmsDb: number[]; tMs?: number[]; midi?: (number | null)[] }
export type PaceBand = { slowBelow: number; fastAbove: number };
/** Editable per-language filler configuration. */
export interface SpeechSettings { fillers?: Partial<Record<'ko' | 'en', string[]>>; paceBands?: Partial<Record<'ko' | 'en', PaceBand>>; keyPointThreshold?: number; syllablesPerEnglishWord?: number }
export type PaceStatus = 'slow' | 'good' | 'fast';
export interface SpeechMetricTile { value: number | null; unit: string; status: 'good' | 'caution'; deltaVsPrevious: number | null }
export interface SectionReport { id: string; name: string; budgetMs: number | null; actualMs: number; pace: number | null; paceStatus: PaceStatus | null; fillers: number; covered: string[]; missed: string[] }
export interface TranscriptMark { type: 'filler' | 'pause'; wordIndex?: number; durationMs?: number }
export interface SpeechReport { durationMs: number; targetMs: number; timeVerdict: 'under' | 'ok' | 'over'; tiles: { pace: SpeechMetricTile; fillers: SpeechMetricTile; pauses: SpeechMetricTile; intonation: SpeechMetricTile }; sections: SectionReport[]; nextAction: { code: string; params: Record<string, string | number> }; transcriptMarks: TranscriptMark[]; transcriptAvailable: boolean }
