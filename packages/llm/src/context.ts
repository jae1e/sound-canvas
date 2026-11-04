import type { RunState, Session } from '@vlc/session-engine';
import { z } from 'zod';

/** Compact, serialisable snapshot of what the user can refer to right now. Built on the device; sent to the model. */
export const contextSchema = z.object({
  mode: z.enum(['work', 'routine']).default('work'),
  /** Open task / step labels. */
  tasks: z.array(z.string().max(80)).max(30).default([]),
  /** Live timers. */
  timers: z.array(z.object({ label: z.string().max(80), remainingSec: z.number().optional() })).max(20).default([]),
  /** Current plan step (work) or current exercise (routine). */
  current: z.string().max(80).optional(),
  /** Routine item names in order (routine mode). */
  items: z.array(z.string().max(80)).max(40).default([]),
});
export type LlmContext = z.infer<typeof contextSchema>;

export const langSchema = z.enum(['ko', 'en']);
export const turnsSchema = z.array(z.object({ heard: z.string().max(300), reply: z.string().max(300).nullable() })).max(4).default([]);

export function contextFromSession(s: Session, now: number): LlmContext {
  const open = Object.values(s.tasks).filter((t) => !['completed', 'skipped', 'cancelled'].includes(t.status));
  return {
    mode: 'work',
    tasks: open.map((t) => t.label),
    timers: Object.values(s.timers)
      .filter((t) => t.state === 'running' || t.state === 'paused')
      .map((t) => ({ label: t.label, remainingSec: Math.max(0, Math.round((t.durationMs - t.accumulatedMs - (t.runningSince !== undefined ? now - t.runningSince : 0)) / 1000)) })),
    ...(s.currentTaskId && s.tasks[s.currentTaskId] ? { current: s.tasks[s.currentTaskId]!.label } : {}),
    items: [],
  };
}

export function contextFromRun(run: RunState, currentItemName?: string): LlmContext {
  return { mode: 'routine', tasks: [], timers: [], items: run.items.map((i) => i.name), ...(currentItemName ? { current: currentItemName } : {}) };
}

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/** Context lines for the user message. Kept short: every line costs tokens on every call. */
export function formatContext(c: LlmContext): string {
  const lines = [`mode: ${c.mode}`];
  if (c.mode === 'work') {
    lines.push(`tasks: ${c.tasks.length ? c.tasks.join('; ') : '(none)'}`);
    lines.push(`timers: ${c.timers.length ? c.timers.map((t) => (t.remainingSec !== undefined ? `${t.label} (${mmss(t.remainingSec)} left)` : t.label)).join('; ') : '(none)'}`);
    if (c.current) lines.push(`current step: ${c.current}`);
  } else {
    lines.push(`routine items: ${c.items.length ? c.items.join('; ') : '(none)'}`);
    if (c.current) lines.push(`current item: ${c.current}`);
  }
  return lines.join('\n');
}
