import { z } from 'zod';

import type { Lang } from '../types';

/**
 * Work Partner routines (workout, stretching, poomsae).
 *
 * The TEMPLATE (`RoutineTemplate`, the plan) is never changed by a session. A running session works on a copy
 * (`RoutineRun.items`) and records its deviations; the user may then save the changes back to the template.
 */

/** Text in both languages (used by built-in poomsae data). */
export interface Bi {
  ko: string;
  en: string;
}

/** Compass-style facing: N is the direction the practitioner faces at the start line. */
export type Facing = 'N' | 'E' | 'S' | 'W';

export interface ExerciseItem {
  kind: 'exercise';
  id: string;
  name: string;
  reps: number;
  sets: number;
  /** Seconds per rep. */
  secPerRep: number;
  /** Optional phase seconds (for example [2, 1, 2] = lower, pause, lift); the rep lasts their sum. Counts are spoken at rep start. */
  pattern?: number[];
  /** Rest between sets, seconds. */
  restSec: number;
}

export interface HoldItem {
  kind: 'hold';
  id: string;
  name: string;
  /** Seconds per hold (per side when `perSide`). */
  holdSec: number;
  sets: number;
  /** Left then right. */
  perSide: boolean;
  restSec: number;
}

export interface RestItem {
  kind: 'rest';
  id: string;
  name: string;
  sec: number;
}

export interface Movement {
  id: string;
  /** Count number spoken for this movement (1-based, the official movement number). */
  no: number;
  stance: Bi;
  technique: Bi;
  /** Facing after the movement. */
  facing: Facing;
  /** Turn made before the movement, for display ("turn 90° left"). */
  turn?: Bi;
  /** The movement is performed with a 기합 (kihap). */
  kihap?: boolean;
}

export interface PoomsaeItem {
  kind: 'poomsae';
  id: string;
  name: string;
  /** Times the whole form is performed in a row. */
  repeat: number;
  /** Seconds per count (movement). */
  secPerCount: number;
  movements: Movement[];
}

export type RoutineItem = ExerciseItem | HoldItem | RestItem | PoomsaeItem;

export interface RoutineTemplate {
  id: string;
  name: string;
  lang: Lang;
  items: RoutineItem[];
  /** Shipped with the app; cannot be overwritten, "save changes" creates a copy. */
  builtin?: boolean;
}

export const DEFAULT_REST_SEC = 30;
export const DEFAULT_SEC_PER_REP = 3;
export const DEFAULT_SEC_PER_COUNT = 2.5;
export const MIN_TEMPO_FACTOR = 0.5;
export const MAX_TEMPO_FACTOR = 2;
export const TEMPO_STEP = 0.15;

const bi = z.object({ ko: z.string(), en: z.string() });
const itemBase = { id: z.string().min(1), name: z.string().trim().min(1) };

export const routineItemSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('exercise'),
    ...itemBase,
    reps: z.number().int().min(1).max(500),
    sets: z.number().int().min(1).max(50),
    secPerRep: z.number().min(0.5).max(30),
    pattern: z.array(z.number().min(0.2).max(20)).max(8).optional(),
    restSec: z.number().min(0).max(600),
  }),
  z.object({
    kind: z.literal('hold'),
    ...itemBase,
    holdSec: z.number().min(1).max(1800),
    sets: z.number().int().min(1).max(50),
    perSide: z.boolean(),
    restSec: z.number().min(0).max(600),
  }),
  z.object({ kind: z.literal('rest'), ...itemBase, sec: z.number().min(1).max(1800) }),
  z.object({
    kind: z.literal('poomsae'),
    ...itemBase,
    repeat: z.number().int().min(1).max(50),
    secPerCount: z.number().min(0.8).max(20),
    movements: z
      .array(
        z.object({
          id: z.string().min(1),
          no: z.number().int().min(1),
          stance: bi,
          technique: bi,
          facing: z.enum(['N', 'E', 'S', 'W']),
          turn: bi.optional(),
          kihap: z.boolean().optional(),
        }),
      )
      .min(1)
      .max(200),
  }),
]);

export const routineTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  lang: z.enum(['ko', 'en']),
  items: z.array(routineItemSchema).min(1).max(100),
  builtin: z.boolean().optional(),
});

/** Parses and validates stored JSON. Throws a ZodError on bad data. */
export function parseRoutineTemplate(json: unknown): RoutineTemplate {
  return routineTemplateSchema.parse(json) as RoutineTemplate;
}

export function cloneItems(items: readonly RoutineItem[]): RoutineItem[] {
  return JSON.parse(JSON.stringify(items)) as RoutineItem[];
}

/** Seconds of one exercise rep (pattern sum wins). */
export function repSeconds(item: ExerciseItem): number {
  return item.pattern && item.pattern.length > 0 ? item.pattern.reduce((a, b) => a + b, 0) : item.secPerRep;
}

/** Rough total duration of a routine in seconds at the base tempo (for display). */
export function routineSeconds(items: readonly RoutineItem[]): number {
  let total = 0;
  for (const it of items) {
    switch (it.kind) {
      case 'exercise':
        total += it.sets * it.reps * repSeconds(it) + (it.sets - 1) * it.restSec + 3;
        break;
      case 'hold':
        total += it.sets * (it.perSide ? 2 : 1) * it.holdSec + (it.sets - 1) * it.restSec + (it.perSide ? it.sets * 3 : 0) + 3;
        break;
      case 'rest':
        total += it.sec;
        break;
      case 'poomsae':
        total += it.repeat * it.movements.length * it.secPerCount + (it.repeat - 1) * 4 + 4;
        break;
    }
  }
  return Math.round(total);
}

/** One-line spoken or displayed description of an item. */
export function describeItem(item: RoutineItem, lang: Lang): string {
  const ko = lang === 'ko';
  switch (item.kind) {
    case 'exercise':
      return ko ? `${item.name} ${item.reps}개 ${item.sets}세트` : `${item.name} ${item.reps} reps, ${item.sets} ${item.sets === 1 ? 'set' : 'sets'}`;
    case 'hold': {
      const side = item.perSide ? (ko ? ' 좌우' : ' each side') : '';
      const sets = item.sets > 1 ? (ko ? ` ${item.sets}세트` : `, ${item.sets} sets`) : '';
      return ko ? `${item.name}${side} ${item.holdSec}초${sets}` : `${item.name}${side} ${item.holdSec} seconds${sets}`;
    }
    case 'rest':
      return ko ? `휴식 ${item.sec}초` : `Rest ${item.sec} seconds`;
    case 'poomsae':
      return ko ? `${item.name}${item.repeat > 1 ? ` ${item.repeat}번` : ''}` : `${item.name}${item.repeat > 1 ? ` x${item.repeat}` : ''}`;
  }
}

/** Items differ from the template (reps, sets, rest, tempo, names, order). Transient moves are not items, so they never count. */
export function itemsDiffer(a: readonly RoutineItem[], b: readonly RoutineItem[]): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}
