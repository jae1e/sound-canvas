import type { Action, ActionEnvelope, Candidate, Change, MilestoneSpec, Ref, RejectReason } from './actions';
import { resolveTask, resolveTimer } from './refs';
import { parseDueKey } from './scheduler';
import { elapsedMs, remainingMs } from './timing';
import type { CheckIn, Lang, Milestone, Session, SessionMode, Task, Timer } from './types';

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
    if (open.length) changes.push({ kind: 'check_ins_cancelled', taskId, label, count: open.length });
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
      d.pausedAt = undefined;
      control('active');
      for (const t of Object.values(d.timers)) if (t.state === 'paused' && t.pausedBySession) resumeTimer(t);
      return;
    }
    case 'end_session': {
      const s = stale({ rev: d.controlRev });
      if (s) return s;
      d.endedAt = now;
      control('ended');
      for (const t of Object.values(d.timers)) if (isLive(t)) cancelTimer(t);
      for (const tk of Object.values(d.tasks)) cancelCheckIns(tk.id, tk.label);
      return;
    }
    case 'set_quiet': {
      const s = stale({ rev: d.controlRev });
      if (s) return s;
      d.quiet = action.quiet;
      d.controlRev = rev;
      changes.push({ kind: 'quiet', quiet: action.quiet });
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
        cancelCheckIns(t.id, t.label);
        for (const tm of liveTimers(t.id)) cancelTimer(tm);
        t.lastReport = { kind: 'done', at: now, source: env.source };
        setTaskStatus(t, 'completed');
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
      cancelCheckIns(t.id, t.label);
      for (const tm of liveTimers(t.id)) cancelTimer(tm);
      t.lastReport = { kind: 'skipped', at: now, source: env.source };
      setTaskStatus(t, 'skipped');
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
  } else {
    const c = d.checkIns[parsed.checkInId];
    if (!c || c.status !== 'awaiting_reply') return;
    c.status = 'expired';
    c.rev = rev;
    done();
  }
}
