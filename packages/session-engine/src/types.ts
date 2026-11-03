/**
 * Authoritative session state. The engine owns these records; UI and agent
 * requests can only change them through validated actions (see engine.ts).
 *
 * All times are epoch milliseconds from the injected Clock. The native layer
 * converts them to its own monotonic timers when it schedules wake-ups.
 */

export type Lang = 'ko' | 'en';

export type SessionMode = 'walk' | 'activity' | 'vocal' | 'journal';

export type SessionStatus = 'draft' | 'ready' | 'active' | 'paused' | 'ended';

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'awaiting_confirmation'
  | 'completed'
  | 'skipped'
  | 'cancelled';

/**
 * - `wall`: the physical activity continues regardless of the app (cooking, rest timers).
 * - `active`: stops while the session is paused (practice blocks).
 */
export type ClockPolicy = 'wall' | 'active';

export type ActionSource = 'voice' | 'ui' | 'llm' | 'system';

export interface TaskReport {
  kind: 'done' | 'not_yet' | 'skipped';
  at: number;
  source: ActionSource;
}

export interface Task {
  id: string;
  label: string;
  status: TaskStatus;
  createdAt: number;
  lastReport?: TaskReport;
  /**
   * Position in the ordered plan (0-based). Tasks without an order are free-standing (parallel cooking tasks);
   * tasks with one are steps and take part in next/back navigation.
   */
  order?: number;
  /** Planned duration of a step; exceeding it triggers one check-in. */
  estimateMs?: number;
  /** When the step became the current step. */
  startedAt?: number;
  /** Session revision at which this record last changed. */
  rev: number;
}

export type MilestoneKind = 'elapsed' | 'remaining';

export type DeliveryStatus = 'scheduled' | 'delivered' | 'expired' | 'cancelled';

export interface Milestone {
  id: string;
  kind: MilestoneKind;
  /** Elapsed time since start, or time remaining before the end. */
  offsetMs: number;
  status: DeliveryStatus;
}

export type TimerState = 'running' | 'paused' | 'expired' | 'cancelled';

export interface Timer {
  id: string;
  label: string;
  taskId?: string;
  durationMs: number;
  clockPolicy: ClockPolicy;
  state: TimerState;
  /** Active time accumulated before the current running segment. */
  accumulatedMs: number;
  /** Start of the current running segment; undefined when not running. */
  runningSince?: number;
  milestones: Milestone[];
  /** Whether the expiry announcement has been handled. */
  expiryStatus: DeliveryStatus;
  /** True when the timer was paused by a session pause rather than directly. */
  pausedBySession: boolean;
  createdAt: number;
  rev: number;
}

export type NudgeKind = 'focus_break' | 'skipped_step';

/** A proactive suggestion owned by the session (as opposed to a user-requested timer or check-in). */
export interface Nudge {
  id: string;
  kind: NudgeKind;
  taskId?: string;
  dueAt: number;
  status: DeliveryStatus;
  /** Focus-break nudges re-arm this long after being handled. */
  repeatMs?: number;
  rev: number;
}

export type CheckInStatus = 'scheduled' | 'awaiting_reply' | 'answered' | 'cancelled' | 'expired';

export interface CheckIn {
  id: string;
  taskId: string;
  dueAt: number;
  status: CheckInStatus;
  /** Number of times the question has been asked. */
  attempts: number;
  /** Bounded follow-ups: a silent user is not a request for unlimited interruptions. */
  maxAttempts: number;
  followUpMs: number;
  lastAskedAt?: number;
  /** `overrun`: created by the engine when a step exceeds its estimate (a nudge, not a user request). */
  reason?: 'overrun';
  rev: number;
}

export interface Session {
  id: string;
  mode: SessionMode;
  status: SessionStatus;
  lang: Lang;
  /** Incremented on every committed change. */
  revision: number;
  quiet: boolean;
  /** When set, quiet mode ends at this time ("quiet for 10 minutes"). Use `isQuiet` for the effective value. */
  quietUntil?: number;
  /** The step the user is working on now (plan navigation). */
  currentTaskId?: string;
  createdAt: number;
  startedAt?: number;
  pausedAt?: number;
  endedAt?: number;
  tasks: Record<string, Task>;
  timers: Record<string, Timer>;
  checkIns: Record<string, CheckIn>;
  nudges: Record<string, Nudge>;
  /** Revision at which session-level fields (status, quiet) last changed. */
  controlRev: number;
  /** Idempotency keys of applied actions, bounded to the most recent entries. */
  appliedKeys: string[];
}

export type DueKind =
  /** An elapsed/remaining milestone of a running timer ("3 minutes elapsed", "1 minute left"). */
  | 'timer_milestone'
  /** A timer reached its duration. Time is up; the task is not thereby complete. */
  | 'timer_expired'
  /** A check-in question is due (first ask or a bounded follow-up). */
  | 'check_in'
  /** A check-in used all attempts without a reply; handle silently (no speech). */
  | 'check_in_exhausted'
  /** A session nudge (focus break, skipped-step question). */
  | 'nudge';

/**
 * Something the speech coordinator may announce now. Produced by the
 * scheduler from current state; never stored. The coordinator reports back
 * with a `handle_due` action carrying the same `key`.
 */
export interface DueEvent {
  /** Stable deduplication key, unique per entity, milestone, and attempt. */
  key: string;
  kind: DueKind;
  dueAt: number;
  /** True when `now - dueAt` exceeds the staleness window; do not announce as current. */
  stale: boolean;
  label: string;
  timerId?: string;
  taskId?: string;
  checkInId?: string;
  nudgeId?: string;
  nudgeKind?: NudgeKind;
  /** True for a check-in created by a step overrun. */
  overrun?: boolean;
  milestone?: { kind: MilestoneKind; offsetMs: number };
  /** Timer elapsed/remaining time at `dueAt` (for milestone wording). */
  elapsedMs?: number;
  remainingMs?: number;
  /** 1-based attempt number for check-ins. */
  attempt?: number;
}
