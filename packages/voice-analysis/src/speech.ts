import { frameStep } from './analysis';
import type { Frame, Lang, TimedWord } from './types';

// ---------------------------------------------------------------- syllable counting

/** Counts Hangul syllable blocks (U+AC00..U+D7A3), which is exactly the Korean spoken syllable count for ordinary text. */
export function countKoreanSyllables(text: string): number {
  let n = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if (c >= 0xac00 && c <= 0xd7a3) n++;
  }
  return n;
}

/** Heuristic English syllable count: vowel groups, minus a silent trailing "e", at least 1 per word. */
export function countEnglishSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  const groups = w.match(/[aeiouy]+/g)?.length ?? 0;
  let n = groups;
  if (/[^aeiouy]e$/.test(w) && !/le$/.test(w) && n > 1) n--;
  return Math.max(1, n);
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
}

// ---------------------------------------------------------------- filler words

export interface FillerCount {
  total: number;
  byWord: Record<string, number>;
}

const KO_FILLER_TOKENS = new Set(['음', '어', '그', '저기']);

/**
 * Counts filler words in a transcript.
 * - ko: a filler only when it is a whole whitespace-delimited token ("그게", "어제", "음식" are not fillers), after
 *   stripping punctuation and collapsing elongation ("음...", "어어", "그으" -> one filler each).
 * - en: um/uh/er/erm (and elongations like "ummm"), "like" and "you know" on word boundaries. "like" is
 *   inherently ambiguous (verb/preposition); every "like" is counted, so treat it as an upper bound.
 */
export function countFillers(text: string, lang: Lang): FillerCount {
  const byWord: Record<string, number> = {};
  const add = (k: string) => {
    byWord[k] = (byWord[k] ?? 0) + 1;
  };
  if (lang === 'ko') {
    for (const raw of text.split(/\s+/)) {
      const tok = raw.replace(/[^\p{L}\p{N}]/gu, '');
      if (!tok) continue;
      const collapsed = tok.replace(/(.)\1+/gu, '$1').replace(/^(그)으+$/u, '$1').replace(/^(어)으+$/u, '$1').replace(/^(음)으+$/u, '$1');
      if (KO_FILLER_TOKENS.has(collapsed)) add(collapsed);
      else if (/^[음어]+$/u.test(tok)) add(tok[0]!);
    }
  } else {
    const lower = text.toLowerCase();
    const word = (re: RegExp, key: string) => {
      for (const _ of lower.matchAll(re)) add(key);
    };
    word(/(?<![\p{L}\p{N}'])(?:u+m+|u+h+|e+r+m*|u+h+m+)(?![\p{L}\p{N}'])/gu, 'um/uh');
    word(/(?<![\p{L}\p{N}'])you\s+know(?![\p{L}\p{N}'])/gu, 'you know');
    word(/(?<![\p{L}\p{N}'])like(?![\p{L}\p{N}'])/gu, 'like');
  }
  const total = Object.values(byWord).reduce((a, b) => a + b, 0);
  return { total, byWord };
}

// ---------------------------------------------------------------- speaking rate

export interface SpeakingRate {
  /** Syllables per second for ko, words per minute for en. */
  value: number;
  unit: 'syl/s' | 'wpm';
  /** Same unit, excluding pauses longer than `pauseGapS`. */
  articulationValue: number;
  source: 'timestamps' | 'energy';
  /** True when derived from energy peaks (rough estimate). */
  estimated: boolean;
}

/** Speaking rate from STT word timestamps. Gaps between words longer than `pauseGapS` are excluded from the articulation rate. */
export function rateFromWords(words: TimedWord[], lang: Lang, pauseGapS = 0.25): SpeakingRate | null {
  const w = words.filter((x) => x.end >= x.start && x.text.trim());
  if (w.length < 2) return null;
  const span = w[w.length - 1]!.end - w[0]!.start;
  if (span <= 0) return null;
  let paused = 0;
  for (let i = 1; i < w.length; i++) {
    const gap = w[i]!.start - w[i - 1]!.end;
    if (gap > pauseGapS) paused += gap;
  }
  const art = Math.max(span - paused, 0.1);
  const units = lang === 'ko' ? w.reduce((a, x) => a + countKoreanSyllables(x.text), 0) : w.length;
  const k = lang === 'ko' ? 1 : 60;
  return { value: (units / span) * k, articulationValue: (units / art) * k, unit: lang === 'ko' ? 'syl/s' : 'wpm', source: 'timestamps', estimated: false };
}

export interface NucleiOptions {
  /** Minimum rise above the neighbouring valley, dB. Default 3. */
  prominenceDb?: number;
  /** Minimum spacing between nuclei, seconds. Default 0.1 (about 10 syllables/s upper bound). */
  minSpacingS?: number;
  /** Ignore peaks quieter than max - rangeDb. Default 25. */
  rangeDb?: number;
}

/** Counts syllable nuclei as prominent peaks of the energy envelope (de Jong and Wempe style, simplified). */
export function countSyllableNuclei(rmsDb: number[], dt: number, opts: NucleiOptions = {}): number {
  const prom = opts.prominenceDb ?? 3;
  const minGap = Math.max(1, Math.round((opts.minSpacingS ?? 0.1) / dt));
  const range = opts.rangeDb ?? 25;
  if (rmsDb.length < 3) return 0;
  const sm = rmsDb.map((_, i) => {
    const a = rmsDb[Math.max(0, i - 1)]!;
    const b = rmsDb[i]!;
    const c = rmsDb[Math.min(rmsDb.length - 1, i + 1)]!;
    return (a + 2 * b + c) / 4;
  });
  const maxDb = Math.max(...sm);
  const peaks: number[] = [];
  for (let i = 0; i < sm.length; i++) {
    const left = i > 0 ? sm[i - 1]! : -Infinity;
    const right = i < sm.length - 1 ? sm[i + 1]! : -Infinity;
    if (sm[i]! > left && sm[i]! >= right && sm[i]! > maxDb - range) peaks.push(i);
  }
  // Keep a peak only when the dip since the previous kept peak is deep enough; otherwise keep the higher one.
  const kept: number[] = [];
  for (const p of peaks) {
    const prev = kept[kept.length - 1];
    if (prev === undefined) {
      kept.push(p);
      continue;
    }
    let valley = Infinity;
    for (let j = prev; j <= p; j++) valley = Math.min(valley, sm[j]!);
    const rise = Math.min(sm[p]!, sm[prev]!) - valley;
    if (p - prev < minGap || rise < prom) {
      if (sm[p]! > sm[prev]!) kept[kept.length - 1] = p;
    } else kept.push(p);
  }
  return kept.length;
}

/** Rough speaking rate from the loudness envelope: nuclei per second over the span from first to last speech frame. */
export function rateFromEnergy(frames: Frame[], lang: Lang, silenceDb: number): SpeakingRate | null {
  if (frames.length < 5) return null;
  const dt = frameStep(frames);
  const first = frames.findIndex((f) => f.rmsDb >= silenceDb);
  let last = -1;
  for (let i = frames.length - 1; i >= 0; i--) if (frames[i]!.rmsDb >= silenceDb) { last = i; break; }
  if (first < 0 || last - first < 4) return null;
  const seg = frames.slice(first, last + 1).map((f) => f.rmsDb);
  const n = countSyllableNuclei(seg, dt);
  const span = seg.length * dt;
  const speaking = seg.filter((d) => d >= silenceDb).length * dt;
  const sylPerS = n / span;
  const artSylPerS = n / Math.max(speaking, dt);
  if (lang === 'ko') return { value: sylPerS, articulationValue: artSylPerS, unit: 'syl/s', source: 'energy', estimated: true };
  const k = 60 / 1.4; // about 1.4 syllables per English word in conversation
  return { value: sylPerS * k, articulationValue: artSylPerS * k, unit: 'wpm', source: 'energy', estimated: true };
}
