import { scanDurations } from '../parser/duration';
import type { Lang } from '../types';
import { DEFAULT_REST_SEC, DEFAULT_SEC_PER_COUNT, DEFAULT_SEC_PER_REP, type RoutineItem } from './model';
import { hasHangul, NUM_SRC, parseNum } from './numtok';
import { poomsaeItem } from './templates';

export interface UnparsedPart {
  text: string;
  reason: string;
}

export interface ParsedRoutine {
  lang: Lang;
  items: RoutineItem[];
  /** Parts the parser did not understand. Free-form text with leftovers goes to `askLlm()` (M4 stub). */
  unparsed: UnparsedPart[];
  /** Values the user did not state and the parser filled in (shown in the preview). */
  assumed: string[];
}

const SPLIT = /[,，、;\n]+|\s+(?:그리고|그다음에?|하고|and then|then|and)\s+|(?<=\S)하고\s+/giu;

const REST_WORD = /휴식|쉬는\s*시간|쉬기|쉬고|쉬어|rest|break/u;
const BETWEEN_SETS = /세트\s*(?:사이|간|끼리|마다)|between\s+(?:the\s+)?sets|after\s+each\s+set|each\s+set/u;
const PER_SIDE = /좌우|양쪽|양\s*방향|한쪽씩|각각|각\s*쪽|each\s+side|per\s+side|both\s+sides|left\s+(?:and|&)\s+right|each\s+leg|each\s+arm/u;
const REPS_RE = new RegExp(`(${NUM_SRC})\\s*(?:개|회|번|reps?|repetitions?|times|x(?![a-z]))`, 'u');
const SETS_RE = new RegExp(`(${NUM_SRC})\\s*(?:세트|sets?)(?![a-z])`, 'u');
const SETS_OF_RE = new RegExp(`(${NUM_SRC})\\s+sets?\\s+of\\s+(${NUM_SRC})`, 'u');
const TAEGEUK_RE = new RegExp(`(?:태극|태권도?\\s*태극|tae\\s*geuk|taegeuk)\\s*(${NUM_SRC}|il|one)?\\s*(?:장|jang)?`, 'u');
const TEMPO_PER_REP_RE = /(\d+(?:\.\d+)?)\s*(?:초|s|sec|secs|seconds?)\s*(?:에\s*(?:한\s*)?(?:개|번|회)|per\s+rep|a\s+rep|each\s+rep|per\s+repetition)|(?:한\s*(?:개|번|회)에|개당|번당|회당)\s*(\d+(?:\.\d+)?)\s*초/u;

interface Span {
  start: number;
  end: number;
}

function cut(text: string, spans: Span[]): string {
  const s = [...spans].sort((a, b) => a.start - b.start);
  let out = '';
  let pos = 0;
  for (const sp of s) {
    if (sp.start > pos) out += text.slice(pos, sp.start) + ' ';
    pos = Math.max(pos, sp.end);
  }
  return (out + text.slice(pos)).replace(/\s+/g, ' ').trim();
}

const NAME_TRIM_KO = /(?:을|를|은|는|이|가|도|씩|좀|해줘|해요|하기|할게|할래|하자|합니다)$/u;

function cleanName(raw: string, lang: Lang): string {
  let s = raw.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (lang === 'en') s = s.replace(/^(?:do|a|an|the|some|for|of|x)\s+/u, '').replace(/\s+(?:for|of|x)$/u, '');
  else {
    s = s.replace(/^[,\s]+|[,\s]+$/g, '');
    // Only strip a trailing particle when the stem stays at least two syllables long.
    for (let i = 0; i < 2; i++) {
      const next = s.replace(NAME_TRIM_KO, '');
      if (next !== s && next.length >= 2) s = next;
      else break;
    }
  }
  return s.trim();
}

/**
 * Deterministic setup parser for routine lists in Korean or English. Typed or spoken text; separators are commas,
 * "and", "그리고", "하고". The language is detected from the script. Never guesses: anything it cannot place goes to
 * `unparsed`.
 */
export function parseRoutineText(text: string, opts: { idPrefix?: string; lang?: Lang } = {}): ParsedRoutine {
  const lang: Lang = opts.lang ?? (hasHangul(text) ? 'ko' : 'en');
  const idPrefix = opts.idPrefix ?? 'r';
  const items: RoutineItem[] = [];
  const unparsed: UnparsedPart[] = [];
  const assumed: string[] = [];
  let seq = 0;
  const id = () => `${idPrefix}${++seq}`;
  let globalRest: number | undefined;
  const explicitRest = new Set<string>();

  const parts = text.normalize('NFC').toLowerCase().split(SPLIT).map((p) => p.trim()).filter((p) => p.length > 0);
  for (const seg of parts) {
    const durs = scanDurations(seg, lang);
    const restWord = REST_WORD.exec(seg);
    const stripped = seg.replace(/[.!?]+$/u, '');

    // Rest between sets applies to every exercise/hold without its own rest.
    if (BETWEEN_SETS.test(stripped) && durs.durations.length === 1 && !TAEGEUK_RE.test(stripped)) {
      globalRest = Math.round(durs.durations[0]!.ms / 1000);
      continue;
    }

    // Poomsae.
    const tg = TAEGEUK_RE.exec(stripped);
    if (tg && (hasHangul(stripped) ? /태극/u.test(stripped) : /taegeuk|tae\s*geuk/u.test(stripped))) {
      const rawNo = tg[1];
      const no = rawNo === undefined ? undefined : rawNo === 'il' || rawNo === 'one' ? 1 : parseNum(rawNo);
      if (no !== 1) {
        unparsed.push({ text: seg, reason: lang === 'ko' ? '지금은 태극 1장만 있어요' : 'Only Taegeuk 1 is available for now' });
        continue;
      }
      const rest = stripped.slice(tg.index + tg[0].length);
      const rep = new RegExp(`(${NUM_SRC})\\s*(?:번|회|times|x(?![a-z]))`, 'u').exec(rest) ?? new RegExp(`(${NUM_SRC})\\s*(?:번|회|times|x(?![a-z]))`, 'u').exec(stripped.slice(0, tg.index));
      const repeat = rep ? parseNum(rep[1]!) : 1;
      if (repeat === undefined || repeat < 1) {
        unparsed.push({ text: seg, reason: lang === 'ko' ? '반복 횟수를 이해하지 못했어요' : 'Could not read the repeat count' });
        continue;
      }
      items.push(poomsaeItem(lang, id(), repeat));
      continue;
    }

    // Pure rest item: "휴식 30초", "rest 30 seconds".
    const spans: Span[] = [];
    let restSec: number | undefined;
    if (restWord) {
      const after = durs.durations.find((d) => d.start >= restWord.index + restWord[0].length - 1 && d.start - (restWord.index + restWord[0].length) <= 8);
      const before = durs.durations.find((d) => d.end <= restWord.index + 1 && restWord.index - d.end <= 4);
      const d = after ?? before;
      if (d) {
        restSec = Math.round(d.ms / 1000);
        spans.push({ start: restWord.index, end: restWord.index + restWord[0].length }, { start: d.start, end: d.end });
      }
    }
    const holdDurs = durs.durations.filter((d) => !spans.some((s) => d.start >= s.start && d.start < s.end));
    const rest0 = cut(stripped, spans);
    if (restSec !== undefined && holdDurs.length === 0 && rest0.replace(/[^\p{L}\p{N}]/gu, '') === '') {
      items.push({ kind: 'rest', id: id(), name: lang === 'ko' ? '휴식' : 'Rest', sec: restSec });
      continue;
    }

    // Exercise or hold.
    const work: Span[] = [...spans];
    let reps: number | undefined;
    let sets: number | undefined;
    let secPerRep: number | undefined;
    let pattern: number[] | undefined;
    const setsOf = SETS_OF_RE.exec(stripped);
    if (setsOf) {
      sets = parseNum(setsOf[1]!);
      reps = parseNum(setsOf[2]!);
      work.push({ start: setsOf.index, end: setsOf.index + setsOf[0].length });
    }
    const tp = TEMPO_PER_REP_RE.exec(stripped);
    if (tp) {
      secPerRep = Number(tp[1] ?? tp[2]);
      work.push({ start: tp.index, end: tp.index + tp[0].length });
    }
    const tpat = /(?:템포|tempo)\s*(\d+(?:\.\d+)?(?:\s*[-/]\s*\d+(?:\.\d+)?){1,5})|(\d+(?:\.\d+)?(?:\s*[-/]\s*\d+(?:\.\d+)?){1,5})\s*(?:템포|tempo)/u.exec(stripped);
    if (tpat) {
      pattern = (tpat[1] ?? tpat[2]!).split(/[-/]/).map((n) => Number(n.trim()));
      work.push({ start: tpat.index, end: tpat.index + tpat[0].length });
    }
    if (!setsOf) {
      const sm = SETS_RE.exec(stripped);
      if (sm) {
        sets = parseNum(sm[1]!);
        work.push({ start: sm.index, end: sm.index + sm[0].length });
      }
      const re2 = new RegExp(REPS_RE.source, 'gu');
      for (const m of stripped.matchAll(re2)) {
        const at = m.index ?? 0;
        if (work.some((w) => at >= w.start && at < w.end)) continue;
        // "3세트" is a set count, not reps; "번" directly after "한" is not a count either.
        reps = parseNum(m[1]!);
        work.push({ start: at, end: at + m[0].length });
        break;
      }
    }
    const perSide = PER_SIDE.exec(stripped);
    if (perSide) work.push({ start: perSide.index, end: perSide.index + perSide[0].length });
    const holdUsed = holdDurs.filter((d) => !(tp && d.start >= tp.index && d.start < tp.index + tp[0].length));
    for (const d of holdUsed) work.push({ start: d.start, end: d.end });
    let name = cleanName(cut(stripped, work), lang);

    // English "15 squats": a leading bare number is the rep count.
    if (reps === undefined && holdUsed.length === 0) {
      const lead = new RegExp(`^(${NUM_SRC})\\s+(.+)$`, 'u').exec(name);
      if (lead && parseNum(lead[1]!) !== undefined && lang === 'en') {
        reps = parseNum(lead[1]!);
        name = cleanName(lead[2]!, lang);
      }
    }
    if (name === '' || /^[\p{N}\s]+$/u.test(name)) {
      unparsed.push({ text: seg, reason: lang === 'ko' ? '운동 이름을 찾지 못했어요' : 'No exercise name found' });
      continue;
    }

    const restFor = restSec;
    if (holdUsed.length === 1 && reps === undefined) {
      const holdSec = Math.round(holdUsed[0]!.ms / 1000);
      items.push({ kind: 'hold', id: id(), name, holdSec, sets: sets ?? 1, perSide: Boolean(perSide), restSec: restFor ?? -1 });
      if (restFor !== undefined) explicitRest.add(`r${seq}`);
      continue;
    }
    if (holdUsed.length > 1) {
      unparsed.push({ text: seg, reason: lang === 'ko' ? '시간이 여러 개라 이해하지 못했어요' : 'More than one duration; could not tell which is which' });
      continue;
    }
    if (reps !== undefined || sets !== undefined) {
      if (reps === undefined) {
        unparsed.push({ text: seg, reason: lang === 'ko' ? '횟수가 없어요 (예: 15개)' : 'No rep count (for example 15 reps)' });
        continue;
      }
      if (reps < 1 || (sets !== undefined && sets < 1)) {
        unparsed.push({ text: seg, reason: lang === 'ko' ? '횟수가 올바르지 않아요' : 'Invalid count' });
        continue;
      }
      const ex: RoutineItem = { kind: 'exercise', id: id(), name, reps, sets: sets ?? 1, secPerRep: secPerRep ?? DEFAULT_SEC_PER_REP, restSec: restFor ?? -1 };
      if (pattern) {
        ex.pattern = pattern;
        ex.secPerRep = pattern.reduce((a, b) => a + b, 0);
      }
      if (restFor !== undefined) explicitRest.add(ex.id);
      items.push(ex);
      continue;
    }
    unparsed.push({ text: seg, reason: lang === 'ko' ? '횟수나 시간을 찾지 못했어요' : 'No reps or duration found' });
  }

  let usedDefault = false;
  for (const it of items) {
    if ((it.kind === 'exercise' || it.kind === 'hold') && it.restSec < 0) {
      it.restSec = globalRest ?? DEFAULT_REST_SEC;
      if (globalRest === undefined && it.sets > 1) usedDefault = true;
    }
  }
  if (usedDefault) assumed.push(lang === 'ko' ? `세트 사이 휴식 ${DEFAULT_REST_SEC}초 (말하지 않아 기본값)` : `${DEFAULT_REST_SEC} s rest between sets (default; not stated)`);
  if (items.some((i) => i.kind === 'exercise' && i.secPerRep === DEFAULT_SEC_PER_REP)) {
    assumed.push(lang === 'ko' ? `동작당 ${DEFAULT_SEC_PER_REP}초 템포 (기본값)` : `${DEFAULT_SEC_PER_REP} s per rep (default tempo)`);
  }
  if (items.some((i) => i.kind === 'poomsae')) assumed.push(lang === 'ko' ? `품새 ${DEFAULT_SEC_PER_COUNT}초당 한 동작 (기본값)` : `Poomsae ${DEFAULT_SEC_PER_COUNT} s per movement (default)`);
  return { lang, items, unparsed, assumed };
}

/** True when nothing useful was parsed, or leftovers remain that a (future) LLM could interpret. */
export function needsLlm(r: ParsedRoutine): boolean {
  return r.unparsed.length > 0;
}
