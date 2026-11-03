import type { Action, ActionEnvelope, Candidate, Change, MilestoneSpec, Ref, RejectReason } from './actions';
import { stepsOf } from './plan';
import { resolveTask, resolveTimer } from './refs';
import { parseDueKey } from './scheduler';
import { elapsedMs, remainingMs } from './timing';
import type { CheckIn, Lang, Milestone, Nudge, Session, SessionMode, Task, Timer } from './types';

export type ApplyResult =
  | { ok: true; session: Session; changes: Change[]; duplicate?: boolean }
  | { ok: false; reason: RejectReason; candidates?: Candidate[]; message?: string };

export interface ApplyContext {
  now: number;
  newId: () => string;
}

type Fail = Extract<ApplyResult, { ok: false }>;

const MAX_MS = 24 * 60 * 60 * 1000;
const MAX_APPLIED_KEYS = 200;
const DEFAULT_REMAINING_MS = 60_000;
const DEFAULT_FOLLOW_UP_MS = 60_000;
const DEFAULT_MAX_ATTEMPTS = 2;
/** The skipped-step question comes a little after the skip, so it does not talk over the acknowledgement. */
const SKIPPED_STEP_DELAY_MS = 30_000;

export function createSession(opts: { id: string; mode: SessionMode; lang: Lang; now: number }): Session {
  return {
    id: opts.id,
    mode: opts.mode,
    status: 'ready',
    lang: opts.lang,
    revision: 0,
    quiet: false,
    createdAt: opts.now,
    tasks: {},
    timers: {},
    checkIns: {},
    nudges: {},
    controlRev: 0,
    appliedKeys: [],
  };
}

const fail = (reason: RejectReason, message?: string, candidates?: Candidate[]): Fail => ({
  ok: false,
  reason,
  ...(message ? { message } : {}),
  ...(candidates ? { candidates } : {}),
});

const validMs = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= MAX_MS;
const isLive = (t: Timer) => t.state === 'running' || t.state === 'paused';
const isOpenTaskStatus = (t: Task) => t.status === 'pending' || t.status === 'in_progress' || t.status === 'awaiting_confirmation';
const currentOpen = (s: Session): Task | undefined => {
  const t = s.currentTaskId ? s.tasks[s.currentTaskId] : undefined;
  return t && isOpenTaskStatus(t) ? t : undefined;
};
const isOpenTask = (t: Task) => t.status === 'pending' || t.status === 'in_progress' || t.status === 'awaiting_confirmation';
const isOpenCheckIn = (c: CheckIn) => c.status === 'scheduled' || c.status === 'awaiting_reply';

export function apply(session: Session, env: ActionEnvelope, ctx: ApplyContext): ApplyResult {
  if (env.idempotencyKey && session.appliedKeys.includes(env.idempotencyKey)) {
    return { ok: true, session, changes: [], duplicate: true };
  }
  const d = structuredClone(session);
  const rev = session.revision + 1;
  const changes: Change[] = [];
  const out = run(d, env, ctx, rev, changes);
  if (out) return out;
  if (changes.length === 0 && env.action.type === 'handle_due') return { ok: true, session, changes };

  d.revision = rev;
  if (env.idempotencyKey) d.appliedKeys = [...d.appliedKeys, env.idempotencyKey].slice(-MAX_APPLIED_KEYS);
  return { ok: true, session: d, changes };
}

/** Mutates the draft `d`; returns a rejection or undefined on success. */
function run(d: Session, env: ActionEnvelope, ctx: ApplyContext, rev: number, changes: Change[]): Fail | undefined {
  const { now } = ctx;
  const action = env.action;
  const expected = env.expectedRevision;
  const stale = (...recs: { rev: number }[]): Fail | undefined =>
    expected !== undefined && recs.some((r) => r.rev > expected)
      ? fail('stale_revision', 'A newer change touched this item.')
      : undefined;
  const openCheckIns = (taskId: string) => Object.values(d.checkIns).filter((c) => c.taskId === taskId && isOpenCheckIn(c));
  const liveTimers = (taskId: string) => Object.values(d.timers).filter((t) => t.taskId === taskId && isLive(t));

  const setTaskStatus = (t: Task, status: Task['status']) => {
    t.rev = rev;
    if (t.status !== status) {
      t.status = status;
      changes.push({ kind: 'task_status', taskId: t.id, label: t.label, status });
    }
  };
  const cancelCheckIns = (taskId: string, label: string) => {
    const open = openCheckIns(taskId);
    for (const c of open) {
      c.status = 'cancelled';
      c.rev = rev;
    }
    // Overrun check-ins are the engine's own bookkeeping; the user never asked for them, so they are not narrated.
    const visible = open.filter((c) => c.reason !== 'overrun').length;
    if (visible) changes.push({ kind: 'check_ins_cancelled', taskId, label, count: visible });
  };
  const answerCheckIns = (taskId: string) => {
    for (const c of openCheckIns(taskId)) {
      if (c.status !== 'awaiting_reply') continue;
      c.status = 'answered';
      c.rev = rev;
    }
  };
  const cancelTimer = (t: Timer) => {
    t.accumulatedMs = elapsedMs(t, now);
    t.state = 'cancelled';
    t.runningSince = undefined;
    t.expiryStatus = 'cancelled';
    for (const m of t.milestones) if (m.status === 'scheduled') m.status = 'cancelled';
    t.rev = rev;
    changes.push({ kind: 'timer_cancelled', timerId: t.id, label: t.label });
  };
  const pauseTimer = (t: Timer, bySession: boolean) => {
    t.accumulatedMs = elapsedMs(t, now);
    t.state = 'paused';
    t.runningSince = undefined;
    t.pausedBySession = bySession;
    t.rev = rev;
    changes.push({ kind: 'timer_paused', timerId: t.id, label: t.label, remainingMs: remainingMs(t, now) });
  };
  const resumeTimer = (t: Timer) => {
    t.state = 'running';
    t.runningSince = now;
    t.pausedBySession = false;
    t.rev = rev;
    changes.push({ kind: 'timer_resumed', timerId: t.id, label: t.label, remainingMs: remainingMs(t, now) });
  };
  const control = (status: Session['status']) => {
    d.status = status;
    d.controlRev = rev;
    changes.push({ kind: 'session_status', status });
  };
  const task = (ref: Ref) => resolveTask(d, ref);
  const timer = (ref: Ref) => resolveTimer(d, ref);

  // ---- plan helpers -------------------------------------------------------------------------
  const renumber = (list: Task[]) => {
    list.forEach((t, i) => {
      if (t.order !== i) {
        t.order = i;
        t.rev = rev;
      }
    });
  };
  const cancelNudges = (pred: (n: Nudge) => boolean) => {
    for (const n of Object.values(d.nudges)) {
      if (n.status === 'scheduled' && pred(n)) {
        n.status = 'cancelled';
        n.rev = rev;
      }
    }
  };
  /** (Re)creates the single overrun check-in of a current step with an estimate. */
  const armOverrun = (t: Task) => {
    for (const c of openCheckIns(t.id)) {
      if (c.reason !== 'overrun') continue;
      c.status = 'cancelled';
      c.rev = rev;
    }
    if (t.estimateMs === undefined || t.startedAt === undefined) return;
    const dueAt = t.startedAt + t.estimateMs;
    if (dueAt <= now) return;
    const c = newCheckIn(ctx.newId(), t.id, dueAt, 1, DEFAULT_FOLLOW_UP_MS, rev);
    c.reason = 'overrun';
    d.checkIns[c.id] = c;
  };
  const activate = (t: Task, returning = false) => {
    t.status = 'in_progress';
    t.startedAt = now;
    t.rev = rev;
    d.currentTaskId = t.id;
    armOverrun(t);
    const list = stepsOf(d);
    changes.push({
      kind: 'step_started',
      taskId: t.id,
      label: t.label,
      index: list.findIndex((x) => x.id === t.id) + 1,
      total: list.length,
      ...(t.estimateMs !== undefined ? { estimateMs: t.estimateMs } : {}),
      ...(returning ? { returning: true } : {}),
    });
  };
  /** After `from` left the current position, start the next pending step or announce that the plan is done. */
  const advanceFrom = (_from: Task, afterOrder = _from.order as number) => {
    d.currentTaskId = undefined;
    const pending = stepsOf(d).filter((t) => t.status === 'pending');
    const next = pending.find((t) => (t.order as number) > afterOrder) ?? pending[0];
    if (next) activate(next);
    else if (stepsOf(d).length > 0) changes.push({ kind: 'plan_complete', total: stepsOf(d).length });
  };
  const closeStep = (t: Task, kind: 'done' | 'skipped') => {
    cancelCheckIns(t.id, t.label);
    for (const tm of liveTimers(t.id)) cancelTimer(tm);
    t.lastReport = { kind, at: now, source: env.source };
    setTaskStatus(t, kind === 'done' ? 'completed' : 'skipped');
  };
  const stepOrReject = (ref: Ref): { t: Task } | Fail => {
    const r = task(ref);
    if (!r.ok) return fail(r.reason, undefined, r.candidates);
    if (r.value.order === undefined) return fail('invalid_state', 'That task is not a plan step.');
    return { t: r.value };
  };

  if (d.status === 'ended' && action.type !== 'handle_due') {
    return fail('invalid_state', 'The session has ended.');
  }

  switch (action.type) {
    case 'start_session': {
      if (d.status !== 'ready' && d.status !== 'draft') return fail('invalid_state', 'Session already started.');
      const s = stale({ rev: d.controlRev });
      if (s) return s;
      d.startedAt = now;
      control('active');
      return;
    }
    case 'pause_session': {
      if (d.status !== 'active') return fail('invalid_state', 'Session is not active.');
      const s = stale({ rev: d.controlRev });
      if (s) return s;
      d.pausedAt = now;
      control('paused');
      for (const t of Object.values(d.timers)) {
        if (t.state === 'running' && t.clockPolicy === 'active') pauseTimer(t, true);
      }
      return;
    }
    case 'resume_session': {
      if (d.status !== 'paused') return fail('invalid_state', 'Session is not paused.');
      const s = stale({ rev: d.controlRev });
      if (s) return s;
      // Nudges and overrun checks measure working time: push them out by the length of the pause.
      const pausedFor = d.pausedAt !== undefined ? Math.max(0, now - d.pausedAt) : 0;
      d.pausedAt = undefined;
      control('active');
      for (const t of Object.values(d.timers)) if (t.state === 'paused' && t.pausedBySession) resumeTimer(t);
      if (pausedFor > 0) {
        for (const n of Object.values(d.nudges)) {
          if (n.status === 'scheduled' && n.kind === 'focus_break') {
            n.dueAt += pausedFor;
            n.rev = rev;
          }
        }
        for (const c of Object.values(d.checkIns)) {
          if (c.status === 'scheduled' && c.reason === 'overrun') {
            c.dueAt += pausedFor;
            c.rev = rev;
          }
        }
      }
      return;
    }
    case 'end_session': {
      const s = stale({ rev: d.controlRev });
      if (s) return s;
      d.endedAt = now;
      control('ended');
      for (const t of Object.values(d.timers)) if (isLive(t)) cancelTimer(t);
      for (const tk of Object.values(d.tasks)) cancelCheckIns(tk.id, tk.label);
      cancelNudges(() => true);
      return;
    }
    case 'set_quiet': {
      if (action.forMs !== undefined && !validMs(action.forMs)) return fail('invalid_value', 'Invalid quiet duration.');
      const s = stale({ rev: d.controlRev });
      if (s) return s;
      const forMs = action.quiet ? action.forMs : undefined;
      d.quiet = action.quiet;
      d.quietUntil = forMs !== undefined ? now + forMs : undefined;
      d.controlRev = rev;
      changes.push({ kind: 'quiet', quiet: action.quiet, ...(forMs !== undefined ? { forMs } : {}) });
      return;
    }
    case 'add_task': {
      const label = action.label?.trim();
      if (!label) return fail('invalid_value', 'Task label is empty.');
      const t: Task = { id: ctx.newId(), label, status: 'in_progress', createdAt: now, rev };
      d.tasks[t.id] = t;
      changes.push({ kind: 'task_added', taskId: t.id, label });
      changes.push({ kind: 'task_status', taskId: t.id, label, status: 'in_progress' });
      return;
    }
    case 'report_task': {
      const r = task(action.task);
      if (!r.ok) return fail(r.reason, undefined, r.candidates);
      const t = r.value;
      if (!isOpenTask(t)) return fail('invalid_state', `Task is already ${t.status}.`);
      const s = stale(t, ...openCheckIns(t.id), ...(action.report === 'done' ? liveTimers(t.id) : []));
      if (s) return s;
      if (action.report === 'done') {
        closeStep(t, 'done');
        if (d.currentTaskId === t.id) advanceFrom(t);
      } else {
        answerCheckIns(t.id);
        t.lastReport = { kind: 'not_yet', at: now, source: env.source };
        setTaskStatus(t, 'in_progress');
      }
      return;
    }
    case 'skip_task': {
      const r = task(action.task);
      if (!r.ok) return fail(r.reason, undefined, r.candidates);
      const t = r.value;
      if (!isOpenTask(t)) return fail('invalid_state', `Task is already ${t.status}.`);
      const s = stale(t, ...openCheckIns(t.id), ...liveTimers(t.id));
      if (s) return s;
      closeStep(t, 'skipped');
      if (t.order !== undefined) {
        // "You skipped step 3, was that intentional?" at most once per step.
        const asked = Object.values(d.nudges).some((n) => n.kind === 'skipped_step' && n.taskId === t.id);
        if (!asked) {
          const n: Nudge = { id: ctx.newId(), kind: 'skipped_step', taskId: t.id, dueAt: now + SKIPPED_STEP_DELAY_MS, status: 'scheduled', rev };
          d.nudges[n.id] = n;
        }
      }
      if (d.currentTaskId === t.id) advanceFrom(t);
      return;
    }
    case 'reopen_task': {
      const r = task(action.task);
      if (!r.ok) return fail(r.reason, undefined, r.candidates);
      const t = r.value;
      if (t.status !== 'completed' && t.status !== 'skipped') return fail('invalid_state', `Task is ${t.status}.`);
      const s = stale(t);
      if (s) return s;
      setTaskStatus(t, 'in_progress');
      cancelNudges((n) => n.kind === 'skipped_step' && n.taskId === t.id);
      if (t.order !== undefined && !currentOpen(d)) d.currentTaskId = t.id;
      return;
    }
    case 'extend_task': {
      if (!validMs(action.byMs)) return fail('invalid_value', 'Invalid duration.');
      const r = task(action.task);
      if (!r.ok) return fail(r.reason, undefined, r.candidates);
      const t = r.value;
      if (!isOpenTask(t)) return fail('invalid_state', `Task is ${t.status}.`);
      const timers = liveTimers(t.id);
      if (timers.length > 1) {
        return fail('ambiguous_target', 'Task has several timers.', timers.map((x) => ({ id: x.id, label: x.label })));
      }
      const [tm] = timers;
      if (tm && tm.durationMs + action.byMs > MAX_MS) return fail('invalid_value', 'Timer would exceed 24h.');
      const s = stale(t, ...openCheckIns(t.id), ...(tm ? [tm] : []));
      if (s) return s;
      if (tm) {
        answerCheckIns(t.id);
        tm.durationMs += action.byMs;
        tm.rev = rev;
        changes.push({ kind: 'timer_extended', timerId: tm.id, label: tm.label, remainingMs: remainingMs(tm, now) });
      } else {
        answerCheckIns(t.id);
        cancelCheckIns(t.id, t.label);
        const c = newCheckIn(ctx.newId(), t.id, now + action.byMs, DEFAULT_MAX_ATTEMPTS, DEFAULT_FOLLOW_UP_MS, rev);
        d.checkIns[c.id] = c;
        changes.push({ kind: 'check_in_scheduled', checkInId: c.id, taskId: t.id, label: t.label, inMs: action.byMs });
      }
      t.rev = rev;
      setTaskStatus(t, 'in_progress');
      return;
    }
    case 'schedule_check_in': {
      const maxAttempts = action.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
      const followUpMs = action.followUpMs ?? DEFAULT_FOLLOW_UP_MS;
      if (!validMs(action.inMs) || !validMs(followUpMs) || !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
        return fail('invalid_value', 'Invalid check-in parameters.');
      }
      const r = task(action.task);
      if (!r.ok) return fail(r.reason, undefined, r.candidates);
      const t = r.value;
      if (!isOpenTask(t)) return fail('invalid_state', `Task is ${t.status}.`);
      const s = stale(t, ...openCheckIns(t.id));
      if (s) return s;
      cancelCheckIns(t.id, t.label);
      const c = newCheckIn(ctx.newId(), t.id, now + action.inMs, maxAttempts, followUpMs, rev);
      d.checkIns[c.id] = c;
      t.rev = rev;
      changes.push({ kind: 'check_in_scheduled', checkInId: c.id, taskId: t.id, label: t.label, inMs: action.inMs });
      return;
    }
    case 'start_timer': {
      const label = action.label?.trim();
      if (!label) return fail('invalid_value', 'Timer label is empty.');
      if (!validMs(action.durationMs)) return fail('invalid_value', 'Invalid duration.');
      const specs: MilestoneSpec[] =
        action.milestones ?? (action.durationMs > 120_000 ? [{ kind: 'remaining', offsetMs: DEFAULT_REMAINING_MS }] : []);
      for (const m of specs) {
        if (!validMs(m.offsetMs)) return fail('invalid_value', 'Invalid milestone offset.');
        const at = m.kind === 'elapsed' ? m.offsetMs : action.durationMs - m.offsetMs;
        if (at <= 0 || at >= action.durationMs) return fail('invalid_value', 'Milestone is outside the timer.');
      }
      let linked: Task | undefined;
      if (action.task) {
        const r = task(action.task);
        if (!r.ok) return fail(r.reason, undefined, r.candidates);
        linked = r.value;
        if (!isOpenTask(linked)) return fail('invalid_state', `Task is ${linked.status}.`);
        const s = stale(linked);
        if (s) return s;
      }
      const policy = action.clockPolicy ?? 'wall';
      const parkedBySession = policy === 'active' && d.status === 'paused';
      const milestones: Milestone[] = specs.map((m, i) => ({ id: `m${i + 1}`, kind: m.kind, offsetMs: m.offsetMs, status: 'scheduled' }));
      const tm: Timer = {
        id: ctx.newId(),
        label,
        taskId: linked?.id,
        durationMs: action.durationMs,
        clockPolicy: policy,
        state: parkedBySession ? 'paused' : 'running',
        accumulatedMs: 0,
        runningSince: parkedBySession ? undefined : now,
        milestones,
        expiryStatus: 'scheduled',
        pausedBySession: parkedBySession,
        createdAt: now,
        rev,
      };
      d.timers[tm.id] = tm;
      changes.push({ kind: 'timer_started', timerId: tm.id, label, durationMs: tm.durationMs });
      if (linked) setTaskStatus(linked, 'in_progress');
      return;
    }
    case 'pause_timer':
    case 'resume_timer':
    case 'cancel_timer':
    case 'extend_timer': {
      if (action.type === 'extend_timer' && !validMs(action.byMs)) return fail('invalid_value', 'Invalid duration.');
      const r = timer(action.timer);
      if (!r.ok) return fail(r.reason, undefined, r.candidates);
      const tm = r.value;
      const wanted = action.type === 'resume_timer' ? tm.state === 'paused' : action.type === 'pause_timer' ? tm.state === 'running' : isLive(tm);
      if (!wanted) return fail('invalid_state', `Timer is ${tm.state}.`);
      if (action.type === 'extend_timer' && tm.durationMs + action.byMs > MAX_MS) return fail('invalid_value', 'Timer would exceed 24h.');
      const s = stale(tm);
      if (s) return s;
      if (action.type === 'pause_timer') pauseTimer(tm, false);
      else if (action.type === 'resume_timer') resumeTimer(tm);
      else if (action.type === 'cancel_timer') cancelTimer(tm);
      else {
        tm.durationMs += action.byMs;
        tm.rev = rev;
        changes.push({ kind: 'timer_extended', timerId: tm.id, label: tm.label, remainingMs: remainingMs(tm, now) });
      }
      return;
    }
    case 'add_step': {
      const label = action.label?.trim();
      if (!label) return fail('invalid_value', 'Step label is empty.');
      if (action.estimateMs !== undefined && !validMs(action.estimateMs)) return fail('invalid_value', 'Invalid estimate.');
      if (action.index !== undefined && (!Number.isInteger(action.index) || action.index < 0)) return fail('invalid_value', 'Invalid index.');
      const list = stepsOf(d);
      const t: Task = {
        id: ctx.newId(),
        label,
        status: 'pending',
        createdAt: now,
        order: list.length,
        ...(action.estimateMs !== undefined ? { estimateMs: action.estimateMs } : {}),
        rev,
      };
      d.tasks[t.id] = t;
      list.splice(Math.min(action.index ?? list.length, list.length), 0, t);
      renumber(list);
      changes.push({ kind: 'step_added', taskId: t.id, label });
      return;
    }
    case 'edit_step': {
      const r = stepOrReject(action.task);
      if ('ok' in r) return r;
      const t = r.t;
      const label = action.label === undefined ? undefined : action.label.trim();
      if (label === '') return fail('invalid_value', 'Step label is empty.');
      if (typeof action.estimateMs === 'number' && !validMs(action.estimateMs)) return fail('invalid_value', 'Invalid estimate.');
      if (label !== undefined) t.label = label;
      if (action.estimateMs === null) delete t.estimateMs;
      else if (action.estimateMs !== undefined) t.estimateMs = action.estimateMs;
      t.rev = rev;
      if (d.currentTaskId === t.id && action.estimateMs !== undefined && isOpenTaskStatus(t)) armOverrun(t);
      changes.push({ kind: 'step_edited', taskId: t.id, label: t.label });
      return;
    }
    case 'move_step': {
      const r = stepOrReject(action.task);
      if ('ok' in r) return r;
      if (!Number.isInteger(action.toIndex)) return fail('invalid_value', 'Invalid index.');
      const list = stepsOf(d);
      const from = list.findIndex((x) => x.id === r.t.id);
      const to = Math.max(0, Math.min(list.length - 1, action.toIndex));
      list.splice(to, 0, list.splice(from, 1)[0] as Task);
      renumber(list);
      changes.push({ kind: 'step_moved', taskId: r.t.id, label: r.t.label, index: to + 1 });
      return;
    }
    case 'remove_step': {
      const r = stepOrReject(action.task);
      if ('ok' in r) return r;
      const t = r.t;
      const wasCurrent = d.currentTaskId === t.id;
      const removedOrder = t.order as number;
      cancelCheckIns(t.id, t.label);
      for (const tm of liveTimers(t.id)) cancelTimer(tm);
      cancelNudges((n) => n.taskId === t.id);
      t.status = 'cancelled';
      t.rev = rev;
      renumber(stepsOf(d));
      changes.push({ kind: 'step_removed', taskId: t.id, label: t.label });
      // Steps after the removed one shift up by one, so the next step now sits at the removed position.
      if (wasCurrent) advanceFrom(t, removedOrder - 1);
      return;
    }
    case 'next_step': {
      const cur = currentOpen(d);
      if (cur) {
        closeStep(cur, 'done');
        advanceFrom(cur);
        return;
      }
      const first = stepsOf(d).find((t) => t.status === 'pending');
      if (!first) return fail('invalid_state', 'There is no step to start.');
      activate(first);
      return;
    }
    case 'prev_step': {
      const list = stepsOf(d);
      const cur = currentOpen(d);
      const before = cur ? list.filter((t) => (t.order as number) < (cur.order as number)) : list;
      const prev = [...before].reverse().find((t) => t.status === 'completed' || t.status === 'skipped');
      if (!prev) return fail('invalid_state', 'There is no earlier step.');
      if (cur) {
        cancelCheckIns(cur.id, cur.label);
        cur.status = 'pending';
        cur.startedAt = undefined;
        cur.rev = rev;
      }
      cancelNudges((n) => n.kind === 'skipped_step' && n.taskId === prev.id);
      prev.lastReport = undefined;
      activate(prev, true);
      return;
    }
    case 'set_focus_break': {
      if (action.afterMs !== null && !validMs(action.afterMs)) return fail('invalid_value', 'Invalid focus length.');
      cancelNudges((n) => n.kind === 'focus_break');
      if (action.afterMs !== null) {
        const n: Nudge = { id: ctx.newId(), kind: 'focus_break', dueAt: now + action.afterMs, status: 'scheduled', repeatMs: action.afterMs, rev };
        d.nudges[n.id] = n;
      }
      d.controlRev = rev;
      changes.push({ kind: 'focus_break_set', afterMs: action.afterMs });
      return;
    }
    case 'handle_due':
      return handleDue(d, action, ctx, rev, changes, setTaskStatus);
  }
}

function newCheckIn(id: string, taskId: string, dueAt: number, maxAttempts: number, followUpMs: number, rev: number): CheckIn {
  return { id, taskId, dueAt, status: 'scheduled', attempts: 0, maxAttempts, followUpMs, rev };
}

function handleDue(
  d: Session,
  action: Extract<Action, { type: 'handle_due' }>,
  ctx: ApplyContext,
  rev: number,
  changes: Change[],
  setTaskStatus: (t: Task, status: Task['status']) => void,
): undefined {
  const parsed = parseDueKey(action.key);
  if (!parsed) return;
  const { outcome } = action;
  const done = () => changes.push({ kind: 'due_handled', key: action.key, outcome });
  const awaitTask = (taskId: string | undefined) => {
    const t = taskId ? d.tasks[taskId] : undefined;
    if (t && t.status === 'in_progress') setTaskStatus(t, 'awaiting_confirmation');
  };

  if (parsed.type === 'milestone') {
    const m = d.timers[parsed.timerId]?.milestones.find((x) => x.id === parsed.milestoneId);
    if (!m || m.status !== 'scheduled') return;
    m.status = outcome;
    (d.timers[parsed.timerId] as Timer).rev = rev;
    done();
  } else if (parsed.type === 'expiry') {
    const tm = d.timers[parsed.timerId];
    if (!tm || tm.state !== 'running' || tm.expiryStatus !== 'scheduled') return;
    tm.accumulatedMs = tm.durationMs;
    tm.runningSince = undefined;
    tm.state = 'expired';
    tm.expiryStatus = outcome;
    for (const m of tm.milestones) if (m.status === 'scheduled') m.status = 'expired';
    tm.rev = rev;
    changes.push({ kind: 'timer_expired', timerId: tm.id, label: tm.label });
    awaitTask(tm.taskId);
    done();
  } else if (parsed.type === 'check_in') {
    const c = d.checkIns[parsed.checkInId];
    if (!c || c.attempts !== parsed.attempt - 1) return;
    if (c.status !== (parsed.attempt === 1 ? 'scheduled' : 'awaiting_reply')) return;
    c.status = 'awaiting_reply';
    c.attempts = parsed.attempt;
    c.lastAskedAt = ctx.now;
    c.rev = rev;
    awaitTask(c.taskId);
    done();
  } else if (parsed.type === 'nudge') {
    const n = d.nudges[parsed.nudgeId];
    if (!n || n.status !== 'scheduled') return;
    n.status = outcome;
    n.rev = rev;
    if (n.kind === 'focus_break' && n.repeatMs !== undefined) {
      const next: Nudge = { id: ctx.newId(), kind: 'focus_break', dueAt: ctx.now + n.repeatMs, status: 'scheduled', repeatMs: n.repeatMs, rev };
      d.nudges[next.id] = next;
    }
    done();
  } else {
    const c = d.checkIns[parsed.checkInId];
    if (!c || c.status !== 'awaiting_reply') return;
    c.status = 'expired';
    c.rev = rev;
    done();
  }
}
