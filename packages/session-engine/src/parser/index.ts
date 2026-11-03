import type { Lang } from '../types';
import { parseEn } from './en';
import { parseKo } from './ko';
import type { ParseContext, ParseResult } from './types';

export type { Intent, ParseContext, ParseResult } from './types';
export { parseDuration, scanDurations } from './duration';
export type { DurationScan, DurationSpan } from './duration';
export { parseKoNumber } from './numbers-ko';
export { parseEnNumber } from './numbers-en';

/**
 * Tier 0 deterministic parser. Returns no intents (low confidence) whenever the
 * utterance is not recognised with certainty; the caller then escalates.
 */
export function parseUtterance(text: string, lang: Lang, ctx: ParseContext): ParseResult {
  const intents = lang === 'ko' ? parseKo(text, ctx) : parseEn(text, ctx);
  return { intents, confidence: intents.length > 0 ? 'high' : 'low' };
}
