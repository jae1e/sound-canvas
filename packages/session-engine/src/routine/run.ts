import type { Lang } from '../types';
import {
  cloneItems,
  describeItem,
  itemsDiffer,
  MAX_TEMPO_FACTOR,
  MIN_TEMPO_FACTOR,
  TEMPO_STEP,
  type ExerciseItem,
  type HoldItem,
  type PoomsaeItem,
  type RoutineItem,
  type RoutineTemplate,
} from './model';
import { expandUnits, resolveCursor, type PacingLevel, type Unit } from './plan';
import { squash } from '../parser/common';

export type RunStatus = 'ready' | 'running' | 'paused' | 'ended';

export type DeviationKind = 'skip' | 'more_reps' | 'sets' | 'rest' | 'swap' | 'repeat_from' | 'back' | 'tempo' | 'pause' | 'end_early';

export interface Deviation {
  at: number;
  kind: DeviationKind;
  itemId?: string;
  detail?: string;
}

/**
 * A routine session. `template` is the plan and is never mutated; `items` is the session copy that commands change;
 * `deviations` is the log of what was changed on the fly.
 */
export interface RunState {
  readonly template: RoutineTemplate;
  readonly items: RoutineItem[];
  readonly tempoFactor: number;
  readonly level: PacingLevel;
  readonly lang: Lang;
  readonly status: RunStatus;
  /** Key of the current unit (see plan.ts); null before the first unit. */
  readonly cursor: string | null;
  readonly deviations: readonly Deviation[];
  readonly endedEarly: boolean;
}

export type RoutineCommand =
  | { kind: 'skip' }
  | { kind: 'more_reps'; n: number }
  | { kind: 'sets'; delta: 1 | -1 }
  | { kind: 'rest'; sec: number }
  | { kind: 'swap'; from?: string; to: string }
  | { kind: 'repeat_from'; no: number }
  | { kind: 'back' }
  | { kind: 'tempo'; dir: 'slower' | 'faster' }
  | { kind: 'pause' }
  | { kind: 'resume' }
  | { kind: 'query'; query: 'left' | 'next' }
  | { kind: 'end' };

export interface CommandResult {
  state: RunState;
  /** Short spoken reply in the run language. */
  reply: string;
  /** False when the command was understood but could not be applied. */
  ok: boolean;
  /** The pacing timeline must be rebuilt from the new state. */
  replan: boolean;
}

export function startRun(template: RoutineTemplate, level: PacingLevel, lang: Lang = template.lang): RunState {
  return {
    template,
    items: cloneItems(template.items),
    tempoFactor: 1,
    level,
    lang,
    status: 'ready',
    cursor: null,
    deviations: [],
    endedEarly: false,
  };
}

export function unitsOf(s: RunState): Unit[] {
  return expandUnits(s.items, s.tempoFactor);
}

export function currentIndex(s: RunState, units = unitsOf(s)): number {
  return resolveCursor(units, s.cursor ?? units[0]?.key);
}

const t = (lang: Lang, ko: string, en: string) => (lang === 'ko' ? ko : en);

function withItem(s: RunState, itemId: string, edit: (it: RoutineItem) => RoutineItem): RoutineItem[] {
  return s.items.map((it) => (it.id === itemId ? edit(it) : it));
}

function log(s: RunState, now: number, kind: DeviationKind, itemId?: string, detail?: string): Deviation[] {
  return [...s.deviations, { at: now, kind, ...(itemId ? { itemId } : {}), ...(detail ? { detail } : {}) }];
}

function isWork(u: Unit): boolean {
  return u.kind === 'rep' || u.kind === 'hold' || u.kind === 'move';
}

function itemName(it: RoutineItem | undefined, lang: Lang): string {
  return it ? it.name : t(lang, '다음', 'next');
}

function remainingMs(units: Unit[], from: number): number {
  let ms = 0;
  for (let i = from; i < units.length; i++) ms += units[i]!.durMs || (units[i]!.kind === 'intro' ? 2200 : 0);
  return ms;
}

function findItemByName(items: RoutineItem[], q: string, fromIdx: number): RoutineItem | undefined {
  const key = squash(q);
  if (!key) return undefined;
  const order = [...items.slice(fromIdx), ...items.slice(0, fromIdx)];
  return order.find((it) => squash(it.name) === key) ?? order.find((it) => squash(it.name).includes(key) || key.includes(squash(it.name)));
}

/** Applies one live command to the session copy. Pure: returns the new state and a spoken reply. */
export function applyCommand(s: RunState, cmd: RoutineCommand, now: number): CommandResult {
  const lang = s.lang;
  const units = unitsOf(s);
  const ci = currentIndex(s, units);
  const cur = units[ci];
  const item = cur && cur.itemId !== 'end' ? s.items[cur.itemIdx] : undefined;
  const no = (reply: string): CommandResult => ({ state: s, reply, ok: false, replan: false });
  const yes = (state: RunState, reply: string, replan = true): CommandResult => ({ state, reply, ok: true, replan });

  if (s.status === 'ended') return no(t(lang, '루틴이 끝났어요.', 'The routine has ended.'));

  switch (cmd.kind) {
    case 'pause':
      if (s.status === 'paused') return no(t(lang, '이미 멈춰 있어요.', 'Already paused.'));
      return yes({ ...s, status: 'paused', cursor: cur?.key ?? s.cursor, deviations: log(s, now, 'pause') }, t(lang, '일시정지했어요.', 'Paused.'));
    case 'resume':
      if (s.status !== 'paused') return no(t(lang, '멈춰 있지 않아요.', 'It is not paused.'));
      return yes({ ...s, status: 'running' }, t(lang, '다시 시작할게요.', 'Resuming.'));
    case 'end':
      return yes({ ...s, status: 'ended', endedEarly: true, deviations: log(s, now, 'end_early') }, t(lang, '루틴을 여기서 마칠게요.', 'Ending the routine here.'), false);
    case 'skip': {
      if (!cur || cur.kind === 'done') return no(t(lang, '건너뛸 게 없어요.', 'Nothing to skip.'));
      // Skipping a rest/switch/between unit skips only that unit; otherwise the rest of the current item.
      const minor = cur.kind === 'rest' || cur.kind === 'switch' || cur.kind === 'between';
      const next = minor ? units[ci + 1] : units.find((u, i) => i > ci && u.itemIdx > cur.itemIdx);
      if (!next) return no(t(lang, '건너뛸 게 없어요.', 'Nothing to skip.'));
      const nextItem = next.kind === 'done' ? undefined : s.items[next.itemIdx];
      const reply = nextItem
        ? t(lang, `건너뛸게요. 다음은 ${describeItem(nextItem, lang)}.`, `Skipping. Next: ${describeItem(nextItem, lang)}.`)
        : t(lang, '건너뛸게요. 이게 마지막이었어요.', 'Skipping. That was the last one.');
      return yes({ ...s, cursor: next.key, deviations: log(s, now, 'skip', cur.itemId) }, reply);
    }
    case 'more_reps': {
      if (!item || item.kind !== 'exercise') return no(t(lang, '지금은 횟수를 늘릴 수 없어요.', 'I can only add reps during an exercise.'));
      const reps = Math.min(500, item.reps + cmd.n);
      const items = withItem(s, item.id, (it) => ({ ...(it as ExerciseItem), reps }));
      return yes({ ...s, items, cursor: cur!.key, deviations: log(s, now, 'more_reps', item.id, `+${cmd.n}`) }, t(lang, `${cmd.n}개 더 할게요. ${reps}개로 늘렸어요.`, `${cmd.n} more reps. Now ${reps}.`));
    }
    case 'sets': {
      if (!item || (item.kind !== 'exercise' && item.kind !== 'hold')) return no(t(lang, '지금은 세트를 바꿀 수 없어요.', 'I can only change sets during an exercise or hold.'));
      const cursorSet = cur!.set;
      const sets = item.sets + cmd.delta;
      if (sets < 1) return no(t(lang, '이미 한 세트예요.', 'It is already a single set.'));
      if (sets > 50) return no(t(lang, '세트가 너무 많아요.', 'That is too many sets.'));
      const items = withItem(s, item.id, (it) => ({ ...(it as ExerciseItem | HoldItem), sets }));
      let cursor = cur!.key;
      if (cursorSet > sets) {
        const after = expandUnits(items, s.tempoFactor);
        cursor = after.find((u) => u.itemIdx > cur!.itemIdx)?.key ?? 'end|done|0||';
      }
      return yes(
        { ...s, items, cursor, deviations: log(s, now, 'sets', item.id, cmd.delta > 0 ? '+1' : '-1') },
        cmd.delta > 0 ? t(lang, `한 세트 더 할게요. 총 ${sets}세트예요.`, `One more set. ${sets} in total.`) : t(lang, `한 세트 줄일게요. 총 ${sets}세트예요.`, `One fewer set. ${sets} in total.`),
      );
    }
    case 'rest': {
      const sec = Math.round(cmd.sec);
      if (sec < 0 || sec > 600) return no(t(lang, '그 휴식 시간은 쓸 수 없어요.', 'That rest time is out of range.'));
      // The current item and every later exercise/hold take the new rest; an explicit rest item being rested in changes too.
      const from = cur?.itemIdx ?? 0;
      const items = s.items.map((it, i) => {
        if (i < from) return it;
        if (it.kind === 'exercise' || it.kind === 'hold') return { ...it, restSec: sec };
        if (it.kind === 'rest' && i === from && sec > 0) return { ...it, sec };
        return it;
      });
      return yes({ ...s, items, cursor: cur?.key ?? s.cursor, deviations: log(s, now, 'rest', item?.id, `${sec}s`) }, t(lang, `휴식을 ${sec}초로 바꿨어요.`, `Rest is now ${sec} seconds.`));
    }
    case 'swap': {
      const target = cmd.from ? findItemByName(s.items, cmd.from, cur?.itemIdx ?? 0) : item;
      if (!target || target.kind === 'rest' || target.kind === 'poomsae') return no(t(lang, '바꿀 운동을 못 찾았어요.', 'I could not find the exercise to swap.'));
      const to = cmd.to.trim();
      if (!to) return no(t(lang, '무엇으로 바꿀까요?', 'Swap for what?'));
      const items = withItem(s, target.id, (it) => ({ ...it, name: to }));
      return yes({ ...s, items, cursor: cur?.key ?? s.cursor, deviations: log(s, now, 'swap', target.id, `${target.name} -> ${to}`) }, t(lang, `${target.name} 대신 ${to}로 할게요.`, `${to} instead of ${target.name}.`));
    }
    case 'repeat_from': {
      if (!cur || !item || item.kind !== 'poomsae') return no(t(lang, '품새를 하는 중에만 쓸 수 있어요.', 'That only works during a poomsae.'));
      const m = (item as PoomsaeItem).movements.find((x) => x.no === cmd.no);
      if (!m) return no(t(lang, `${cmd.no}번 동작이 없어요.`, `There is no movement ${cmd.no}.`));
      const target = units.find((u) => u.kind === 'move' && u.itemIdx === cur.itemIdx && u.set === cur.set && u.movementId === m.id);
      if (!target) return no(t(lang, '그 동작으로 갈 수 없어요.', 'Cannot go to that movement.'));
      return yes({ ...s, cursor: target.key, deviations: log(s, now, 'repeat_from', item.id, String(cmd.no)) }, t(lang, `${cmd.no}번 동작부터 다시 할게요.`, `From movement ${cmd.no} again.`));
    }
    case 'back': {
      if (!cur) return no(t(lang, '돌아갈 곳이 없어요.', 'Nothing to go back to.'));
      let j = ci - 1;
      while (j >= 0 && !isWork(units[j]!)) j--;
      const target = j >= 0 && units[j]!.itemIdx === cur.itemIdx ? units[j]! : units.find((u) => u.itemIdx === cur.itemIdx && u.kind === 'intro') ?? units[Math.max(0, j)];
      if (!target || target.key === cur.key) return no(t(lang, '더 돌아갈 수 없어요.', 'Cannot go back further.'));
      return yes({ ...s, cursor: target.key, deviations: log(s, now, 'back', cur.itemId) }, target.kind === 'move' ? t(lang, `${target.rep}번 동작으로 돌아갈게요.`, `Back to movement ${target.rep}.`) : t(lang, '한 단계 돌아갈게요.', 'Going back one.'));
    }
    case 'tempo': {
      const raw = cmd.dir === 'slower' ? s.tempoFactor * (1 + TEMPO_STEP) : s.tempoFactor * (1 - TEMPO_STEP);
      const f = Math.round(Math.min(MAX_TEMPO_FACTOR, Math.max(MIN_TEMPO_FACTOR, raw)) * 1000) / 1000;
      if (f === s.tempoFactor) return no(cmd.dir === 'slower' ? t(lang, '이미 가장 느려요.', 'That is already the slowest.') : t(lang, '이미 가장 빨라요.', 'That is already the fastest.'));
      return yes(
        { ...s, tempoFactor: f, cursor: cur?.key ?? s.cursor, deviations: log(s, now, 'tempo', undefined, String(f)) },
        t(lang, `${cmd.dir === 'slower' ? '더 천천히' : '더 빠르게'} 할게요. 속도 ${Math.round(100 / f)}퍼센트.`, `${cmd.dir === 'slower' ? 'Slower' : 'Faster'}: ${Math.round(100 / f)} percent speed.`),
      );
    }
    case 'query': {
      if (!cur || cur.kind === 'done') return no(t(lang, '남은 게 없어요.', 'Nothing is left.'));
      if (cmd.query === 'next') {
        const nextItem = units.find((u, i) => i > ci && u.itemIdx > cur.itemIdx);
        const sameItemMore = item && (item.kind === 'exercise' || item.kind === 'hold') && cur.set < cur.sets;
        if (sameItemMore) return { state: s, ok: true, replan: false, reply: t(lang, `다음은 ${itemName(item, lang)} ${cur.set + 1}세트예요.`, `Next is set ${cur.set + 1} of ${itemName(item, lang)}.`) };
        const ni = nextItem && nextItem.kind !== 'done' ? s.items[nextItem.itemIdx] : undefined;
        return { state: s, ok: true, replan: false, reply: ni ? t(lang, `다음은 ${describeItem(ni, lang)}.`, `Next is ${describeItem(ni, lang)}.`) : t(lang, '이게 마지막이에요.', 'This is the last one.') };
      }
      const left = s.items.length - cur.itemIdx - 1;
      const mins = Math.max(1, Math.round(remainingMs(units, ci) / 60_000));
      let here = '';
      if (item?.kind === 'exercise') here = t(lang, `${item.name} ${cur.set}세트 중 ${item.reps - (cur.rep ?? 0)}개 남았고, `, `${item.reps - (cur.rep ?? 0)} reps left in set ${cur.set} of ${item.name}, `);
      if (item?.kind === 'poomsae' && cur.rep) here = t(lang, `${item.name} ${item.movements.length - cur.rep}동작 남았고, `, `${item.movements.length - cur.rep} movements left in ${item.name}, `);
      return { state: s, ok: true, replan: false, reply: t(lang, `${here}운동 ${left}개 더, 약 ${mins}분 남았어요.`, `${here}${left} more ${left === 1 ? 'item' : 'items'}, about ${mins} min left.`) };
    }
  }
}

/** Moves the cursor to a unit (used when the timeline reports progress, or to start the run). */
export function withCursor(s: RunState, key: string | null): RunState {
  return s.cursor === key ? s : { ...s, cursor: key };
}

export function beginRun(s: RunState): RunState {
  return { ...s, status: 'running', cursor: unitsOf(s)[0]?.key ?? null };
}

export function endRun(s: RunState, now: number): RunState {
  return s.status === 'ended' ? s : { ...s, status: 'ended' };
}

/** Items of the session copy with the tempo factor baked in (what "save changes to the template" would store). */
export function itemsForSave(s: RunState): RoutineItem[] {
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return cloneItems(s.items).map((it) => {
    if (s.tempoFactor === 1) return it;
    if (it.kind === 'exercise') return { ...it, secPerRep: r1(it.secPerRep * s.tempoFactor), ...(it.pattern ? { pattern: it.pattern.map((p) => r1(p * s.tempoFactor)) } : {}) };
    if (it.kind === 'poomsae') return { ...it, secPerCount: r1(it.secPerCount * s.tempoFactor) };
    return it;
  });
}

/** True when the session copy differs from the template in a way worth saving (reps, sets, rest, names, tempo). */
export function hasSavableChanges(s: RunState): boolean {
  return itemsDiffer(s.template.items, itemsForSave(s));
}

/** The template that "save changes" would store (same id: overwrite; built-in templates need a new id). */
export function templateWithChanges(s: RunState, id = s.template.id): RoutineTemplate {
  return { ...s.template, id, builtin: undefined, items: itemsForSave(s) };
}

export interface RunSummary {
  completedUnits: number;
  totalUnits: number;
  endedEarly: boolean;
  skippedItems: number;
  deviationCount: number;
}

export function summarizeRun(s: RunState): RunSummary {
  const units = unitsOf(s);
  const ci = s.status === 'ended' && !s.endedEarly ? units.length : currentIndex(s, units);
  return {
    completedUnits: ci,
    totalUnits: units.length,
    endedEarly: s.endedEarly,
    skippedItems: s.deviations.filter((d) => d.kind === 'skip').length,
    deviationCount: s.deviations.length,
  };
}
