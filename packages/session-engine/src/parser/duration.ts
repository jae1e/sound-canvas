import type { Lang } from '../types';
import { EN_NUMBER_WORDS_SRC, parseEnNumber } from './numbers-en';
import { KO_NUMERAL_CHARS, parseKoNumber } from './numbers-ko';

export interface DurationSpan {
  ms: number;
  /** Offsets into the (NFC, lowercased) scanned text. */
  start: number;
  end: number;
  /** The words "more"/"extra" appeared inside the duration phrase ("two more minutes"). */
  more: boolean;
  /** Rank of the smallest unit used (hour 3, minute 2, second 1); parts only merge in descending order. */
  rank: number;
}

export interface DurationScan {
  /** Adjacent parts are merged: "1분 30초" is one span of 90 000 ms. */
  durations: DurationSpan[];
  /** An unquantified amount was spoken ("a few minutes"); callers must not guess. */
  vague: boolean;
}

const MS = { hour: 3_600_000, minute: 60_000, second: 1_000 } as const;
type Unit = keyof typeof MS;

const RANK: Record<Unit, number> = { hour: 3, minute: 2, second: 1 };

function enUnit(u: string): Unit {
  if (u.startsWith('h')) return 'hour';
  if (u.startsWith('m')) return 'minute';
  return 'second';
}

function koUnit(u: string): Unit {
  return u === '시간' ? 'hour' : u === '분' ? 'minute' : 'second';
}

const KO_RE = new RegExp(
  `(\\d+(?:\\.\\d+)?|[${KO_NUMERAL_CHARS}]+)\\s*(시간|분|초)(\\s*반(?=$|[^가-힣]|더|뒤|후|만|동안|정도|연장|추가|씩|이|을|에|까지))?|반\\s*시간`,
  'g',
);

function scanKo(text: string): DurationSpan[] {
  const out: DurationSpan[] = [];
  for (const m of text.matchAll(KO_RE)) {
    const index = m.index ?? 0;
    if (m[1] === undefined) {
      out.push({ ms: MS.hour / 2, start: index, end: index + m[0].length, more: false, rank: 3 });
      continue;
    }
    // Spoken Korean runs words together ("다이분"), so keep the longest valid numeral suffix.
    let offset = 0;
    let value: number | undefined;
    for (; offset < m[1].length; offset++) {
      value = parseKoNumber(m[1].slice(offset));
      if (value !== undefined) break;
    }
    if (value === undefined || value <= 0) continue;
    const unit = MS[koUnit(m[2]!)];
    out.push({
      rank: RANK[koUnit(m[2]!)],
      ms: Math.round(value * unit + (m[3] ? unit / 2 : 0)),
      start: index + offset,
      end: index + m[0].length,
      more: false,
    });
  }
  return out;
}

const EN_UNIT = '(?:hours?|hrs?|minutes?|mins?|seconds?|secs?)';
const EN_NUM = `\\d+(?:\\.\\d+)?|a\\s+few|few|several|a\\s+couple\\s+of|a\\s+couple|couple\\s+of|couple|${EN_NUMBER_WORDS_SRC}|an?`;
const EN_RE = new RegExp(
  `(?<![a-z0-9.])(?:half\\s+(?:of\\s+)?(?:an?\\s+)?(?<hu>${EN_UNIT})(?![a-z])` +
    `|(?<num>${EN_NUM})(?<pre>\\s+and\\s+a\\s+half)?(?<more>\\s+(?:more|extra|additional))?\\s+(?<unit>${EN_UNIT})(?![a-z])(?<post>\\s+and\\s+a\\s+half)?)`,
  'g',
);

function scanEn(text: string): { spans: DurationSpan[]; vague: boolean } {
  const spans: DurationSpan[] = [];
  let vague = false;
  for (const m of text.matchAll(EN_RE)) {
    const g = m.groups!;
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (g.hu) {
      spans.push({ ms: MS[enUnit(g.hu)] / 2, start, end, more: false, rank: RANK[enUnit(g.hu)] });
      continue;
    }
    if (/few|several/.test(g.num!)) {
      vague = true;
      continue;
    }
    const value = parseEnNumber(g.num!);
    if (value === undefined || value <= 0) continue;
    const unit = MS[enUnit(g.unit!)];
    const halves = (g.pre ? 0.5 : 0) + (g.post ? 0.5 : 0);
    spans.push({ ms: Math.round((value + halves) * unit), start, end, more: Boolean(g.more), rank: RANK[enUnit(g.unit!)] });
  }
  return { spans, vague };
}

function merge(text: string, spans: DurationSpan[], lang: Lang): DurationSpan[] {
  const gap = lang === 'ko' ? /^\s*$/ : /^[\s,]*(?:and[\s,]*)?$/;
  const out: DurationSpan[] = [];
  for (const s of spans) {
    const prev = out[out.length - 1];
    if (prev && s.rank < prev.rank && gap.test(text.slice(prev.end, s.start))) {
      prev.ms += s.ms;
      prev.end = s.end;
      prev.more = prev.more || s.more;
      prev.rank = s.rank;
    } else {
      out.push({ ...s });
    }
  }
  return out;
}

export function scanDurations(text: string, lang: Lang): DurationScan {
  const t = text.normalize('NFC').toLowerCase().replace(/-/g, ' ');
  if (lang === 'ko') return { durations: merge(t, scanKo(t), 'ko'), vague: false };
  const { spans, vague } = scanEn(t);
  return { durations: merge(t, spans, 'en'), vague };
}

/** Milliseconds if the text holds exactly one concrete duration, else undefined. */
export function parseDuration(text: string, lang: Lang): number | undefined {
  const { durations, vague } = scanDurations(text, lang);
  return !vague && durations.length === 1 ? durations[0]!.ms : undefined;
}
