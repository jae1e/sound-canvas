import type { ActionSource, ClockPolicy, MilestoneKind, SessionStatus, TaskStatus } from './types';

/**
 * How an action names its target. `implicit` means "the one the user is
 * obviously talking about"; the engine resolves it from state or reports
 * ambiguity instead of guessing.
 */
export type Ref = { id: string } | { label: string } | { implicit: true };

export interface MilestoneSpec {
  kind: MilestoneKind;
  offsetMs: number;
}

export type Action =
  | { type: 'start_session' }
  | { type: 'pause_session' }
  | { type: 'resume_session' }
  | { type: 'end_session' }
  /** `forMs` limits quiet mode ("quiet for 10 minutes"); it is ignored when `quiet` is false. */
  | { type: 'set_quiet'; quiet: boolean; forMs?: number }
  /** Appends (or inserts at `index`) a pending plan step. */
  | { type: 'add_step'; label: string; estimateMs?: number; index?: number }
  | { type: 'edit_step'; task: Ref; label?: string; estimateMs?: number | null }
  | { type: 'move_step'; task: Ref; toIndex: number }
  | { type: 'remove_step'; task: Ref }
  /** Completes the current step and starts the next pending one; with no current step, starts the first. */
  | { type: 'next_step' }
  /** Reopens the previous step; the current step returns to pending. */
  | { type: 'prev_step' }
  /** Arms a repeating focus-break suggestion `afterMs` from now; `null` turns it off. */
  | { type: 'set_focus_break'; afterMs: number | null }
  | { type: 'add_task'; label: string }
  | { type: 'report_task'; task: Ref; report: 'done' | 'not_yet' }
  | { type: 'skip_task'; task: Ref }
  | { type: 'reopen_task'; task: Ref }
  /** "Two more minutes": extends the task's running timer, otherwise reschedules its check-in. */
  | { type: 'extend_task'; task: Ref; byMs: number }
  | { type: 'schedule_check_in'; task: Ref; inMs: number; maxAttempts?: number; followUpMs?: number }
  | {
      type: 'start_timer';
      label: string;
      durationMs: number;
      task?: Ref;
      clockPolicy?: ClockPolicy;
      /** Defaults to a one-minute-remaining milestone for timers longer than two minutes. */
      milestones?: MilestoneSpec[];
    }
  | { type: 'pause_timer'; timer: Ref }
  | { type: 'resume_timer'; timer: Ref }
  | { type: 'cancel_timer'; timer: Ref }
  | { type: 'extend_timer'; timer: Ref; byMs: number }
  /** Issued by the coordinator after it speaks (or drops) a due event. */
  | { type: 'handle_due'; key: string; outcome: 'delivered' | 'expired' };

export interface ActionEnvelope {
  action: Action;
  source: ActionSource;
  /**
   * Session revision the requester saw. If any targeted record changed after
   * it, the action is rejected as stale so a late agent request cannot
   * overwrite a newer edit.
   */
  expectedRevision?: number;
  /** Duplicate deliveries of the same request are applied once. */
  idempotencyKey?: string;
}

export type Change =
  | { kind: 'session_status'; status: SessionStatus }
  | { kind: 'quiet'; quiet: boolean; forMs?: number }
  | { kind: 'step_added'; taskId: string; label: string }
  | { kind: 'step_edited'; taskId: string; label: string }
  | { kind: 'step_moved'; taskId: string; label: string; index: number }
  | { kind: 'step_removed'; taskId: string; label: string }
  /** `index` is 1-based among the non-cancelled steps. `returning` marks a step reopened by going back. */
  | { kind: 'step_started'; taskId: string; label: string; index: number; total: number; estimateMs?: number; returning?: boolean }
  | { kind: 'plan_complete'; total: number }
  | { kind: 'focus_break_set'; afterMs: number | null }
  | { kind: 'task_added'; taskId: string; label: string }
  | { kind: 'task_status'; taskId: string; label: string; status: TaskStatus }
  | { kind: 'timer_started'; timerId: string; label: string; durationMs: number }
  | { kind: 'timer_extended'; timerId: string; label: string; remainingMs: number }
  | { kind: 'timer_paused'; timerId: string; label: string; remainingMs: number }
  | { kind: 'timer_resumed'; timerId: string; label: string; remainingMs: number }
  | { kind: 'timer_cancelled'; timerId: string; label: string }
  | { kind: 'timer_expired'; timerId: string; label: string }
  | { kind: 'check_in_scheduled'; checkInId: string; taskId: string; label: string; inMs: number }
  | { kind: 'check_ins_cancelled'; taskId: string; label: string; count: number }
  | { kind: 'due_handled'; key: string; outcome: 'delivered' | 'expired' };

export type RejectReason =
  | 'stale_revision'
  | 'not_found'
  | 'ambiguous_target'
  | 'invalid_state'
  | 'invalid_value';

export interface Candidate {
  id: string;
  label: string;
}
