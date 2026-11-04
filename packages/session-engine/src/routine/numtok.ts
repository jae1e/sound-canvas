import { EN_NUMBER_WORDS_SRC, parseEnNumber } from '../parser/numbers-en';
import { KO_NUMERAL_CHARS, parseKoNumber } from '../parser/numbers-ko';

/** Regex source for a number token (digits, Korean numerals, English number words). Capture-free. */
export const NUM_SRC = `\\d+|[${KO_NUMERAL_CHARS}]+|${EN_NUMBER_WORDS_SRC}`;

/** Parses a number token produced by [NUM_SRC]. */
export function parseNum(token: string): number | undefined {
  const t = token.trim().toLowerCase();
  if (/^\d+$/.test(t)) return Number(t);
  return parseKoNumber(t) ?? parseEnNumber(t);
}

export function hasHangul(s: string): boolean {
  return /[ㄱ-ㆎ가-힣]/.test(s);
}

/** Lowercase NFC with decorative punctuation turned into spaces (same length is not guaranteed; callers use the result only). */
export function norm(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/['’]/g, '').replace(/[“”"!?]/g, ' ').replace(/\s+/g, ' ').trim();
}
