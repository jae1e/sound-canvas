import type { Lang } from '../types';
import { describeItem, repSeconds, type ExerciseItem, type HoldItem, type Movement, type PoomsaeItem, type RoutineItem } from './model';
import { countWord, estimateClipMs, secondsPhrase } from './phrases';

/** How much is said per movement/rep. `count` keeps only counts (plus the user's own correction cues and the kihap cue). */
export type PacingLevel = 'full' | 'short' | 'count';

export type UnitKind = 'intro' | 'rep' | 'hold' | 'rest' | 'switch' | 'between' | 'move' | 'done';

/** One atomic stretch of the routine: a rep, a hold, a rest, a poomsae movement. The cursor is a unit key. */
export interface Unit {
  key: string;
  kind: UnitKind;
  itemId: string;
  itemIdx: number;
  /** Set number (1-based); the pass number for poomsae; 0 for intro/done. */
  set: number;
  sets: number;
  rep?: number;
  reps?: number;
  side?: 'left' | 'right';
  movementId?: string;
  /** Base duration in ms with the tempo factor applied. Intro/done are sized by their phrase when planned. */
  durMs: number;
  /** Planner may lengthen the previous unit to fit a pre-cue before this one. */
  flexible: boolean;
}

const SWITCH_MS = 3000;
const BETWEEN_MS = 4000;

export function unitKey(u: Pick<Unit, 'itemId' | 'kind' | 'set' | 'rep' | 'side' | 'movementId'>): string {
  return [u.itemId, u.kind, u.set, u.rep ?? '', u.side ?? '', u.movementId ?? ''].join('|');
}

function mk(itemIdx: number, item: RoutineItem, u: Omit<Unit, 'key' | 'itemId' | 'itemIdx'>): Unit {
  const base = { ...u, itemId: item.id, itemIdx };
  return { ...base, key: unitKey(base) };
}

/** Flattens the (session copy of the) items into units. `tempoFactor` scales reps and poomsae counts only (not holds or rests). */
export function expandUnits(items: readonly RoutineItem[], tempoFactor = 1): Unit[] {
  const out: Unit[] = [];
  items.forEach((item, idx) => {
    switch (item.kind) {
      case 'exercise': {
        out.push(mk(idx, item, { kind: 'intro', set: 0, sets: item.sets, durMs: 0, flexible: true }));
        const repMs = Math.round(repSeconds(item) * 1000 * tempoFactor);
        for (let s = 1; s <= item.sets; s++) {
          for (let r = 1; r <= item.reps; r++) out.push(mk(idx, item, { kind: 'rep', set: s, sets: item.sets, rep: r, reps: item.reps, durMs: repMs, flexible: false }));
          if (s < item.sets && item.restSec > 0) out.push(mk(idx, item, { kind: 'rest', set: s, sets: item.sets, durMs: item.restSec * 1000, flexible: true }));
        }
        break;
      }
      case 'hold': {
        out.push(mk(idx, item, { kind: 'intro', set: 0, sets: item.sets, durMs: 0, flexible: true }));
        for (let s = 1; s <= item.sets; s++) {
          const sides: Array<'left' | 'right' | undefined> = item.perSide ? ['left', 'right'] : [undefined];
          sides.forEach((side, si) => {
            if (si > 0) out.push(mk(idx, item, { kind: 'switch', set: s, sets: item.sets, side, durMs: SWITCH_MS, flexible: true }));
            out.push(mk(idx, item, { kind: 'hold', set: s, sets: item.sets, side, durMs: item.holdSec * 1000, flexible: false }));
          });
          if (s < item.sets && item.restSec > 0) out.push(mk(idx, item, { kind: 'rest', set: s, sets: item.sets, durMs: item.restSec * 1000, flexible: true }));
        }
        break;
      }
      case 'rest':
        out.push(mk(idx, item, { kind: 'rest', set: 0, sets: 1, durMs: item.sec * 1000, flexible: true }));
        break;
      case 'poomsae': {
        out.push(mk(idx, item, { kind: 'intro', set: 0, sets: item.repeat, durMs: 0, flexible: true }));
        const ms = Math.round(item.secPerCount * 1000 * tempoFactor);
        for (let p = 1; p <= item.repeat; p++) {
          if (p > 1) out.push(mk(idx, item, { kind: 'between', set: p, sets: item.repeat, durMs: BETWEEN_MS, flexible: true }));
          for (const m of item.movements) out.push(mk(idx, item, { kind: 'move', set: p, sets: item.repeat, movementId: m.id, rep: m.no, durMs: ms, flexible: false }));
        }
        break;
      }
    }
  });
  if (items.length > 0) out.push({ key: 'end|done|0||', kind: 'done', itemId: 'end', itemIdx: items.length, set: 0, sets: 0, durMs: 0, flexible: true });
  return out;
}

/** Finds the unit a stored cursor key points to, or the closest following unit of the same item, or the next item's first unit. */
export function resolveCursor(units: readonly Unit[], key: string | null | undefined, hint?: Pick<Unit, 'itemId' | 'set' | 'rep'>): number {
  if (units.length === 0) return 0;
  if (!key) return 0;
  const exact = units.findIndex((u) => u.key === key);
  if (exact >= 0) return exact;
  if (hint) {
    const sameItem = units.findIndex((u) => u.itemId === hint.itemId && u.kind !== 'intro' && (u.set > hint.set || (u.set === hint.set && (u.rep ?? 0) >= (hint.rep ?? 0))));
    if (sameItem >= 0) return sameItem;
    const anyItem = units.findIndex((u) => u.itemId === hint.itemId);
    if (anyItem >= 0) return Math.min(anyItem + 1, units.length - 1);
  }
  return units.length - 1;
}

/** A pre-cue to play just before a unit: a personal correction or the kihap reminder. */
export interface PreCue {
  id: string;
  text: string;
  kind: 'correction' | 'kihap';
  /** Plays before this poomsae movement (every pass)... */
  movementId?: string;
  /** ...or before the first rep/hold of every set of this item (exercise item correction)... */
  itemId?: string;
  /** ...or once before the first work unit of the whole routine. */
  routine?: boolean;
}

export interface PlanOptions {
  lang: Lang;
  level: PacingLevel;
  items: readonly RoutineItem[];
  tempoFactor?: number;
  preCues?: readonly PreCue[];
  /** Real clip length for a phrase if known (from the prepared cache). */
  clipMs?: (text: string) => number | undefined;
  /** Silence before the first unit. */
  leadInMs?: number;
}

export type BeatKind = 'count' | 'name' | 'cue' | 'countdown' | 'info' | 'transition';

export interface Beat {
  /** Offset from the start of the timeline. */
  atMs: number;
  text: string;
  kind: BeatKind;
  /** Native segment (one set, one hold, one pass) used for the per-set drift summary. */
  segment: string;
  unitKey: string;
  /** Correction/kihap cue id, when this beat is a pre-cue (to count how often it played). */
  cueId?: string;
}

export interface UnitSpan {
  unit: Unit;
  startMs: number;
  endMs: number;
}

export interface Timeline {
  beats: Beat[];
  spans: UnitSpan[];
  totalMs: number;
  /** Pre-cues that did not fit into the gap before their movement and were left out. */
  droppedCues: string[];
  /** Movements whose phrase was shortened because the full phrase did not fit the tempo. */
  trimmed: string[];
}

function sideWord(side: 'left' | 'right', lang: Lang): string {
  return lang === 'ko' ? (side === 'left' ? '왼쪽' : '오른쪽') : side === 'left' ? 'left side' : 'right side';
}

/** The words for a poomsae movement at a pacing level. */
export function movementPhrase(m: Movement, level: PacingLevel, lang: Lang): string {
  const n = countWord(m.no, lang);
  if (level === 'count') return n;
  if (level === 'short') return `${n}, ${m.technique[lang]}`;
  return `${n}, ${m.stance[lang]} ${m.technique[lang]}`;
}

export function introPhrase(item: RoutineItem, level: PacingLevel, lang: Lang): string {
  if (item.kind === 'poomsae') return level === 'count' ? item.name : lang === 'ko' ? `${item.name}${item.repeat > 1 ? ` ${item.repeat}번` : ''}, 준비` : `${item.name}${item.repeat > 1 ? `, ${item.repeat} times` : ''}, ready`;
  if (level === 'count') return item.name;
  return describeItem(item, lang);
}

/** Every phrase the timeline of the whole routine can say, so the app can pre-synthesize it. */
export function collectPhrases(opts: PlanOptions): string[] {
  const set = new Set<string>();
  for (const level of ['full', 'short', 'count'] as const) {
    if (level !== opts.level) continue;
    const tl = planTimeline({ ...opts, level }, 0);
    for (const b of tl.beats) set.add(b.text);
  }
  return [...set];
}

interface Ctx {
  lang: Lang;
  level: PacingLevel;
  items: readonly RoutineItem[];
  units: readonly Unit[];
}

function itemOf(ctx: Ctx, u: Unit): RoutineItem {
  return ctx.items[u.itemIdx]!;
}

function nextUpText(ctx: Ctx, idx: number): string | undefined {
  const next = ctx.units[idx + 1];
  if (!next || next.kind === 'done') return undefined;
  const ko = ctx.lang === 'ko';
  if (next.kind === 'intro') return `${ko ? '다음: ' : 'Next: '}${introPhrase(ctx.items[next.itemIdx]!, 'full', ctx.lang)}`;
  if (next.itemIdx === ctx.units[idx]!.itemIdx) return ko ? '다음 세트' : 'next set';
  return `${ko ? '다음: ' : 'Next: '}${introPhrase(ctx.items[next.itemIdx]!, 'short', ctx.lang)}`;
}

type RawBeat = { off: number; text: string; kind: BeatKind };

function unitBeats(ctx: Ctx, idx: number, durMs: number, clipMs: (t: string) => number, trimmed: string[]): RawBeat[] {
  const u = ctx.units[idx]!;
  const { lang, level } = ctx;
  const ko = lang === 'ko';
  const item = u.kind === 'done' ? undefined : itemOf(ctx, u);
  const out: RawBeat[] = [];
  switch (u.kind) {
    case 'intro':
      out.push({ off: 0, text: introPhrase(item!, level, lang), kind: 'name' });
      break;
    case 'rep':
      out.push({ off: 0, text: countWord(u.rep!, lang), kind: 'count' });
      break;
    case 'hold': {
      const hold = item as HoldItem;
      if (u.side && level !== 'count') out.push({ off: 0, text: sideWord(u.side, lang), kind: 'info' });
      const total = hold.holdSec * 1000;
      if (level !== 'count' && hold.holdSec >= 25) out.push({ off: total - 10_000, text: ko ? '10초 남았어요' : 'ten seconds left', kind: 'countdown' });
      if (hold.holdSec >= 6) for (const n of [3, 2, 1]) out.push({ off: total - n * 1000, text: countWord(n, lang), kind: 'countdown' });
      break;
    }
    case 'switch':
      out.push({ off: 0, text: ko ? '반대쪽' : 'other side', kind: 'info' });
      break;
    case 'between':
      out.push({ off: 0, text: level === 'count' ? (ko ? '다시' : 'again') : ko ? '다시 한 번' : 'again', kind: 'info' });
      break;
    case 'rest': {
      const sec = Math.round(durMs / 1000);
      out.push({ off: 0, text: level === 'count' ? (ko ? '휴식' : 'rest') : ko ? `휴식 ${sec}초` : `rest ${secondsPhrase(sec, lang)}`, kind: 'info' });
      const up = nextUpText(ctx, idx);
      if (up && level !== 'count' && sec >= 15) out.push({ off: durMs - 8000, text: up, kind: 'transition' });
      if (sec >= 8) for (const n of [3, 2, 1]) out.push({ off: durMs - n * 1000, text: countWord(n, lang), kind: 'countdown' });
      break;
    }
    case 'move': {
      const p = item as PoomsaeItem;
      const m = p.movements.find((x) => x.id === u.movementId)!;
      let lv: PacingLevel = level;
      let text = movementPhrase(m, lv, lang);
      const levels: PacingLevel[] = ['full', 'short', 'count'];
      while (lv !== 'count' && clipMs(text) > durMs - 200) {
        lv = levels[levels.indexOf(lv) + 1]!;
        text = movementPhrase(m, lv, lang);
        if (!trimmed.includes(m.id)) trimmed.push(m.id);
      }
      out.push({ off: 0, text, kind: 'count' });
      break;
    }
    case 'done':
      out.push({ off: 0, text: ko ? '수고하셨어요' : 'well done', kind: 'info' });
      break;
  }
  return out;
}

function cuesFor(opts: PlanOptions, u: Unit, firstWork: boolean): PreCue[] {
  const cues = opts.preCues ?? [];
  const out: PreCue[] = [];
  for (const c of cues) {
    if (c.movementId && u.kind === 'move' && c.movementId === u.movementId) out.push(c);
    else if (c.itemId && !c.movementId && (u.kind === 'rep' || u.kind === 'hold') && u.itemId === c.itemId && (u.rep ?? 1) === 1 && (u.side ?? 'left') === 'left') out.push(c);
    else if (c.routine && !c.itemId && !c.movementId && firstWork) out.push(c);
  }
  return out;
}

function isWork(u: Unit): boolean {
  return u.kind === 'rep' || u.kind === 'hold' || u.kind === 'move';
}

const CUE_GAP_MS = 120;
const MIN_LEAD_MS = 40;

/**
 * Builds the beat timeline from the unit at `fromIndex` on. Offsets are relative to the timeline start.
 *
 * Rules that keep the rhythm: a unit's start is a fixed grid point (tempo), phrases never move it. Pre-cues (corrections,
 * kihap) take their time from the gap BEFORE their unit: if the previous unit is flexible (intro, rest, switch) the gap is
 * widened, otherwise a cue that does not fit is dropped (and reported), never the beat.
 */
export function planTimeline(opts: PlanOptions, fromIndex: number): Timeline {
  const units = expandUnits(opts.items, opts.tempoFactor ?? 1);
  const ctx: Ctx = { lang: opts.lang, level: opts.level, items: opts.items, units };
  const clip = (t: string) => opts.clipMs?.(t) ?? estimateClipMs(t, opts.lang);
  const beats: Beat[] = [];
  const spans: UnitSpan[] = [];
  const dropped: string[] = [];
  const trimmed: string[] = [];
  let t = opts.leadInMs ?? 800;
  let lastEnd = 0;
  const firstWorkIdx = units.findIndex(isWork);
  const startedBeforeWork = fromIndex <= firstWorkIdx;

  for (let i = Math.max(0, fromIndex); i < units.length; i++) {
    const u = units[i]!;
    const segment = `${u.itemId}:${u.set}`;
    const pre = cuesFor(opts, u, i === firstWorkIdx && startedBeforeWork);
    let start = t;
    // Pre-cues: place them in the gap before the unit.
    if (pre.length > 0) {
      const lens = pre.map((c) => clip(c.text));
      const need = lens.reduce((a, b) => a + b + CUE_GAP_MS, 0);
      const prev = spans[spans.length - 1];
      const flexible = !prev || units[i - 1]?.flexible === true;
      const avail = start - lastEnd;
      if (avail < need && flexible) start += need - avail + MIN_LEAD_MS;
      let cursor = start - MIN_LEAD_MS;
      const placed: Beat[] = [];
      for (let k = pre.length - 1; k >= 0; k--) {
        const c = pre[k]!;
        const at = cursor - lens[k]!;
        if (at < lastEnd + 20) {
          dropped.push(c.id);
          continue;
        }
        placed.unshift({ atMs: at, text: c.text, kind: 'cue', segment, unitKey: u.key, cueId: c.id });
        cursor = at - CUE_GAP_MS;
      }
      beats.push(...placed);
    }
    let dur = u.durMs;
    const raw = unitBeats(ctx, i, dur, clip, trimmed);
    if (u.kind === 'intro' || u.kind === 'done') {
      const spoken = raw[0] ? clip(raw[0].text) : 0;
      dur = Math.max(u.kind === 'done' ? 1500 : 1800, spoken + 600);
    }
    if (u.kind === 'done' || u.itemIdx >= 0) {
      for (const r of raw) {
        const at = start + Math.max(0, r.off);
        beats.push({ atMs: at, text: r.text, kind: r.kind, segment, unitKey: u.key });
        lastEnd = Math.max(lastEnd, at + clip(r.text));
      }
    }
    // The previous span ends where this one starts (flexible lengthening).
    const prevSpan = spans[spans.length - 1];
    if (prevSpan) prevSpan.endMs = start;
    spans.push({ unit: u, startMs: start, endMs: start + dur });
    t = start + dur;
  }
  beats.sort((a, b) => a.atMs - b.atMs);
  return { beats, spans, totalMs: t, droppedCues: dropped, trimmed };
}

/** The unit being performed `offsetMs` after the timeline start (the first unit before the first span starts). */
export function spanAt(tl: Timeline, offsetMs: number): UnitSpan | undefined {
  let found: UnitSpan | undefined;
  for (const s of tl.spans) {
    if (s.startMs <= offsetMs) found = s;
    else break;
  }
  return found ?? tl.spans[0];
}

export type { ExerciseItem };
