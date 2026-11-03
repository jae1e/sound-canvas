import type { Milestone, Timer } from './types';

/** Active elapsed time of a timer at `now`. */
export function elapsedMs(timer: Timer, now: number): number {
  const running = timer.state === 'running' && timer.runningSince !== undefined;
  const segment = running ? Math.max(0, now - (timer.runningSince as number)) : 0;
  return Math.min(timer.durationMs, timer.accumulatedMs + segment);
}

export function remainingMs(timer: Timer, now: number): number {
  return Math.max(0, timer.durationMs - elapsedMs(timer, now));
}

/** Elapsed offset at which a milestone fires. */
export function milestoneElapsedOffset(timer: Timer, m: Milestone): number {
  return m.kind === 'elapsed' ? m.offsetMs : timer.durationMs - m.offsetMs;
}

/**
 * Absolute due time for an elapsed offset, or undefined when the timer is not
 * running (a paused timer has no due time until it resumes).
 */
export function dueAtForOffset(timer: Timer, elapsedOffset: number): number | undefined {
  if (timer.state !== 'running' || timer.runningSince === undefined) return undefined;
  return timer.runningSince + (elapsedOffset - timer.accumulatedMs);
}

export function expiresAt(timer: Timer): number | undefined {
  return dueAtForOffset(timer, timer.durationMs);
}
