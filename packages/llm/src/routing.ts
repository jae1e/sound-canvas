import { chooseHypothesis, looksLikeQuestion, parseContextOf, parseUtterance, type Intent, type Lang, type Session } from '@vlc/session-engine';

export type RouteWhy = 'single_confident' | 'known_label' | 'hypotheses_agree' | 'hypotheses_disagree' | 'question' | 'low_confidence' | 'noise';

export interface Route {
  /** `deterministic`: the engine's own parser decides (no network, under 50 ms). `llm`: ask the `align` task first. */
  path: 'deterministic' | 'llm';
  why: RouteWhy;
}

/** Stable comparison key of an intent's arguments, so "리조트 5분" and "리조또 5분" differ but "5분 타이머" spellings agree. */
function argKey(intent: Intent | undefined): string {
  if (!intent) return '';
  return JSON.stringify(intent, (_k, v) => (typeof v === 'string' ? squash(v) : v));
}

/**
 * Decides, cheapest first, whether a work-session utterance needs the LLM (technical-decisions section 5.5 step 1):
 * - the chosen hypothesis names a known task/timer label and parses confidently: deterministic;
 * - a single confident parse, or several hypotheses that parse to the same action: deterministic;
 * - confident parses that DISAGREE on a label or number: LLM (this is the "리조트 / 리조또" case);
 * - no confident parse but it sounds like a question or a real sentence: LLM; one or two stray words: deterministic (silent).
 */
export function routeUtterance(session: Session, hypotheses: string[], lang: Lang): Route {
  const list = hypotheses.filter((h) => h.trim() !== '').slice(0, 3);
  if (list.length === 0) return { path: 'deterministic', why: 'noise' };
  const ctx = parseContextOf(session);
  const chosen = chooseHypothesis(list, lang, ctx);
  const parsed = list.map((h) => parseUtterance(h, lang, ctx));
  const confident = parsed.map((p, i) => ({ i, intent: p.confidence === 'high' ? p.intents[0] : undefined })).filter((x) => x.intent);
  if (chosen?.reason === 'known_label' && parsed[chosen.index]?.confidence === 'high') return { path: 'deterministic', why: 'known_label' };
  if (confident.length === 0) {
    const top = list[0]!;
    if (looksLikeQuestion(top, lang)) return { path: 'llm', why: 'question' };
    const words = top.trim().split(/\s+/).length;
    return words >= 3 ? { path: 'llm', why: 'low_confidence' } : { path: 'deterministic', why: 'noise' };
  }
  const keys = new Set(confident.map((x) => argKey(x.intent)));
  if (keys.size > 1) return { path: 'llm', why: 'hypotheses_disagree' };
  return { path: 'deterministic', why: confident.length > 1 ? 'hypotheses_agree' : 'single_confident' };
}

function squash(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}
