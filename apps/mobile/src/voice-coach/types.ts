import type { Lang, TakeMode } from '@vlc/voice-analysis';

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
  initialBlocks?: PracticeBlock[];
  onBlocksChange?: (blocks: PracticeBlock[]) => void;
  /** Notes keyed by take id; the screen keeps its own copy when this is omitted. */
  takeNotes?: Record<string, string>;
  onTakeNotesChange?: (takeId: string, note: string) => void;
  /** Called when a take file is created or deleted so the app can persist its row. */
  onTakeRecorded?: (take: { id: string; path: string; durationS: number; createdAtMs: number; blockId?: string }) => void;
  onTakeDeleted?: (takeId: string) => void;
}
