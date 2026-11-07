import type {
  PaceBand,
  PaceStatus,
  SpeechLanguage,
  SpeechSettings,
  SpeechTakeAnalysis,
  SpeechTranscript,
  SpeechWord,
} from './types';

/** Default reference bands from research/speech-coach-apps-study.md §3–5 (research 2026-11-07): Korean good ~4.0–5.5 syllables/s including pauses, based on ~4.8/s with pauses and ~6/s articulation; ~5.9/s news-anchor pace is an anchor, not a target. English presentation range 130–165 wpm. */
export const DEFAULT_PACE_BANDS: Record<'ko' | 'en', PaceBand> = {
  ko: { slowBelow: 4, fastAbove: 5.5 },
  en: { slowBelow: 130, fastAbove: 165 },
};
/** Mutable source lexicons can be copied and edited by callers. */
export const DEFAULT_FILLERS: Record<'ko' | 'en', string[]> = {
  ko: ['음', '어', '그', '저', '약간', '이제', '뭐랄까', '뭐지', '아니'],
  en: ['um', 'uh', 'like', 'you know', 'so', 'I mean', 'kind of'],
};

/** Count Hangul syllable blocks, approximating digits and Latin spans as spoken Korean loan/numeric lengths. Each digit counts as one; Latin words use an English syllable estimate. */
export function countKoreanSpeechSyllables(text: string): number {
  let n = 0;
  for (const c of text) {
    const cp = c.codePointAt(0)!;
    if (cp >= 0xac00 && cp <= 0xd7a3) n++;
    else if (/\d/.test(c)) n++;
  }
  const latin = text.match(/[A-Za-z]+/g) ?? [];
  return n + latin.reduce((a, w) => a + estimateEnglishSyllables(w), 0);
}
/** Approximate English syllables with vowel groups, used only for live Korean/English conversion. */
export function estimateEnglishSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  let n = w.match(/[aeiouy]+/g)?.length ?? 0;
  if (/[^aeiouy]e$/.test(w) && !/le$/.test(w) && n > 1) n--;
  return Math.max(1, n);
}
/** Map a pace value to slow/good/fast against the supplied band. */
export function classifyPace(value: number, band: PaceBand): PaceStatus {
  return value < band.slowBelow ? 'slow' : value > band.fastAbove ? 'fast' : 'good';
}
/** Learn a personal median ± robust spread band from at least three finite prior takes; clamps to broad usable bounds. */
export function learnBaseline(lastTakes: number[], lang: 'ko' | 'en'): PaceBand | null {
  const xs = lastTakes.filter(Number.isFinite).sort((a, b) => a - b);
  if (xs.length < 3) return null;
  const med = median(xs),
    deviations = xs.map((x) => Math.abs(x - med)).sort((a, b) => a - b),
    spread = Math.max(lang === 'ko' ? 0.5 : 15, median(deviations) * 1.4826);
  const clamp = (x: number) => Math.max(lang === 'ko' ? 2 : 60, Math.min(lang === 'ko' ? 9 : 240, x));
  return { slowBelow: clamp(med - spread), fastAbove: clamp(med + spread) };
}
function median(xs: number[]): number {
  const m = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[m]! : (xs[m - 1]! + xs[m]!) / 2;
}
/** Estimate syllables/s in the trailing window from nucleus times. This short-window rate is explicitly an estimate. */
export function rollingPace(nucleiMs: number[], nowMs: number, windowMs = 10000): number {
  if (windowMs <= 0) return 0;
  return nucleiMs.filter((t) => t >= nowMs - windowMs && t <= nowMs).length / (windowMs / 1000);
}
/** Convert estimated Korean-style syllable rate into estimated English words/minute (default 1.5 syllables/word). */
export function rollingEnglishWpm(syllablesPerSecond: number, syllablesPerWord = 1.5): number {
  return syllablesPerWord > 0 ? (syllablesPerSecond * 60) / syllablesPerWord : 0;
}
/** Transcript rates: full word span includes pauses; articulation removes native and inter-word gaps strictly over 250ms. */
export function transcriptRates(
  words: SpeechWord[],
  lang: 'ko' | 'en',
  takeDurationMs?: number,
): { speakingRate: number | null; articulationRate: number | null; unit: string } {
  const w = words
    .filter((x) => Number.isFinite(x.start_ms) && x.end_ms >= x.start_ms)
    .slice()
    .sort((a, b) => a.start_ms - b.start_ms);
  if (!w.length) return { speakingRate: null, articulationRate: null, unit: lang === 'ko' ? 'syl/s' : 'wpm' };
  const span = Math.max(1, takeDurationMs ?? w[w.length - 1]!.end_ms - w[0]!.start_ms),
    units = w.reduce((n, x) => n + (lang === 'ko' ? countKoreanSpeechSyllables(x.w) : 1), 0);
  const gaps = w.slice(1).reduce((n, x, i) => n + Math.max(0, x.start_ms - w[i]!.end_ms), 0),
    active = Math.max(1, span - gaps);
  return {
    speakingRate: (units / (span / 1000)) * (lang === 'ko' ? 1 : 60),
    articulationRate: (units / (active / 1000)) * (lang === 'ko' ? 1 : 60),
    unit: lang === 'ko' ? 'syl/s' : 'wpm',
  };
}
/** Count editable filler lexicons. English matches case-insensitive whole token phrases; Korean short tokens require exact tokens, while longer entries permit attached particles/endings. */
export function countTranscriptFillers(
  words: SpeechWord[],
  lang: 'ko' | 'en',
  custom?: string[],
): { total: number; byFiller: Record<string, number>; indices: number[] } {
  const list = custom ?? DEFAULT_FILLERS[lang],
    byFiller: Record<string, number> = {},
    indices: number[] = [];
  words.forEach((word, i) => {
    const token = clean(word.w),
      lower = token.toLocaleLowerCase();
    for (const f of list) {
      const key = f.toLocaleLowerCase();
      let match = false;
      if (lang === 'en') {
        const tokens = lower.match(/[\p{L}\p{N}]+(?:'[\p{L}]+)?/gu) ?? [];
        const ft = key.toLowerCase().split(/\s+/);
        match =
          ft.length === 1
            ? tokens.length === 1 && tokens[0] === ft[0]
            : words
                .slice(i, i + ft.length)
                .map((w) => clean(w.w).toLocaleLowerCase())
                .join(' ') === ft.join(' ');
      } else {
        const normalized = normalizeKo(lower),
          target = normalizeKo(key);
        match =
          normalized === target ||
          (normalized.startsWith(target) && hasParticleBoundary(normalized.slice(target.length)));
      }
      if (match) {
        byFiller[f] = (byFiller[f] ?? 0) + 1;
        indices.push(i);
        break;
      }
    }
  });
  return { total: indices.length, byFiller, indices };
}
function clean(s: string): string {
  return s.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}
function normalizeKo(s: string): string {
  return s.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣ]/gu, '');
}
/** Particle suffix allowlist avoids prefix false positives such as 그것 and 그래서. */
function hasParticleBoundary(s: string): boolean {
  return /^(은|는|이|가|을|를|에|에서|으로|로|도|만|랑|와|과|의|께|한테|부터|까지|요|죠|고|서|면|니|네|다)/u.test(
    s,
  );
}
/** Gaps >=1.5s derived from transcript word timing and/or native pause spans; duplicates are removed by rounded endpoints. */
export function longPauses(
  words: SpeechWord[],
  native: SpeechTakeAnalysis['pauses'] = [],
  thresholdMs = 1500,
): { startMs: number; endMs: number; durationMs: number }[] {
  const found = native
    .filter((p) => p.endMs - p.startMs >= thresholdMs)
    .map((p) => ({ startMs: p.startMs, endMs: p.endMs, durationMs: p.endMs - p.startMs }));
  const sorted = words.slice().sort((a, b) => a.start_ms - b.start_ms);
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1]!,
      b = sorted[i]!,
      d = b.start_ms - a.end_ms;
    if (d >= thresholdMs) found.push({ startMs: a.end_ms, endMs: b.start_ms, durationMs: d });
  }
  const seen = new Set<string>();
  return found
    .filter((p) => {
      const k = `${Math.round(p.startMs / 100)}:${Math.round(p.endMs / 100)}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.startMs - b.startMs);
}
/** Find exact normalized adjacent duplicate tokens. */
export function repeatedWordIndices(words: SpeechWord[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < words.length; i++) {
    const a = clean(words[i - 1]!.w).toLocaleLowerCase(),
      b = clean(words[i]!.w).toLocaleLowerCase();
    if (a && a === b) out.push(i - 1, i);
  }
  return [...new Set(out)];
}
/** Heuristic audio filler estimate: 150–700ms voiced low-pitch-movement segments contained in transcript inter-word gaps. It uses native MIDI contour when available; if only the current TakeAnalysis shape's global pitch spread is present, flatness cannot be established and candidates are conservatively omitted. */
export function estimateAudioFillers(
  analysis: SpeechTakeAnalysis,
  transcript: SpeechTranscript | null,
  movementThresholdSemitones = 1.2,
): number {
  if (
    !transcript?.words.length ||
    analysis.tMs?.length !== analysis.rmsDb.length ||
    analysis.midi?.length !== analysis.rmsDb.length
  )
    return 0;
  const gaps: [number, number][] = [];
  const ws = transcript.words.slice().sort((a, b) => a.start_ms - b.start_ms);
  for (let i = 1; i < ws.length; i++)
    if (ws[i]!.start_ms - ws[i - 1]!.end_ms >= 150) gaps.push([ws[i - 1]!.end_ms, ws[i]!.start_ms]);
  const candidates: { start: number; end: number; pitch: number[] }[] = [];
  let cur: { start: number; end: number; pitch: number[] } | null = null;
  const voiced = analysis.rmsDb.map((r, i) => r > -55 && Number.isFinite(r) && analysis.midi![i] !== null);
  for (let i = 0; i < voiced.length; i++) {
    const t = analysis.tMs![i]!;
    if (voiced[i]) {
      if (!cur) cur = { start: t, end: t, pitch: [] };
      cur.end = t;
      cur.pitch.push(analysis.midi![i]!);
    } else if (cur) {
      candidates.push(cur);
      cur = null;
    }
  }
  if (cur) candidates.push(cur);
  return candidates.filter((c) => {
    const dur = c.end - c.start;
    return (
      dur >= 150 &&
      dur <= 700 &&
      gaps.some(([a, b]) => c.start >= a && c.end <= b) &&
      (c.pitch.length === 0 || Math.max(...c.pitch) - Math.min(...c.pitch) <= movementThresholdSemitones)
    );
  }).length;
}
/** Map pitch variation to a monotone indicator; thresholds are deliberately tunable pending user baselines. */
export function classifyIntonation(pitchSpreadSemitones: number | null): 'monotone' | 'good' | 'unknown' {
  return pitchSpreadSemitones === null ? 'unknown' : pitchSpreadSemitones < 4 ? 'monotone' : 'good';
}
/** Resolve auto from transcript language, falling back to Korean. */
export function resolveSpeechLanguage(
  lang: SpeechLanguage,
  transcript: SpeechTranscript | null,
): 'ko' | 'en' {
  return lang === 'auto' ? (transcript?.language ?? 'ko') : lang;
}
/** Rates helper that accepts optional settings overrides. */
export function paceBand(lang: 'ko' | 'en', settings?: SpeechSettings): PaceBand {
  return settings?.paceBands?.[lang] ?? DEFAULT_PACE_BANDS[lang];
}
