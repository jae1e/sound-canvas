import type { Candidate, Ref } from './actions';
import type { Session, Task, Timer } from './types';

export type Resolution<T> =
  | { ok: true; value: T }
  | { ok: false; reason: 'not_found' | 'ambiguous_target'; candidates: Candidate[] };

const OPEN_TASK: ReadonlySet<Task['status']> = new Set(['pending', 'in_progress', 'awaiting_confirmation']);
const LIVE_TIMER: ReadonlySet<Timer['state']> = new Set(['running', 'paused']);

export function normalizeLabel(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/\s+/g, '');
}

function byLabel<T extends { id: string; label: string }>(items: T[], label: string): T[] {
  const needle = normalizeLabel(label);
  if (!needle) return [];
  const exact = items.filter((i) => normalizeLabel(i.label) === needle);
  if (exact.length > 0) return exact;
  return items.filter((i) => {
    const hay = normalizeLabel(i.label);
    return hay.includes(needle) || needle.includes(hay);
  });
}

function toCandidates(items: { id: string; label: string }[]): Candidate[] {
  return items.map(({ id, label }) => ({ id, label }));
}

function pick<T extends { id: string; label: string }>(matches: T[], pool: T[]): Resolution<T> {
  if (matches.length === 1) return { ok: true, value: matches[0] as T };
  if (matches.length === 0) return { ok: false, reason: 'not_found', candidates: toCandidates(pool) };
  return { ok: false, reason: 'ambiguous_target', candidates: toCandidates(matches) };
}

export function resolveTask(session: Session, ref: Ref): Resolution<Task> {
  const all = Object.values(session.tasks);
  if ('id' in ref) {
    const t = session.tasks[ref.id];
    return t ? { ok: true, value: t } : { ok: false, reason: 'not_found', candidates: toCandidates(all) };
  }
  const open = all.filter((t) => OPEN_TASK.has(t.status));
  if ('label' in ref) {
    // Prefer open tasks, but allow naming a finished one (for reopen/corrections).
    const openMatches = byLabel(open, ref.label);
    return pick(openMatches.length > 0 ? openMatches : byLabel(all, ref.label), open);
  }
  // Implicit: a single task awaiting confirmation is what the user is answering.
  const awaiting = open.filter((t) => t.status === 'awaiting_confirmation');
  if (awaiting.length === 1) return { ok: true, value: awaiting[0] as Task };
  return pick(awaiting.length > 1 ? awaiting : open, open);
}

export function resolveTimer(session: Session, ref: Ref): Resolution<Timer> {
  const all = Object.values(session.timers);
  if ('id' in ref) {
    const t = session.timers[ref.id];
    return t ? { ok: true, value: t } : { ok: false, reason: 'not_found', candidates: toCandidates(all) };
  }
  const live = all.filter((t) => LIVE_TIMER.has(t.state));
  if ('label' in ref) {
    const direct = byLabel(live, ref.label);
    if (direct.length > 0) return pick(direct, live);
    // Allow naming the task a timer belongs to ("pasta timer").
    const viaTask = live.filter((t) => {
      const task = t.taskId ? session.tasks[t.taskId] : undefined;
      return task !== undefined && byLabel([task], ref.label).length === 1;
    });
    return pick(viaTask, live);
  }
  return pick(live, live);
}
