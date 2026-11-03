import { z } from 'zod';
import type { Session } from './types';

const rev = z.number().int().nonnegative();
const ms = z.number().finite();
const delivery = z.enum(['scheduled', 'delivered', 'expired', 'cancelled']);

const taskSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  status: z.enum(['pending', 'in_progress', 'awaiting_confirmation', 'completed', 'skipped', 'cancelled']),
  createdAt: ms,
  lastReport: z
    .object({ kind: z.enum(['done', 'not_yet', 'skipped']), at: ms, source: z.enum(['voice', 'ui', 'llm', 'system']) })
    .optional(),
  order: z.number().int().nonnegative().optional(),
  estimateMs: ms.positive().optional(),
  startedAt: ms.optional(),
  rev,
});

const timerSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  taskId: z.string().optional(),
  durationMs: ms.positive(),
  clockPolicy: z.enum(['wall', 'active']),
  state: z.enum(['running', 'paused', 'expired', 'cancelled']),
  accumulatedMs: ms.nonnegative(),
  runningSince: ms.optional(),
  milestones: z.array(z.object({ id: z.string(), kind: z.enum(['elapsed', 'remaining']), offsetMs: ms.positive(), status: delivery })),
  expiryStatus: delivery,
  pausedBySession: z.boolean(),
  createdAt: ms,
  rev,
});

const checkInSchema = z.object({
  id: z.string().min(1),
  taskId: z.string(),
  dueAt: ms,
  status: z.enum(['scheduled', 'awaiting_reply', 'answered', 'cancelled', 'expired']),
  attempts: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  followUpMs: ms.positive(),
  lastAskedAt: ms.optional(),
  reason: z.literal('overrun').optional(),
  rev,
});

const nudgeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['focus_break', 'skipped_step']),
  taskId: z.string().optional(),
  dueAt: ms,
  status: delivery,
  repeatMs: ms.positive().optional(),
  rev,
});

export const sessionSchema = z.object({
  id: z.string().min(1),
  mode: z.enum(['walk', 'activity', 'vocal', 'journal']),
  status: z.enum(['draft', 'ready', 'active', 'paused', 'ended']),
  lang: z.enum(['ko', 'en']),
  revision: rev,
  quiet: z.boolean(),
  quietUntil: ms.optional(),
  currentTaskId: z.string().optional(),
  createdAt: ms,
  startedAt: ms.optional(),
  pausedAt: ms.optional(),
  endedAt: ms.optional(),
  tasks: z.record(z.string(), taskSchema),
  timers: z.record(z.string(), timerSchema),
  checkIns: z.record(z.string(), checkInSchema),
  // Sessions saved before nudges existed restore with none.
  nudges: z.record(z.string(), nudgeSchema).default({}),
  controlRev: rev,
  appliedKeys: z.array(z.string()),
});

/** Validates stored or untrusted session JSON. Returns null when it does not match the engine's schema. */
export function parseSession(json: unknown): Session | null {
  const r = sessionSchema.safeParse(json);
  return r.success ? (r.data as Session) : null;
}
