import type { Lang, NoteStyle, TakeMode, TakeSummary } from '@vlc/voice-analysis';

export interface PracticeBlock {
  id: string;
  name: string;
  durationS: number;
  repeats: number;
  restS: number;
  /** Text as typed: "A3" or "A3 C4:2 E4". Empty = no target. */
  target: string;
  mode: TakeMode;
}

export interface VoiceCoachScreenProps {
  /** UI language and the language the feedback is written in. */
  lang: Lang;
  /**
   * Called once after each take with the short feedback text. The screen never speaks it; route it through the
   * session TTS if wanted. Never called while a take is recording.
   */
  onFeedback?: (text: string, lang: Lang) => void;
  /** Latest STT transcript of the current/last take (speech mode, filler counting). */
  transcript?: string;
  /** Word timestamps from STT for the same utterance (speech mode, speaking rate). Seconds relative to the take start. */
  words?: { text: string; start: number; end: number }[];
  /** Language of the speech for the speaking-rate unit and the filler list. Defaults to `lang`. */
  speechLang?: Lang;
  /** Initial note-name style (scientific B2, solfège 시₂, letter B). Defaults to scientific. */
  initialNoteStyle?: NoteStyle;
  onNoteStyleChange?: (style: NoteStyle) => void;
  initialBlocks?: PracticeBlock[];
  onBlocksChange?: (blocks: PracticeBlock[]) => void;
  /** Notes keyed by take id; the screen keeps its own copy when this is omitted. */
  takeNotes?: Record<string, string>;
  onTakeNotesChange?: (takeId: string, note: string) => void;
  /** Called when a take file is created or deleted so the app can persist its row. */
  onTakeRecorded?: (take: { id: string; path: string; durationS: number; createdAtMs: number; blockId?: string }) => void;
  onTakeDeleted?: (takeId: string) => void;
  /** Called after a take was analysed, with its summary (metrics, speech metrics, feedback lines) for persistence. */
  onTakeAnalyzed?: (take: { id: string; blockId?: string; summary: TakeSummary }) => void;
  /**
   * Hands the app an imperative handle for voice commands (start take, stop, play back, same block again), or null on
   * unmount. Commands are rejected (resolve false) while they do not apply, for example "stop" without a take.
   */
  onControls?: (controls: VoiceCoachControls | null) => void;
  onRecordingChange?: (recording: boolean) => void;
}

export interface VoiceCoachControls {
  startTake(): Promise<boolean>;
  stopTake(): Promise<boolean>;
  /** Plays the latest take. Only ever called in response to an explicit user command. */
  playLast(): Promise<boolean>;
  /** Runs the selected practice block again from its first repeat. */
  sameBlockAgain(): Promise<boolean>;
  /** Id of the most recent take of this screen's lifetime (or the newest on disk), if any. */
  lastTakeId(): string | null;
}
