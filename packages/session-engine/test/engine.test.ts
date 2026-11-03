import { describe, expect, it } from 'vitest';
import { apply } from '../src/engine';
import { dueEvents } from '../src/scheduler';
import { remainingMs } from '../src/timing';
import { deepFreeze, harness, MIN, T0 } from './helpers';

function twoTasks() {
  const h = harness();
  h.do({ type: 'start_session' });
  h.do({ type: 'add_task', label: 'mushrooms' });
  h.do({ type: 'add_task', label: 'pasta' });
  const [mush, pasta] = Object.values(h.session.tasks);
  return { h, mush: mush!, pasta: pasta! };
}

describe('engine', () => {
  it('A01: two named tasks have independent timers and statuses', () => {
    const { h, mush, pasta } = twoTasks();
    h.do({ type: 'start_timer', label: 'mushroom timer', durationMs: 5 * MIN, task: { label: 'mushrooms' } });
    h.do({ type: 'start_timer', label: 'pasta timer', durationMs: 10 * MIN, task: { label: 'pasta' } });
    const timers = Object.values(h.session.timers);
    expect(timers).toHaveLength(2);
    expect(timers.map((t) => t.taskId)).toEqual([mush.id, pasta.id]);
    expect(timers.map((t) => t.durationMs)).toEqual([5 * MIN, 10 * MIN]);
    expect(h.session.tasks[mush.id]!.status).toBe('in_progress');
    // default 1-minute-remaining milestone for timers > 2 minutes
    expect(timers[0]!.milestones).toMatchObject([{ kind: 'remaining', offsetMs: 60_000 }]);
  });

  it('does not add a default milestone for short timers; rejects out-of-range milestones', () => {
    const h = harness();
    h.do({ type: 'start_timer', label: 'short', durationMs: 90_000 });
    expect(Object.values(h.session.timers)[0]!.milestones).toEqual([]);
    for (const m of [
      { kind: 'elapsed' as const, offsetMs: 120_000 },
      { kind: 'remaining' as const, offsetMs: 120_000 },
    ]) {
      const r = h.try({ type: 'start_timer', label: 'x', durationMs: 120_000, milestones: [m] });
      expect(r).toMatchObject({ ok: false, reason: 'invalid_value' });
    }
  });

  it('validates values and states', () => {
    const h = harness();
    for (const durationMs of [0, -5, NaN, Infinity, 25 * 60 * MIN]) {
      expect(h.try({ type: 'start_timer', label: 'x', durationMs })).toMatchObject({ ok: false, reason: 'invalid_value' });
    }
    expect(h.try({ type: 'add_task', label: '   ' })).toMatchObject({ ok: false, reason: 'invalid_value' });
    expect(h.try({ type: 'resume_session' })).toMatchObject({ ok: false, reason: 'invalid_state' });
    h.do({ type: 'end_session' });
    expect(h.try({ type: 'add_task', label: 'late' })).toMatchObject({ ok: false, reason: 'invalid_state' });
  });

  it('A04: "two more minutes" replaces the old check-in with the correct due time', () => {
    const { h, mush } = twoTasks();
    h.do({ type: 'schedule_check_in', task: { id: mush.id }, inMs: 3 * MIN });
    const old = Object.values(h.session.checkIns)[0]!;
    h.advance(3 * MIN);
    h.do({ type: 'handle_due', key: `ci:${old.id}:1`, outcome: 'delivered' });
    expect(h.session.tasks[mush.id]!.status).toBe('awaiting_confirmation');
    h.advance(10_000);
    const r = h.do({ type: 'extend_task', task: { implicit: true }, byMs: 2 * MIN });
    expect(r.changes.some((c) => c.kind === 'check_in_scheduled')).toBe(true);
    const cis = Object.values(h.session.checkIns);
    const fresh = cis.find((c) => c.status === 'scheduled')!;
    expect(fresh.dueAt).toBe(h.now + 2 * MIN);
    expect(cis.filter((c) => c.status === 'scheduled' || c.status === 'awaiting_reply')).toHaveLength(1);
    expect(h.session.tasks[mush.id]!.status).toBe('in_progress');
    // before the new due time nothing fires; the old check-in never fires again
    expect(dueEvents(h.session, fresh.dueAt - 1)).toEqual([]);
  });

  it('extend_task extends the running timer when one exists', () => {
    const { h, mush } = twoTasks();
    h.do({ type: 'start_timer', label: 'mush', durationMs: 5 * MIN, task: { id: mush.id } });
    h.advance(4 * MIN);
    const r = h.do({ type: 'extend_task', task: { id: mush.id }, byMs: 2 * MIN });
    expect(r.changes).toContainEqual(expect.objectContaining({ kind: 'timer_extended', remainingMs: 3 * MIN }));
    expect(Object.values(h.session.checkIns)).toHaveLength(0);
  });

  it('A05: completion cancels check-ins and timers', () => {
    const { h, mush } = twoTasks();
    h.do({ type: 'start_timer', label: 'mush', durationMs: 5 * MIN, task: { id: mush.id } });
    h.do({ type: 'schedule_check_in', task: { id: mush.id }, inMs: 3 * MIN });
    const r = h.do({ type: 'report_task', task: { label: 'mushrooms' }, report: 'done' });
    expect(r.changes.map((c) => c.kind)).toEqual(expect.arrayContaining(['check_ins_cancelled', 'timer_cancelled', 'task_status']));
    expect(h.session.tasks[mush.id]).toMatchObject({ status: 'completed', lastReport: { kind: 'done', source: 'voice' } });
    expect(dueEvents(h.session, h.now + 60 * MIN)).toEqual([]);
  });

  it('not_yet answers awaiting check-ins and returns the task to in_progress', () => {
    const { h, mush } = twoTasks();
    h.do({ type: 'schedule_check_in', task: { id: mush.id }, inMs: MIN });
    const ci = Object.values(h.session.checkIns)[0]!;
    h.advance(MIN);
    h.do({ type: 'handle_due', key: `ci:${ci.id}:1`, outcome: 'delivered' });
    h.do({ type: 'report_task', task: { id: mush.id }, report: 'not_yet' });
    expect(h.session.checkIns[ci.id]!.status).toBe('answered');
    expect(h.session.tasks[mush.id]!.status).toBe('in_progress');
  });

  it('ambiguity: implicit "done" with two open tasks lists both candidates and changes nothing', () => {
    const { h, mush, pasta } = twoTasks();
    const r = h.try({ type: 'report_task', task: { implicit: true }, report: 'done' });
    expect(r).toMatchObject({ ok: false, reason: 'ambiguous_target' });
    if (!r.ok) expect(r.candidates?.map((c) => c.id).sort()).toEqual([mush.id, pasta.id].sort());
    expect(h.try({ type: 'report_task', task: { label: 'tofu' }, report: 'done' })).toMatchObject({ ok: false, reason: 'not_found' });
  });

  it('A06: pause_session keeps wall timers running and pauses active timers; resume restores', () => {
    const h = harness();
    h.do({ type: 'start_session' });
    h.do({ type: 'start_timer', label: 'soup', durationMs: 10 * MIN, clockPolicy: 'wall' });
    h.do({ type: 'start_timer', label: 'block', durationMs: 10 * MIN, clockPolicy: 'active' });
    const [soup, block] = Object.values(h.session.timers);
    h.advance(2 * MIN);
    h.do({ type: 'pause_session' });
    expect(h.session.status).toBe('paused');
    expect(h.session.timers[soup!.id]!.state).toBe('running');
    expect(h.session.timers[block!.id]).toMatchObject({ state: 'paused', pausedBySession: true });
    h.advance(3 * MIN);
    expect(remainingMs(h.session.timers[soup!.id]!, h.now)).toBe(5 * MIN);
    expect(remainingMs(h.session.timers[block!.id]!, h.now)).toBe(8 * MIN);
    h.do({ type: 'resume_session' });
    expect(h.session.timers[block!.id]).toMatchObject({ state: 'running', pausedBySession: false });
    h.advance(MIN);
    expect(remainingMs(h.session.timers[block!.id]!, h.now)).toBe(7 * MIN);
  });

  it('resume_session does not resume timers paused directly', () => {
    const h = harness();
    h.do({ type: 'start_session' });
    h.do({ type: 'start_timer', label: 'block', durationMs: 10 * MIN, clockPolicy: 'active' });
    h.do({ type: 'pause_timer', timer: { implicit: true } });
    h.do({ type: 'pause_session' });
    h.do({ type: 'resume_session' });
    expect(Object.values(h.session.timers)[0]!.state).toBe('paused');
  });

  it('C02: stale expectedRevision on the same task is rejected; a different task is accepted', () => {
    const { h, mush, pasta } = twoTasks();
    const seen = h.session.revision;
    h.do({ type: 'skip_task', task: { id: mush.id } }, { source: 'ui' }); // newer UI edit on mush
    h.do({ type: 'reopen_task', task: { id: mush.id } }, { source: 'ui' });
    const stale = h.try({ type: 'report_task', task: { id: mush.id }, report: 'done' }, { expectedRevision: seen, source: 'llm' });
    expect(stale).toMatchObject({ ok: false, reason: 'stale_revision' });
    const fine = h.try({ type: 'report_task', task: { id: pasta.id }, report: 'done' }, { expectedRevision: seen, source: 'llm' });
    expect(fine.ok).toBe(true);
    // creation-only actions are never stale
    expect(h.try({ type: 'add_task', label: 'tea' }, { expectedRevision: seen }).ok).toBe(true);
    // session-level actions use controlRev
    h.do({ type: 'set_quiet', quiet: true });
    expect(h.try({ type: 'set_quiet', quiet: false }, { expectedRevision: seen })).toMatchObject({ reason: 'stale_revision' });
  });

  it('idempotency: duplicate keys apply once and the key list stays bounded', () => {
    const h = harness();
    h.do({ type: 'add_task', label: 'a' }, { idempotencyKey: 'k1' });
    const before = h.session;
    const dup = h.try({ type: 'add_task', label: 'a' }, { idempotencyKey: 'k1' });
    expect(dup).toMatchObject({ ok: true, duplicate: true, changes: [] });
    if (dup.ok) expect(dup.session).toBe(before);
    for (let i = 0; i < 250; i++) h.do({ type: 'set_quiet', quiet: i % 2 === 0 }, { idempotencyKey: `q${i}` });
    expect(h.session.appliedKeys).toHaveLength(200);
    expect(Object.keys(h.session.tasks)).toHaveLength(1);
  });

  it('end_session cancels pending reminders but keeps task statuses', () => {
    const { h, mush } = twoTasks();
    h.do({ type: 'start_timer', label: 'mush', durationMs: 5 * MIN, task: { id: mush.id } });
    h.do({ type: 'schedule_check_in', task: { id: mush.id }, inMs: MIN });
    const r = h.do({ type: 'end_session' });
    expect(r.changes.map((c) => c.kind)).toEqual(expect.arrayContaining(['session_status', 'timer_cancelled', 'check_ins_cancelled']));
    expect(h.session.tasks[mush.id]!.status).toBe('in_progress');
    expect(Object.values(h.session.timers).every((t) => t.state === 'cancelled')).toBe(true);
    expect(Object.values(h.session.checkIns).every((c) => c.status === 'cancelled')).toBe(true);
    expect(dueEvents(h.session, h.now + 60 * MIN)).toEqual([]);
    expect(h.try({ type: 'end_session' })).toMatchObject({ reason: 'invalid_state' });
  });

  it('extend_timer keeps delivered milestones delivered and moves the remaining milestone later', () => {
    const h = harness();
    h.do({
      type: 'start_timer',
      label: 'rice',
      durationMs: 10 * MIN,
      milestones: [
        { kind: 'elapsed', offsetMs: 3 * MIN },
        { kind: 'remaining', offsetMs: MIN },
      ],
    });
    const tm = Object.values(h.session.timers)[0]!;
    h.advance(3 * MIN);
    h.do({ type: 'handle_due', key: `ms:${tm.id}:m1`, outcome: 'delivered' });
    h.do({ type: 'extend_timer', timer: { implicit: true }, byMs: 5 * MIN });
    const after = h.session.timers[tm.id]!;
    expect(after.milestones[0]!.status).toBe('delivered');
    expect(after.durationMs).toBe(15 * MIN);
    // remaining milestone now due at start + 14 min
    expect(dueEvents(h.session, T0 + 13 * MIN + 59_000)).toEqual([]);
    expect(dueEvents(h.session, T0 + 14 * MIN).map((e) => e.key)).toEqual([`ms:${tm.id}:m2`]);
  });

  it('timer expiry makes the linked task awaiting_confirmation, not completed', () => {
    const { h, mush } = twoTasks();
    h.do({ type: 'start_timer', label: 'mush', durationMs: 90_000, task: { id: mush.id } });
    const tm = Object.values(h.session.timers)[0]!;
    h.advance(90_000);
    h.do({ type: 'handle_due', key: `exp:${tm.id}`, outcome: 'delivered' });
    expect(h.session.timers[tm.id]).toMatchObject({ state: 'expired', expiryStatus: 'delivered' });
    expect(h.session.tasks[mush.id]!.status).toBe('awaiting_confirmation');
  });

  it('handle_due with unknown or repeated keys is a no-op success', () => {
    const { h } = twoTasks();
    h.do({ type: 'start_timer', label: 'x', durationMs: 90_000 });
    const tm = Object.values(h.session.timers)[0]!;
    h.advance(90_000);
    h.do({ type: 'handle_due', key: `exp:${tm.id}`, outcome: 'delivered' });
    const rev = h.session.revision;
    for (const key of [`exp:${tm.id}`, 'ms:nope:m1', 'garbage', 'ci:zzz:1']) {
      const r = h.do({ type: 'handle_due', key, outcome: 'delivered' });
      expect(r.changes).toEqual([]);
    }
    expect(h.session.revision).toBe(rev);
  });

  it('increments revision once per action and stamps touched records only', () => {
    const { h, mush, pasta } = twoTasks();
    const rev = h.session.revision;
    h.do({ type: 'report_task', task: { id: pasta.id }, report: 'done' });
    expect(h.session.revision).toBe(rev + 1);
    expect(h.session.tasks[pasta.id]!.rev).toBe(rev + 1);
    expect(h.session.tasks[mush.id]!.rev).toBeLessThanOrEqual(rev);
  });

  it('never mutates its input', () => {
    const { h, mush } = twoTasks();
    h.do({ type: 'start_timer', label: 'mush', durationMs: 5 * MIN, task: { id: mush.id } });
    h.do({ type: 'schedule_check_in', task: { id: mush.id }, inMs: MIN });
    const frozen = deepFreeze(structuredClone(h.session));
    const snapshot = structuredClone(frozen);
    for (const action of [
      { type: 'report_task', task: { id: mush.id }, report: 'done' },
      { type: 'pause_session' },
      { type: 'end_session' },
      { type: 'extend_task', task: { id: mush.id }, byMs: MIN },
    ] as const) {
      expect(apply(frozen, { action, source: 'ui' }, { now: h.now, newId: () => 'zz' }).ok).toBeDefined();
    }
    expect(frozen).toEqual(snapshot);
  });
});
