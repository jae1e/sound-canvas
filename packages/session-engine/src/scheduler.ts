import { dueAtForOffset, expiresAt, milestoneElapsedOffset } from './timing';
import type { DueEvent, Session } from './types';

export const DEFAULT_STALE_AFTER_MS = 90_000;

/** Key builders. Entity ids must not contain ':'. */
export const milestoneKey = (timerId: string, milestoneId: string): string => `ms:${timerId}:${milestoneId}`;
export const expiryKey = (timerId: string): string => `exp:${timerId}`;
export const checkInKey = (checkInId: string, attempt: number): string => `ci:${checkInId}:${attempt}`;
export const exhaustedKey = (checkInId: string): string => `cix:${checkInId}`;

export type ParsedDueKey =
  | { type: 'milestone'; timerId: string; milestoneId: string }
  | { type: 'expiry'; timerId: string }
  | { type: 'check_in'; checkInId: string; attempt: number }
  | { type: 'check_in_exhausted'; checkInId: string };

export function parseDueKey(key: string): ParsedDueKey | undefined {
  const p = key.split(':');
  const [tag, a, b] = p;
  if (!a) return undefined;
  if (tag === 'ms' && b && p.length === 3) return { type: 'milestone', timerId: a, milestoneId: b };
  if (tag === 'exp' && p.length === 2) return { type: 'expiry', timerId: a };
  if (tag === 'cix' && p.length === 2) return { type: 'check_in_exhausted', checkInId: a };
  if (tag === 'ci' && b && p.length === 3) {
    const attempt = Number(b);
    if (Number.isInteger(attempt) && attempt >= 1) return { type: 'check_in', checkInId: a, attempt };
  }
  return undefined;
}

/** Every pending event with its due time, whether or not it is due yet. */
function pendingEvents(session: Session): Omit<DueEvent, 'stale'>[] {
  if (session.status === 'ended') return [];
  const out: Omit<DueEvent, 'stale'>[] = [];

  for (const timer of Object.values(session.timers)) {
    if (timer.state !== 'running') continue;
    for (const m of timer.milestones) {
      if (m.status !== 'scheduled') continue;
      const offset = milestoneElapsedOffset(timer, m);
      const dueAt = dueAtForOffset(timer, offset);
      if (dueAt === undefined) continue;
      out.push({
        key: milestoneKey(timer.id, m.id),
        kind: 'timer_milestone',
        dueAt,
        label: timer.label,
        timerId: timer.id,
        taskId: timer.taskId,
        milestone: { kind: m.kind, offsetMs: m.offsetMs },
        elapsedMs: offset,
        remainingMs: timer.durationMs - offset,
      });
    }
    const dueAt = expiresAt(timer);
    if (timer.expiryStatus === 'scheduled' && dueAt !== undefined) {
      out.push({
        key: expiryKey(timer.id),
        kind: 'timer_expired',
        dueAt,
        label: timer.label,
        timerId: timer.id,
        taskId: timer.taskId,
        elapsedMs: timer.durationMs,
        remainingMs: 0,
      });
    }
  }

  for (const ci of Object.values(session.checkIns)) {
    const label = session.tasks[ci.taskId]?.label ?? '';
    if (ci.status === 'scheduled') {
      out.push({ key: checkInKey(ci.id, 1), kind: 'check_in', dueAt: ci.dueAt, label, taskId: ci.taskId, checkInId: ci.id, attempt: 1 });
    } else if (ci.status === 'awaiting_reply') {
      const dueAt = (ci.lastAskedAt ?? ci.dueAt) + ci.followUpMs;
      if (ci.attempts < ci.maxAttempts) {
        const attempt = ci.attempts + 1;
        out.push({ key: checkInKey(ci.id, attempt), kind: 'check_in', dueAt, label, taskId: ci.taskId, checkInId: ci.id, attempt });
      } else {
        out.push({ key: exhaustedKey(ci.id), kind: 'check_in_exhausted', dueAt, label, taskId: ci.taskId, checkInId: ci.id, attempt: ci.attempts });
      }
    }
  }
  return out;
}

/** Events due at `now`, oldest first. Old events are flagged `stale`, never dropped. */
export function dueEvents(session: Session, now: number, opts: { staleAfterMs?: number } = {}): DueEvent[] {
  const staleAfter = opts.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
  return pendingEvents(session)
    .filter((e) => e.dueAt <= now)
    .map((e) => ({ ...e, stale: now - e.dueAt > staleAfter }))
    .sort((a, b) => a.dueAt - b.dueAt);
}

/** Earliest time any pending event fires (may be in the past if already due). */
export function nextWakeAt(session: Session, _now: number): number | undefined {
  let min: number | undefined;
  for (const e of pendingEvents(session)) if (min === undefined || e.dueAt < min) min = e.dueAt;
  return min;
}

