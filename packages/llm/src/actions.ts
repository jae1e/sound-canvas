import type { Action, Ref, RoutineCommand } from '@vlc/session-engine';
import { z } from 'zod';

import { bad, type Checked, ok } from './task';

/** Work Partner actions the model may propose. Everything else (plans, journal, navigation) stays deterministic. */
export const WORK_TYPES = [
  'start_timer',
  'extend_timer',
  'pause_timer',
  'resume_timer',
  'cancel_timer',
  'task_done',
  'task_not_yet',
  'skip_task',
  'extend_task',
  'add_task',
  'add_step',
  'next_step',
  'prev_step',
  'set_quiet',
  'pause_session',
  'resume_session',
  'end_session',
  'none',
] as const;

/** Live routine commands. */
export const ROUTINE_TYPES = [
  'skip',
  'more_reps',
  'sets_add',
  'sets_remove',
  'rest',
  'swap',
  'repeat_from',
  'back',
  'tempo_slower',
  'tempo_faster',
  'pause',
  'resume',
  'query_left',
  'query_next',
  'end',
  'none',
] as const;

export type WorkType = (typeof WORK_TYPES)[number];
export type RoutineType = (typeof ROUTINE_TYPES)[number];
export type Mode = 'work' | 'routine';

export const typesFor = (mode: Mode): readonly string[] => (mode === 'work' ? WORK_TYPES : ROUTINE_TYPES);

/**
 * Flat action record. Every field is required (sentinel values: '' / 0 / false) so constrained decoding stays simple and
 * small models cannot omit a key. `target` is an existing task/timer label ('' = the obvious one), `label` a new name,
 * `from` the thing being replaced.
 */
export const flatFields = (mode: Mode) => ({
  type: z.enum(typesFor(mode) as [string, ...string[]]),
  target: z.string(),
  label: z.string(),
  from: z.string(),
  seconds: z.number(),
  count: z.number(),
  flag: z.boolean(),
});
export const flatSchema = (mode: Mode) => z.object(flatFields(mode));
export interface Flat {
  type: string;
  target: string;
  label: string;
  from: string;
  seconds: number;
  count: number;
  flag: boolean;
}

export type Mapped = { domain: 'work'; action: Action } | { domain: 'routine'; command: RoutineCommand };

const MAX_SECONDS = 24 * 3600;
const ref = (target: string): Ref => (target.trim() ? { label: target.trim() } : { implicit: true });

/** Actions that cannot be undone cheaply: always confirmed, whatever the model says (technical-decisions §5.5). */
export const HARD_TO_UNDO = new Set<string>(['cancel_timer', 'end_session', 'skip_task', 'end']);

/** Maps a flat record to an engine action or routine command. Returns `none` as ok(null). */
export function mapFlat(f: Flat, mode: Mode): Checked<Mapped | null> {
  if (!typesFor(mode).includes(f.type)) return bad(`type_not_allowed:${f.type}`);
  if (f.type === 'none') return ok(null);
  const secs = Math.round(f.seconds);
  const needSecs = () => secs >= 1 && secs <= MAX_SECONDS;
  const w = (action: Action): Checked<Mapped> => ok({ domain: 'work', action });
  const r = (command: RoutineCommand): Checked<Mapped> => ok({ domain: 'routine', command });
  if (mode === 'work') {
    switch (f.type as WorkType) {
      case 'start_timer':
        if (!f.label.trim()) return bad('missing_label');
        return needSecs() ? w({ type: 'start_timer', label: f.label.trim(), durationMs: secs * 1000 }) : bad('bad_duration');
      case 'extend_timer':
        return needSecs() ? w({ type: 'extend_timer', timer: ref(f.target), byMs: secs * 1000 }) : bad('bad_duration');
      case 'pause_timer':
        return w({ type: 'pause_timer', timer: ref(f.target) });
      case 'resume_timer':
        return w({ type: 'resume_timer', timer: ref(f.target) });
      case 'cancel_timer':
        return w({ type: 'cancel_timer', timer: ref(f.target) });
      case 'task_done':
        return w({ type: 'report_task', task: ref(f.target), report: 'done' });
      case 'task_not_yet':
        return w({ type: 'report_task', task: ref(f.target), report: 'not_yet' });
      case 'skip_task':
        return w({ type: 'skip_task', task: ref(f.target) });
      case 'extend_task':
        return needSecs() ? w({ type: 'extend_task', task: ref(f.target), byMs: secs * 1000 }) : bad('bad_duration');
      case 'add_task':
        return f.label.trim() ? w({ type: 'add_task', label: f.label.trim() }) : bad('missing_label');
      case 'add_step':
        return f.label.trim() ? w({ type: 'add_step', label: f.label.trim() }) : bad('missing_label');
      case 'next_step':
        return w({ type: 'next_step' });
      case 'prev_step':
        return w({ type: 'prev_step' });
      case 'set_quiet':
        return w({ type: 'set_quiet', quiet: f.flag, ...(f.flag && secs > 0 && secs <= MAX_SECONDS ? { forMs: secs * 1000 } : {}) });
      case 'pause_session':
        return w({ type: 'pause_session' });
      case 'resume_session':
        return w({ type: 'resume_session' });
      case 'end_session':
        return w({ type: 'end_session' });
    }
    return bad(`unmapped:${f.type}`);
  }
  switch (f.type as RoutineType) {
    case 'skip':
      return r({ kind: 'skip' });
    case 'more_reps': {
      const n = Math.round(f.count);
      return n >= 1 && n <= 500 ? r({ kind: 'more_reps', n }) : bad('bad_count');
    }
    case 'sets_add':
      return r({ kind: 'sets', delta: 1 });
    case 'sets_remove':
      return r({ kind: 'sets', delta: -1 });
    case 'rest':
      return secs >= 0 && secs <= 600 ? r({ kind: 'rest', sec: secs }) : bad('bad_duration');
    case 'swap':
      return f.label.trim() ? r({ kind: 'swap', to: f.label.trim(), ...(f.from.trim() ? { from: f.from.trim() } : {}) }) : bad('missing_label');
    case 'repeat_from': {
      const no = Math.round(f.count);
      return no >= 1 && no <= 200 ? r({ kind: 'repeat_from', no }) : bad('bad_count');
    }
    case 'back':
      return r({ kind: 'back' });
    case 'tempo_slower':
      return r({ kind: 'tempo', dir: 'slower' });
    case 'tempo_faster':
      return r({ kind: 'tempo', dir: 'faster' });
    case 'pause':
      return r({ kind: 'pause' });
    case 'resume':
      return r({ kind: 'resume' });
    case 'query_left':
      return r({ kind: 'query', query: 'left' });
    case 'query_next':
      return r({ kind: 'query', query: 'next' });
    case 'end':
      return r({ kind: 'end' });
  }
  return bad(`unmapped:${f.type}`);
}

const fmt = (sec: number, ko: boolean): string => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (ko) return `${m ? `${m}분` : ''}${s ? ` ${s}초` : ''}`.trim();
  return `${m ? `${m} min` : ''}${s ? ` ${s} sec` : ''}`.trim();
};

/** Short spoken summary of a proposed action, used for the default confirmation question. */
export function describeFlat(f: Flat, ko: boolean): string {
  const tgt = f.target.trim();
  const secs = Math.round(f.seconds);
  switch (f.type) {
    case 'start_timer':
      return ko ? `${f.label} ${fmt(secs, true)} 타이머를 시작` : `start a ${fmt(secs, false)} ${f.label} timer`;
    case 'extend_timer':
    case 'extend_task':
      return ko ? `${tgt || '타이머'} ${fmt(secs, true)} 연장` : `add ${fmt(secs, false)} to ${tgt || 'the timer'}`;
    case 'cancel_timer':
      return ko ? `${tgt || '타이머'} 취소` : `cancel ${tgt || 'the timer'}`;
    case 'end_session':
    case 'end':
      return ko ? '여기서 끝내기' : 'end here';
    case 'skip_task':
      return ko ? `${tgt || '이 작업'} 건너뛰기` : `skip ${tgt || 'this task'}`;
    case 'task_done':
      return ko ? `${tgt || '이 작업'} 완료로 표시` : `mark ${tgt || 'this task'} done`;
    case 'add_task':
    case 'add_step':
      return ko ? `${f.label} 추가` : `add ${f.label}`;
    case 'swap':
      return ko ? `${f.from ? `${f.from} 대신 ` : ''}${f.label}로 바꾸기` : `swap ${f.from ? `${f.from} for ` : ''}${f.label}`;
    default:
      return ko ? '그렇게 할까요' : 'do that';
  }
}

export const defaultConfirmQuestion = (f: Flat, ko: boolean): string => (ko ? `${describeFlat(f, true)}, 맞나요?` : `${describeFlat(f, false)}, right?`);
