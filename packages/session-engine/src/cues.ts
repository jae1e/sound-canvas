import { describeDue } from './messages';
import { DEFAULT_STALE_AFTER_MS, pendingDueEvents } from './scheduler';
import { currentStep } from './plan';
import { formatDuration } from './messages';
import type { DueEvent, Lang, Session } from './types';

/**
 * Nudge level (a user setting):
 * - `quiet`: only what the user asked for (timer expiry, check-ins they scheduled).
 * - `normal`: plus timer milestones, step-overrun check-ins, the skipped-step question and the optional focus break.
 * - `chatty`: plus a halfway cue for the current step when it has an estimate (derived from state, not an engine event).
 */
export type NudgeLevel = 'quiet' | 'normal' | 'chatty';

export type CueClass = 'requested' | 'nudge';

type Due = Omit<DueEvent, 'stale'>;

/** User-requested cues (timer expiry, scheduled check-ins) versus proactive ones (milestones, overrun, nudges). */
export function classifyDue(e: Due): CueClass {
  if (e.kind === 'timer_expired') return 'requested';
  if (e.kind === 'check_in') return e.overrun ? 'nudge' : 'requested';
  return 'nudge';
}

/**
 * Whether an event must stay silent. Quiet mode and the `quiet` level suppress every proactive cue; user-requested
 * cues (a timer the user set has run out) still speak. Quiet mode is judged at the event's own due time, so a timed
 * quiet period lets later events through.
 */
export function isSuppressed(session: Session, e: Due, level: NudgeLevel): boolean {
  if (e.kind === 'check_in_exhausted') return true;
  if (classifyDue(e) === 'requested') return false;
  if (level === 'quiet') return true;
  const quietAtDue = session.quiet && (session.quietUntil === undefined || e.dueAt < session.quietUntil);
  return quietAtDue;
}

export interface PlannedCue {
  /** Same as the due-event key, so a fired cue maps straight back to the event. Derived cues use `half:` ids. */
  id: string;
  atEpochMs: number;
  /** Text the native side speaks itself if JS does not answer in time. */
  text: string;
  kind: DueEvent['kind'] | 'step_halfway';
  class: CueClass;
  /** True for cues that have no engine event behind them: speaking them needs no `handle_due`. */
  derived?: boolean;
}

/**
 * Every cue that should be armed in the native scheduler right now, derived only from session state. Re-run it after every
 * applied action and diff against what is scheduled (`diffCues`). Suppressed events are not planned: their handling is
 * silent bookkeeping in the voice loop.
 */
export function planCues(session: Session, lang: Lang, level: NudgeLevel): PlannedCue[] {
  const out: PlannedCue[] = [];
  for (const e of pendingDueEvents(session)) {
    if (isSuppressed(session, e, level)) continue;
    const text = describeDue({ ...e, stale: false }, lang);
    if (!text) continue;
    out.push({ id: e.key, atEpochMs: e.dueAt, text, kind: e.kind, class: classifyDue(e) });
  }
  const cur = currentStep(session);
  if (level === 'chatty' && cur?.estimateMs !== undefined && cur.startedAt !== undefined && session.status === 'active') {
    const at = cur.startedAt + Math.round(cur.estimateMs / 2);
    const quietAt = session.quiet && (session.quietUntil === undefined || at < session.quietUntil);
    if (!quietAt && cur.estimateMs >= 120_000) {
      const left = formatDuration(Math.round(cur.estimateMs / 2), lang);
      const text = lang === 'ko' ? `${cur.label} 예상 시간의 절반이 지났어요. ${left} 남았어요.` : `Halfway through ${cur.label}. About ${left} left.`;
      out.push({ id: `half:${cur.id}:${cur.startedAt}`, atEpochMs: at, text, kind: 'step_halfway', class: 'nudge', derived: true });
    }
  }
  return out.sort((a, b) => a.atEpochMs - b.atEpochMs);
}

export interface CueDiff {
  schedule: PlannedCue[];
  cancel: string[];
}

/** `scheduled` maps cue id to its armed time. A cue whose time changed is rescheduled. */
export function diffCues(planned: PlannedCue[], scheduled: ReadonlyMap<string, number>): CueDiff {
  const ids = new Set(planned.map((c) => c.id));
  return {
    schedule: planned.filter((c) => scheduled.get(c.id) !== c.atEpochMs),
    cancel: [...scheduled.keys()].filter((id) => !ids.has(id)),
  };
}

export { DEFAULT_STALE_AFTER_MS };
