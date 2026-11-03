import type { Session, Task } from './types';

const OPEN: ReadonlySet<Task['status']> = new Set(['pending', 'in_progress', 'awaiting_confirmation']);

export const isOpenStep = (t: Task): boolean => OPEN.has(t.status);

/** Plan steps (tasks with an `order`) that are not cancelled, in plan order. */
export function stepsOf(session: Session): Task[] {
  return Object.values(session.tasks)
    .filter((t) => t.order !== undefined && t.status !== 'cancelled')
    .sort((a, b) => (a.order as number) - (b.order as number) || a.createdAt - b.createdAt);
}

/** The step the user is on now, if it is still open. */
export function currentStep(session: Session): Task | undefined {
  const t = session.currentTaskId ? session.tasks[session.currentTaskId] : undefined;
  return t && isOpenStep(t) ? t : undefined;
}

/** Steps after the current one (or all open steps when none is current) that are still pending, in order. */
export function pendingSteps(session: Session): Task[] {
  return stepsOf(session).filter((t) => t.status === 'pending');
}

/** Free-standing open tasks (no plan order): the parallel items of a cooking-style session. */
export function looseTasks(session: Session): Task[] {
  return Object.values(session.tasks)
    .filter((t) => t.order === undefined && isOpenStep(t))
    .sort((a, b) => a.createdAt - b.createdAt);
}

/** Effective quiet state at `now` (a timed quiet period expires by itself). */
export function isQuiet(session: Session, now: number): boolean {
  return session.quiet && (session.quietUntil === undefined || now < session.quietUntil);
}
