import type { Ref } from '../actions';
import type { Lang } from '../types';
import type { ParseContext } from './types';

export interface Span {
  start: number;
  end: number;
}

/** NFC, lowercase, letters and digits only. Used to compare labels whitespace-insensitively. */
export function squash(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * Lowercases and strips punctuation so rules see plain words. Apostrophes are
 * dropped ("it's" -> "its"); decimal points between digits are kept.
 */
export function normalizeSpoken(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\blet's\b/g, 'lets')
    .replace(/(\w)'s\b/g, '$1 is')
    .replace(/'/g, '')
    .replace(/[-–—]/g, ' ')
    .replace(/[^\p{L}\p{M}\p{N}.\s]/gu, ' ')
    .replace(/(?<!\d)\.|\.(?!\d)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const FILLERS: Record<Lang, ReadonlySet<string>> = {
  ko: new Set(['음', '어', '그', '저', '아', '자', '저기', '그럼', '그러면', '일단', '이제', '그냥', '야', '헤이', '있잖아', '근데', '에', '네', '응', '예']),
  en: new Set(['um', 'umm', 'uh', 'uhh', 'er', 'erm', 'hmm', 'hm', 'okay', 'ok', 'hey', 'so', 'well', 'alright', 'yeah', 'oh', 'please', 'yes', 'yep', 'yup']),
};

/** Removes leading filler words but leaves the rest of the original text untouched. */
export function stripLeadingFillers(text: string, lang: Lang): string {
  let rest = text.trim();
  for (;;) {
    const m = /^(\S+)\s*/.exec(rest);
    if (!m) return rest;
    const word = squash(m[1]!);
    if (word !== '' && !FILLERS[lang].has(word)) return rest;
    rest = rest.slice(m[0].length);
  }
}

export function removeSpans(text: string, spans: Span[], joiner: string): string {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  let out = '';
  let pos = 0;
  for (const s of sorted) {
    if (s.start > pos) out += text.slice(pos, s.start) + joiner;
    pos = Math.max(pos, s.end);
  }
  out += text.slice(pos);
  return out.replace(/\s+/g, ' ').trim();
}

export interface Mention {
  label: string;
  source: 'task' | 'timer';
  start: number;
  end: number;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Finds known labels in already-normalized text. Korean text is expected to be
 * whitespace-free; English text is spaced and matched whitespace-insensitively
 * with word boundaries and an optional leading article.
 */
export function findMention(
  text: string,
  ctx: ParseContext,
  lang: Lang,
): { mention?: Mention; conflict: boolean } {
  const seen = new Set<string>();
  const found: Array<Mention & { key: string }> = [];
  const sources: Array<['task' | 'timer', string[]]> = [
    ['task', ctx.taskLabels],
    ['timer', ctx.timerLabels],
  ];
  for (const [source, labels] of sources) {
    for (const label of labels) {
      const key = squash(label);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      let span: Span | undefined;
      if (lang === 'ko') {
        const i = text.indexOf(key);
        if (i >= 0) span = { start: i, end: i + key.length };
      } else {
        const body = [...key].map(escapeRe).join('\\s*');
        const re = new RegExp(`(?<![a-z0-9])(?:(?:the|my|our|this|that)\\s+)?${body}(?:e?s)?(?![a-z0-9])`);
        const m = re.exec(text);
        if (m) span = { start: m.index, end: m.index + m[0].length };
      }
      if (span) found.push({ label, source, key, ...span });
    }
  }
  // A label contained in a longer matched label ("버섯" in "버섯볶음") is not a second target.
  const top = found.filter((a) => !found.some((b) => b !== a && b.key.length > a.key.length && b.key.includes(a.key)));
  if (top.length === 0) return { conflict: false };
  if (top.length > 1) return { conflict: true };
  const { key: _key, ...mention } = top[0]!;
  return { mention, conflict: false };
}

export function refOf(m: Mention | undefined): Ref {
  return m ? { label: m.label } : { implicit: true };
}
