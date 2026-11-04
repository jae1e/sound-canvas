import { hzToMidi } from './notes';
import type { Lang } from './types';

/** How notes are written: scientific "B2", solfège "시₂" / "Ti₂", or the letter only "B". */
export type NoteStyle = 'scientific' | 'solfege' | 'letter';
export const NOTE_STYLES: NoteStyle[] = ['scientific', 'solfege', 'letter'];

export interface NoteParts {
  /** Pitch class 0..11, C = 0. */
  pc: number;
  /** Scientific octave number; the octave changes at C (B2 is just below C3). */
  octave: number;
}

export interface NameOptions {
  /** Which spelling to use for black keys. Default 'sharp'. */
  accidental?: 'sharp' | 'flat';
  /** Korean only: spoken form ("올림 도") instead of the written form ("도#"). Default false. */
  spoken?: boolean;
}

const LETTERS_SHARP = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
const LETTERS_FLAT = ['C', 'D', 'D', 'E', 'E', 'F', 'G', 'G', 'A', 'A', 'B', 'B'];
const BLACK = new Set([1, 3, 6, 8, 10]);
const SOLFEGE_KO = ['도', '레', '미', '파', '솔', '라', '시'];
const SOLFEGE_EN = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti'];
const LETTER_INDEX: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const SUBSCRIPT = '₀₁₂₃₄₅₆₇₈₉';

export function noteParts(midi: number): NoteParts {
  const m = Math.round(midi);
  return { pc: ((m % 12) + 12) % 12, octave: Math.floor(m / 12) - 1 };
}
export function isBlackKey(midi: number): boolean {
  return BLACK.has(noteParts(midi).pc);
}
/** Octave number as small subscript digits ("₂"; negative octaves get a "₋" prefix). */
export function subscriptOctave(octave: number): string {
  const s = String(Math.abs(octave)).replace(/\d/g, (d) => SUBSCRIPT[Number(d)]!);
  return octave < 0 ? `₋${s}` : s;
}

/** Letter name without octave: "C", "C#", "Db". */
export function letterName(midi: number, o: NameOptions = {}): string {
  const { pc } = noteParts(midi);
  const flat = o.accidental === 'flat';
  const base = (flat ? LETTERS_FLAT : LETTERS_SHARP)[pc]!;
  return BLACK.has(pc) ? base + (flat ? 'b' : '#') : base;
}

/** Solfège syllable without octave. Korean: "도#" or spoken "올림 도"; flats "시b" / "내림 시". English: "Do#". */
export function solfegeName(midi: number, lang: Lang, o: NameOptions = {}): string {
  const { pc } = noteParts(midi);
  const flat = o.accidental === 'flat';
  const idx = LETTER_INDEX[(flat ? LETTERS_FLAT : LETTERS_SHARP)[pc]!]!;
  const syl = (lang === 'ko' ? SOLFEGE_KO : SOLFEGE_EN)[idx]!;
  if (!BLACK.has(pc)) return syl;
  if (lang === 'ko' && o.spoken) return `${flat ? '내림' : '올림'} ${syl}`;
  return syl + (flat ? 'b' : '#');
}

/** Scientific name with octave, e.g. "B2", "C#4". */
export function scientificName(midi: number, o: NameOptions = {}): string {
  return `${letterName(midi, o)}${noteParts(midi).octave}`;
}

/** The note written in the given style. Solfège carries the octave as a subscript ("시₂"). */
export function formatNote(midi: number, style: NoteStyle, lang: Lang, o: NameOptions = {}): string {
  switch (style) {
    case 'scientific':
      return scientificName(midi, o);
    case 'letter':
      return letterName(midi, o);
    case 'solfege':
      return `${solfegeName(midi, lang, o)}${subscriptOctave(noteParts(midi).octave)}`;
  }
}

/** The two spellings of a black key ("C#4" / "Db4"); white keys return the same name twice. */
export function enharmonics(midi: number): { sharp: string; flat: string } {
  return { sharp: scientificName(midi, { accidental: 'sharp' }), flat: scientificName(midi, { accidental: 'flat' }) };
}

/**
 * Plain label for the live view: the note in the chosen style, a companion syllable, then Hz.
 * "B2 · 시 · 123 Hz" (scientific), "B · 시 · 123 Hz" (letter), "시₂ · 123 Hz" (solfège, already a syllable).
 */
export function noteLabel(hz: number, style: NoteStyle, lang: Lang, o: NameOptions = {}): string {
  const midi = Math.round(hzToMidi(hz));
  const hzText = `${Math.round(hz)} Hz`;
  const primary = formatNote(midi, style, lang, o);
  if (style === 'solfege') return `${primary} · ${hzText}`;
  return `${primary} · ${solfegeName(midi, lang, o)} · ${hzText}`;
}

/** Octave relative to a reference note's octave: "낮은 시" / "low Ti", "높은 도" / "high Do", or the plain syllable. */
export function relativeNoteName(midi: number, centerMidi: number, lang: Lang, o: NameOptions = {}): string {
  const d = noteParts(midi).octave - noteParts(centerMidi).octave;
  const syl = solfegeName(midi, lang, o);
  if (d === 0) return syl;
  const word = d < 0 ? (lang === 'ko' ? '낮은' : 'low') : lang === 'ko' ? '높은' : 'high';
  const twice = Math.abs(d) >= 2 ? (lang === 'ko' ? '아주 ' : 'very ') : '';
  return `${twice}${word} ${syl}`;
}

/** "low–high" in one style, e.g. "G2–E4". */
export function rangeText(lowMidi: number, highMidi: number, style: NoteStyle, lang: Lang, o: NameOptions = {}): string {
  return `${formatNote(lowMidi, style, lang, o)}–${formatNote(highMidi, style, lang, o)}`;
}

/** "your range today: G2–E4 (솔₂–미₄)"; the bracket shows the other naming family. */
export function describeRange(lowMidi: number, highMidi: number, style: NoteStyle, lang: Lang, o: NameOptions = {}): string {
  const main = rangeText(lowMidi, highMidi, style, lang, o);
  const other = rangeText(lowMidi, highMidi, style === 'solfege' ? 'scientific' : 'solfege', lang, o);
  return lang === 'ko' ? `오늘의 음역: ${main} (${other})` : `your range today: ${main} (${other})`;
}

/** Pitch accuracy in plain steps: -2 flat, -1 a bit flat, 0 on pitch, 1 a bit sharp, 2 sharp. Thresholds ±10 and ±25 cents. */
export type CentsLevel = -2 | -1 | 0 | 1 | 2;
export function centsLevel(cents: number): CentsLevel {
  const a = Math.abs(cents);
  if (a <= 10) return 0;
  const sign = cents < 0 ? -1 : 1;
  return (a <= 25 ? sign : 2 * sign) as CentsLevel;
}
export function centsWord(cents: number, lang: Lang): string {
  const words: Record<Lang, Record<CentsLevel, string>> = {
    ko: { [-2]: '낮음', [-1]: '약간 낮음', 0: '정확', 1: '약간 높음', 2: '높음' },
    en: { [-2]: 'flat', [-1]: 'a bit flat', 0: 'on pitch', 1: 'a bit sharp', 2: 'sharp' },
  };
  return words[lang][centsLevel(cents)];
}
