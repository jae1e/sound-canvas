import { describe, expect, it } from 'vitest';
import { checkInKey, dueEvents, expiryKey, exhaustedKey, milestoneKey, nextWakeAt, parseDueKey } from '../src/scheduler';
import { harness, MIN, T0 } from './helpers';

describe('scheduler', () => {
  it('round-trips keys', () => {
    expect(parseDueKey(milestoneKey('t1', 'm2'))).toEqual({ type: 'milestone', timerId: 't1', milestoneId: 'm2' });
    expect(parseDueKey(expiryKey('t1'))).toEqual({ type: 'expiry', timerId: 't1' });
    expect(parseDueKey(checkInKey('c1', 2))).toEqual({ type: 'check_in', checkInId: 'c1', attempt: 2 });
    expect(parseDueKey(exhaustedKey('c1'))).toEqual({ type: 'check_in_exhausted', checkInId: 'c1' });
    expect(parseDueKey('nonsense')).toBeUndefined();
    expect(parseDueKey('ci:c1:0')).toBeUndefined();
  });

  it('A02: 3-min elapsed and 1-min remaining milestones are each delivered once', () => {
    const h = harness();
    h.do({
      type: 'start_timer',
      label: 'mushrooms',
      durationMs: 5 * MIN,
      milestones: [
        { kind: 'elapsed', offsetMs: 3 * MIN },
        { kind: 'remaining', offsetMs: MIN },
      ],
    });
    expect(dueEvents(h.session, T0 + 3 * MIN - 1)).toEqual([]);
    h.at(T0 + 3 * MIN);
    const first = dueEvents(h.session, h.now);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ kind: 'timer_milestone', label: 'mushrooms', elapsedMs: 3 * MIN, remainingMs: 2 * MIN, stale: false });
    h.do({ type: 'handle_due', key: first[0]!.key, outcome: 'delivered' });
    expect(dueEvents(h.session, h.now)).toEqual([]);
    h.at(T0 + 4 * MIN);
    const second = dueEvents(h.session, h.now);
    expect(second.map((e) => e.milestone)).toEqual([{ kind: 'remaining', offsetMs: MIN }]);
    h.do({ type: 'handle_due', key: second[0]!.key, outcome: 'delivered' });
    expect(dueEvents(h.session, h.now)).toEqual([]);
    h.at(T0 + 5 * MIN);
    const exp = dueEvents(h.session, h.now);
    expect(exp.map((e) => e.kind)).toEqual(['timer_expired']);
    h.do({ type: 'handle_due', key: exp[0]!.key, outcome: 'delivered' });
    expect(dueEvents(h.session, h.now + 99 * MIN)).toEqual([]);
    expect(nextWakeAt(h.session, h.now)).toBeUndefined();
  });

  it('A03: unanswered check-in gives bounded follow-ups then exhausts; task stays awaiting_confirmation', () => {
    const h = harness();
    h.do({ type: 'add_task', label: 'mushrooms' });
    const task = Object.values(h.session.tasks)[0]!;
    h.do({ type: 'schedule_check_in', task: { id: task.id }, inMs: 3 * MIN });
    const ci = Object.values(h.session.checkIns)[0]!;
    expect(ci).toMatchObject({ maxAttempts: 2, followUpMs: 60_000 });
    expect(nextWakeAt(h.session, h.now)).toBe(T0 + 3 * MIN);

    h.at(T0 + 3 * MIN);
    let ev = dueEvents(h.session, h.now);
    expect(ev).toMatchObject([{ kind: 'check_in', attempt: 1, label: 'mushrooms', key: `ci:${ci.id}:1` }]);
    h.do({ type: 'handle_due', key: ev[0]!.key, outcome: 'delivered' });
    expect(dueEvents(h.session, h.now)).toEqual([]);
    expect(nextWakeAt(h.session, h.now)).toBe(T0 + 4 * MIN);

    h.at(T0 + 4 * MIN);
    ev = dueEvents(h.session, h.now);
    expect(ev).toMatchObject([{ kind: 'check_in', attempt: 2 }]);
    h.do({ type: 'handle_due', key: ev[0]!.key, outcome: 'delivered' });

    h.at(T0 + 5 * MIN);
    ev = dueEvents(h.session, h.now);
    expect(ev).toMatchObject([{ kind: 'check_in_exhausted', key: `cix:${ci.id}` }]);
    h.do({ type: 'handle_due', key: ev[0]!.key, outcome: 'delivered' });
    expect(h.session.checkIns[ci.id]!.status).toBe('expired');
    expect(h.session.tasks[task.id]!.status).toBe('awaiting_confirmation');
    expect(dueEvents(h.session, h.now + 60 * MIN)).toEqual([]);
  });

  it('flags events as stale when evaluated long after the due time, without dropping them', () => {
    const h = harness();
    h.do({ type: 'start_timer', label: 'tea', durationMs: 3 * MIN, milestones: [{ kind: 'elapsed', offsetMs: MIN }] });
    const ev = dueEvents(h.session, T0 + 10 * MIN);
    expect(ev.map((e) => [e.kind, e.stale])).toEqual([
      ['timer_milestone', true],
      ['timer_expired', true],
    ]);
    expect(dueEvents(h.session, T0 + 3 * MIN + 30_000)[1]!.stale).toBe(false);
    // With a generous window only supersession remains: the milestone yields to the expiry.
    expect(dueEvents(h.session, T0 + 10 * MIN, { staleAfterMs: 20 * MIN }).map((e) => e.stale)).toEqual([true, false]);
  });

  it('only the latest due event of a timer stays fresh (superseded milestones are stale)', () => {
    const h = harness();
    h.do({ type: 'start_timer', label: 'pasta', durationMs: 8 * MIN, milestones: [{ kind: 'remaining', offsetMs: MIN }, { kind: 'elapsed', offsetMs: 3 * MIN }] });
    // Clock jumped straight to expiry: the milestones are superseded by the expiry.
    const ev = dueEvents(h.session, T0 + 8 * MIN);
    expect(ev.filter((e) => !e.stale).map((e) => e.kind)).toEqual(['timer_expired']);
    expect(ev.filter((e) => e.stale).every((e) => e.kind === 'timer_milestone')).toBe(true);
    // Two milestones due together, expiry not yet: the later one wins.
    const fresh = dueEvents(h.session, T0 + 7 * MIN + 10_000).filter((e) => !e.stale);
    expect(fresh).toHaveLength(1);
    expect(fresh[0]!.milestone).toEqual({ kind: 'remaining', offsetMs: MIN });
    // Superseded events can still be marked handled.
    const stale = ev.find((e) => e.stale)!;
    h.do({ type: 'handle_due', key: stale.key, outcome: 'delivered' });
  });

  it('events of different timers do not supersede each other', () => {
    const h = harness();
    h.do({ type: 'start_timer', label: 'a', durationMs: 2 * MIN });
    h.do({ type: 'start_timer', label: 'b', durationMs: 2 * MIN });
    expect(dueEvents(h.session, T0 + 2 * MIN).filter((e) => e.kind === 'timer_expired' && !e.stale)).toHaveLength(2);
  });

  it('paused timers produce no events and wake times track the resumed deadline', () => {
    const h = harness();
    h.do({ type: 'start_timer', label: 'block', durationMs: 4 * MIN, clockPolicy: 'active' });
    h.advance(MIN);
    h.do({ type: 'pause_timer', timer: { implicit: true } });
    expect(dueEvents(h.session, T0 + 99 * MIN)).toEqual([]);
    expect(nextWakeAt(h.session, h.now)).toBeUndefined();
    h.advance(10 * MIN);
    h.do({ type: 'resume_timer', timer: { implicit: true } });
    expect(nextWakeAt(h.session, h.now)).toBe(T0 + 13 * MIN); // 1-min-remaining milestone (default)
  });
});
