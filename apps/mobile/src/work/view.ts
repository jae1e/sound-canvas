import {
  currentStep,
  isQuiet,
  looseTasks,
  planCues,
  remainingMs,
  stepsOf,
  type Lang,
  type NudgeLevel,
  type PlannedCue,
  type Session,
  type Task,
} from '@vlc/session-engine';

import type { WorkSummary } from './summary';

export interface StepView {
  id: string;
  label: string;
  status: Task['status'];
  estimateMs?: number;
  /** 1-based position among the plan steps. */
  index: number;
  current: boolean;
}

export interface TimerView {
  id: string;
  label: string;
  state: 'running' | 'paused';
  remainingMs: number;
  durationMs: number;
}

export interface WorkView {
  steps: StepView[];
  looseTasks: { id: string; label: string; status: Task['status'] }[];
  current: (StepView & { elapsedMs: number }) | null;
  timers: TimerView[];
  /** The next thing the app will say on its own (a timer cue, a step check-in, a nudge). */
  nextCue: PlannedCue | null;
  quiet: boolean;
  quietUntil: number | null;
}

/** Pure projection of the engine state for the screen. `now` is passed in so the screen can tick it every second. */
export function deriveView(session: Session, now: number, lang: Lang, level: NudgeLevel): WorkView {
  const steps = stepsOf(session).map<StepView>((t, i) => ({
    id: t.id,
    label: t.label,
    status: t.status,
    index: i + 1,
    current: session.currentTaskId === t.id,
    ...(t.estimateMs !== undefined ? { estimateMs: t.estimateMs } : {}),
  }));
  const cur = currentStep(session);
  const currentView = cur ? steps.find((s) => s.id === cur.id) : undefined;
  const timers = Object.values(session.timers)
    .filter((t) => t.state === 'running' || t.state === 'paused')
    .sort((a, b) => a.createdAt - b.createdAt)
    .map<TimerView>((t) => ({
      id: t.id,
      label: t.label,
      state: t.state as 'running' | 'paused',
      remainingMs: remainingMs(t, now),
      durationMs: t.durationMs,
    }));
  const upcoming = planCues(session, lang, level).filter((c) => c.atEpochMs >= now - 1000);
  return {
    steps,
    looseTasks: looseTasks(session).map((t) => ({ id: t.id, label: t.label, status: t.status })),
    current: currentView && cur ? { ...currentView, elapsedMs: cur.startedAt !== undefined ? Math.max(0, now - cur.startedAt) : 0 } : null,
    timers,
    nextCue: upcoming[0] ?? null,
    quiet: isQuiet(session, now),
    quietUntil: session.quiet ? (session.quietUntil ?? null) : null,
  };
}

export function summaryOf(session: Session | null, title: string | null, listening: boolean): WorkSummary {
  if (!session || session.status === 'ended') {
    return { active: false, status: session ? 'ended' : 'none', title, stepLabel: null, stepIndex: 0, stepTotal: 0, timersRunning: 0, listening };
  }
  const steps = stepsOf(session);
  const cur = currentStep(session);
  return {
    active: true,
    status: session.status === 'draft' ? 'ready' : (session.status as 'ready' | 'active' | 'paused'),
    title,
    stepLabel: cur?.label ?? null,
    stepIndex: cur ? steps.findIndex((s) => s.id === cur.id) + 1 : 0,
    stepTotal: steps.length,
    timersRunning: Object.values(session.timers).filter((t) => t.state === 'running').length,
    listening,
  };
}

/** m:ss (or h:mm:ss) clock text. */
export function clock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
