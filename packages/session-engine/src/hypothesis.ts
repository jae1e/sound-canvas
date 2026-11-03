import { COOKING_WORDS } from './data/cooking-words';
import { parseUtterance } from './parser';
import { squash } from './parser/common';
import type { ParseContext } from './parser/types';
import type { Lang } from './types';

export interface ChosenHypothesis {
  text: string;
  /** Index into the input list; 0 is the recognizer's top hypothesis. */
  index: number;
  reason: 'known_label' | 'parsed' | 'top';
}

function containsWord(hypothesis: string, word: string, lang: Lang): boolean {
  const key = squash(word);
  if (!key) return false;
  if (lang === 'ko') return squash(hypothesis).includes(key);
  const tokens = hypothesis.normalize('NFC').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const joined = ` ${tokens.join(' ')} `;
  return joined.includes(` ${key} `) || joined.includes(` ${key}s `) || joined.includes(` ${key}es `);
}

/**
 * Picks the best of a recognizer's n-best list: (1) a hypothesis naming a known task/timer label
 * or cooking word, (2) else the first that parses with high confidence, (3) else the top one.
 */
export function chooseHypothesis(hypotheses: string[], lang: Lang, ctx: ParseContext): ChosenHypothesis | null {
  const list = hypotheses.filter((h) => h.trim() !== '');
  if (list.length === 0) return null;
  const known = [...ctx.taskLabels, ...ctx.timerLabels, ...COOKING_WORDS[lang]];
  const i = list.findIndex((h) => known.some((w) => containsWord(h, w, lang)));
  if (i >= 0) return { text: list[i]!, index: i, reason: 'known_label' };
  const j = list.findIndex((h) => parseUtterance(h, lang, ctx).confidence === 'high');
  if (j >= 0) return { text: list[j]!, index: j, reason: 'parsed' };
  return { text: list[0]!, index: 0, reason: 'top' };
}
