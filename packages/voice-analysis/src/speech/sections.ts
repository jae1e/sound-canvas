import type {
  PaceBand,
  SectionReport,
  SpeechLanguage,
  SpeechPlan,
  SpeechTranscript,
  SpeechWord,
} from './types';
import { classifyPace, countTranscriptFillers, paceBand, transcriptRates } from './metrics';

/** Normalize Korean words by stripping common particles/endings and Latin words with a small suffix stemmer. */
export function normalizeKeyPointToken(token: string, lang: 'ko' | 'en'): string {
  const x = token.toLocaleLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  if (lang === 'ko')
    return x.replace(
      /(으로부터|에게서|한테서|에서는|으로|에서|에게|한테|까지|부터|은|는|이|가|을|를|의|에|도|만|와|과|로|랑|하고|했다|합니다|한다|하는|하며|해서|하고|되다|된다|입니다|였다)$/u,
      '',
    );
  return x.replace(/(ingly|edly|ation|ments|ment|ing|ed|ies|es|s)$/, '').replace(/i$/, 'y');
}
/** Decide key point coverage using normalized word tokens; Korean uses character bigram Jaccard, English exact stem inclusion. */
export function keyPointCovered(
  keyPoint: string,
  text: string,
  lang: 'ko' | 'en',
  threshold = 0.35,
): boolean {
  const norm = (s: string) =>
      s
        .split(/\s+/)
        .map((t) => normalizeKeyPointToken(t, lang))
        .filter(Boolean)
        .join(' '),
    a = norm(keyPoint),
    b = norm(text);
  if (!a) return false;
  if (lang === 'en') return a.split(' ').some((token) => token.length > 2 && b.split(' ').includes(token));
  const grams = (s: string) => {
    const chars = Array.from(
      s
        .split(/\s+/)
        .map((t) => normalizeKeyPointToken(t, 'ko'))
        .join(''),
    );
    return new Set(
      Array.from({ length: Math.max(0, chars.length - 1) }, (_, i) => chars[i]! + chars[i + 1]!),
    );
  };
  const aa = grams(a),
    bb = grams(b);
  if (!aa.size) return b.includes(a);
  let common = 0;
  for (const g of aa) if (bb.has(g)) common++;
  return common / aa.size >= threshold;
}
/** Build section timing, pace, filler and key-point coverage from boundary taps and aligned transcript words. Boundaries are section ends in take-relative milliseconds. */
export function analyzeSections(
  plan: SpeechPlan,
  analysisDurationMs: number,
  transcript: SpeechTranscript | null,
  boundariesMs: number[],
  lang: SpeechLanguage,
  threshold = 0.35,
): SectionReport[] {
  const resolved = lang === 'auto' ? (transcript?.language ?? 'ko') : lang,
    ends = [...boundariesMs, analysisDurationMs]
      .filter(Number.isFinite)
      .map((x) => Math.max(0, Math.min(analysisDurationMs, x)))
      .sort((a, b) => a - b);
  let start = 0;
  return plan.sections.map((section, index) => {
    const end = Math.max(start, ends[index] ?? analysisDurationMs),
      words = (transcript?.words ?? []).filter((w) => w.start_ms >= start && w.start_ms < end),
      text = words.map((w) => w.w).join(' '),
      fillers = countTranscriptFillers(words, resolved).total,
      rates = transcriptRates(words, resolved, end - start),
      covered = transcript
        ? section.keyPoints.filter((k) => keyPointCovered(k, text, resolved, threshold))
        : [],
      missed = transcript ? section.keyPoints.filter((k) => !covered.includes(k)) : [];
    const row: SectionReport = {
      id: section.id,
      name: section.name,
      budgetMs: section.budgetMs,
      actualMs: end - start,
      pace: rates.speakingRate,
      paceStatus: rates.speakingRate === null ? null : classifyPace(rates.speakingRate, paceBand(resolved)),
      fillers,
      covered,
      missed,
    };
    start = end;
    return row;
  });
}

/** Convert the native pause ranges into clipped section-local count values. */
export function countSectionPauses(
  startMs: number,
  endMs: number,
  pauses: { startMs: number; endMs: number }[],
): number {
  return pauses.filter((p) => p.endMs - p.startMs >= 1500 && p.startMs < endMs && p.endMs > startMs).length;
}
