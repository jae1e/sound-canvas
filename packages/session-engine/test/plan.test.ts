import { describe, expect, it } from 'vitest';
import { dueEvents, describeChanges, describeDue, currentStep, isQuiet, stepsOf, type Session } from '../src';
import { MIN, T0, harness } from './helpers';

function planned(labels: string[] = ['unpack', 'frame', 'shelves', 'doors'], estimates: Record<string, number> = {}) {
  const h = harness();
  h.do({ type: 'start_session' });
  for (const label of labels) h.do({ type: 'add_step', label, ...(estimates[label] ? { estimateMs: estimates[label] } : {}) });
  return h;
}
const labels = (s: Session) => stepsOf(s).map((t) => t.label);
const statuses = (s: Session) => stepsOf(s).map((t) => t.status);

describe('plan steps', () => {
  it('adds pending steps in order and numbers them', () => {
    const h = planned();
    expect(labels(h.session)).toEqual(['unpack', 'frame', 'shelves', 'doors']);
    expect(statuses(h.session)).toEqual(['pending', 'pending', 'pending', 'pending']);
    expect(h.session.currentTaskId).toBeUndefined();
  });

  it('inserts at an index and renumbers', () => {
    const h = planned(['a', 'c']);
    h.do({ type: 'add_step', label: 'b', index: 1 });
    expect(labels(h.session)).toEqual(['a', 'b', 'c']);
    expect(stepsOf(h.session).map((t) => t.order)).toEqual([0, 1, 2]);
  });

  it('rejects empty labels and bad estimates', () => {
    const h = planned([]);
    expect(h.try({ type: 'add_step', label: '  ' })).toMatchObject({ ok: false, reason: 'invalid_value' });
    expect(h.try({ type: 'add_step', label: 'x', estimateMs: -5 })).toMatchObject({ ok: false, reason: 'invalid_value' });
  });

  it('edits label and estimate, and clears the estimate with null', () => {
    const h = planned(['a']);
    h.do({ type: 'edit_step', task: { label: 'a' }, label: 'alpha', estimateMs: 5 * MIN });
    expect(stepsOf(h.session)[0]).toMatchObject({ label: 'alpha', estimateMs: 5 * MIN });
    h.do({ type: 'edit_step', task: { label: 'alpha' }, estimateMs: null });
    expect(stepsOf(h.session)[0]?.estimateMs).toBeUndefined();
  });

  it('refuses to edit a free-standing task as a step', () => {
    const h = planned([]);
    h.do({ type: 'add_task', label: 'pasta' });
    expect(h.try({ type: 'edit_step', task: { label: 'pasta' }, label: 'x' })).toMatchObject({ ok: false, reason: 'invalid_state' });
  });

  it('moves steps and clamps the target index', () => {
    const h = planned(['a', 'b', 'c', 'd']);
    h.do({ type: 'move_step', task: { label: 'd' }, toIndex: 0 });
    expect(labels(h.session)).toEqual(['d', 'a', 'b', 'c']);
    h.do({ type: 'move_step', task: { label: 'd' }, toIndex: 99 });
    expect(labels(h.session)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('removes a step and closes the gap', () => {
    const h = planned(['a', 'b', 'c']);
    h.do({ type: 'remove_step', task: { label: 'b' } });
    expect(labels(h.session)).toEqual(['a', 'c']);
    expect(stepsOf(h.session).map((t) => t.order)).toEqual([0, 1]);
  });
});

describe('step navigation', () => {
  it('next_step with no current step starts the first', () => {
    const h = planned();
    const r = h.do({ type: 'next_step' });
    expect(currentStep(h.session)?.label).toBe('unpack');
    expect(statuses(h.session)).toEqual(['in_progress', 'pending', 'pending', 'pending']);
    expect(describeChanges(r.changes, 'en')).toBe('Next is step 1 of 4: unpack.');
    expect(describeChanges(r.changes, 'ko')).toContain('4단계 중 1번째');
  });

  it('next_step completes the current step and starts the next', () => {
    const h = planned();
    h.do({ type: 'next_step' });
    const r = h.do({ type: 'next_step' });
    expect(statuses(h.session)).toEqual(['completed', 'in_progress', 'pending', 'pending']);
    expect(currentStep(h.session)?.label).toBe('frame');
    expect(describeChanges(r.changes, 'en')).toBe('Marked the unpack done. Next is step 2 of 4: frame.');
  });

  it('finishing the last step announces completion and clears the current step', () => {
    const h = planned(['a', 'b']);
    h.do({ type: 'next_step' });
    h.do({ type: 'next_step' });
    const r = h.do({ type: 'next_step' });
    expect(currentStep(h.session)).toBeUndefined();
    expect(statuses(h.session)).toEqual(['completed', 'completed']);
    expect(r.changes.some((c) => c.kind === 'plan_complete')).toBe(true);
    expect(h.try({ type: 'next_step' })).toMatchObject({ ok: false, reason: 'invalid_state' });
  });

  it('"done" on the current step advances like next_step', () => {
    const h = planned();
    h.do({ type: 'next_step' });
    h.do({ type: 'report_task', task: { implicit: true }, report: 'done' });
    expect(currentStep(h.session)?.label).toBe('frame');
    expect(statuses(h.session)[0]).toBe('completed');
  });

  it('prev_step reopens the previous step and returns the current one to pending', () => {
    const h = planned();
    h.do({ type: 'next_step' });
    h.do({ type: 'next_step' });
    const r = h.do({ type: 'prev_step' });
    expect(statuses(h.session)).toEqual(['in_progress', 'pending', 'pending', 'pending']);
    expect(currentStep(h.session)?.label).toBe('unpack');
    expect(describeChanges(r.changes, 'en')).toBe('Back to step 1 of 4: unpack.');
  });

  it('prev_step on the first step is rejected', () => {
    const h = planned();
    h.do({ type: 'next_step' });
    expect(h.try({ type: 'prev_step' })).toMatchObject({ ok: false, reason: 'invalid_state' });
  });

  it('prev_step after the plan finished reopens the last step', () => {
    const h = planned(['a', 'b']);
    for (let i = 0; i < 3; i++) h.do({ type: 'next_step' });
    h.do({ type: 'prev_step' });
    expect(currentStep(h.session)?.label).toBe('b');
  });

  it('skip moves on, and an earlier skipped step can be reopened with back', () => {
    const h = planned();
    h.do({ type: 'next_step' });
    h.do({ type: 'skip_task', task: { implicit: true } });
    expect(statuses(h.session)).toEqual(['skipped', 'in_progress', 'pending', 'pending']);
    h.do({ type: 'prev_step' });
    expect(statuses(h.session)).toEqual(['in_progress', 'pending', 'pending', 'pending']);
  });

  it('removing the current step starts the following one', () => {
    const h = planned();
    h.do({ type: 'next_step' });
    h.do({ type: 'remove_step', task: { label: 'unpack' } });
    expect(currentStep(h.session)?.label).toBe('frame');
  });

  it('does not touch free-standing tasks (cooking sessions keep working)', () => {
    const h = planned([]);
    h.do({ type: 'add_task', label: 'pasta' });
    h.do({ type: 'add_task', label: 'sauce' });
    h.do({ type: 'report_task', task: { label: 'pasta' }, report: 'done' });
    expect(h.session.currentTaskId).toBeUndefined();
    expect(h.session.tasks[Object.keys(h.session.tasks)[0]!]?.status).toBe('completed');
  });
});

describe('step overrun check-in', () => {
  it('arms one check-in at the estimate when the step starts', () => {
    const h = planned(['a', 'b'], { a: 5 * MIN });
    h.do({ type: 'next_step' });
    const ci = Object.values(h.session.checkIns);
    expect(ci).toHaveLength(1);
    expect(ci[0]).toMatchObject({ reason: 'overrun', dueAt: T0 + 5 * MIN, maxAttempts: 1 });
  });

  it('produces a due event worded as an overrun, not as "is it done?"', () => {
    const h = planned(['a'], { a: 5 * MIN });
    h.do({ type: 'next_step' });
    h.at(T0 + 5 * MIN);
    const [ev] = dueEvents(h.session, h.now);
    expect(ev).toMatchObject({ kind: 'check_in', overrun: true });
    expect(describeDue(ev!, 'en')).toContain('taking longer than planned');
  });

  it('is cancelled silently when the step is finished early', () => {
    const h = planned(['a', 'b'], { a: 5 * MIN });
    h.do({ type: 'next_step' });
    const r = h.do({ type: 'next_step' });
    expect(Object.values(h.session.checkIns).every((c) => c.status === 'cancelled')).toBe(true);
    expect(r.changes.some((c) => c.kind === 'check_ins_cancelled')).toBe(false);
    expect(describeChanges(r.changes, 'en')).not.toContain('check-in');
  });

  it('is pushed out by the length of a pause', () => {
    const h = planned(['a'], { a: 5 * MIN });
    h.do({ type: 'next_step' });
    h.advance(2 * MIN);
    h.do({ type: 'pause_session' });
    h.advance(10 * MIN);
    expect(dueEvents(h.session, h.now)).toEqual([]);
    h.do({ type: 'resume_session' });
    expect(Object.values(h.session.checkIns)[0]?.dueAt).toBe(T0 + 15 * MIN);
  });

  it('re-arms when the estimate of the current step is edited', () => {
    const h = planned(['a'], { a: 5 * MIN });
    h.do({ type: 'next_step' });
    h.do({ type: 'edit_step', task: { label: 'a' }, estimateMs: 8 * MIN });
    const open = Object.values(h.session.checkIns).filter((c) => c.status === 'scheduled');
    expect(open).toHaveLength(1);
    expect(open[0]?.dueAt).toBe(T0 + 8 * MIN);
  });

  it('"not yet" answers it, and extending reschedules a normal check-in', () => {
    const h = planned(['a'], { a: 5 * MIN });
    h.do({ type: 'next_step' });
    h.at(T0 + 5 * MIN);
    h.do({ type: 'handle_due', key: dueEvents(h.session, h.now)[0]!.key, outcome: 'delivered' });
    h.do({ type: 'extend_task', task: { implicit: true }, byMs: 2 * MIN });
    const fresh = Object.values(h.session.checkIns).find((c) => c.status === 'scheduled');
    expect(fresh?.reason).toBeUndefined();
    expect(fresh?.dueAt).toBe(T0 + 7 * MIN);
  });
});

describe('skipped-step question', () => {
  it('is scheduled once after a skip and not repeated for the same step', () => {
    const h = planned();
    h.do({ type: 'next_step' });
    h.do({ type: 'skip_task', task: { implicit: true } });
    const nudges = Object.values(h.session.nudges);
    expect(nudges).toHaveLength(1);
    expect(nudges[0]).toMatchObject({ kind: 'skipped_step', status: 'scheduled' });
    h.advance(31_000);
    const [ev] = dueEvents(h.session, h.now);
    expect(ev).toMatchObject({ kind: 'nudge', nudgeKind: 'skipped_step', label: 'unpack' });
    expect(describeDue(ev!, 'en')).toBe('You skipped unpack. Was that on purpose? Say go back to return to it.');
    h.do({ type: 'handle_due', key: ev!.key, outcome: 'delivered' });
    // Go back and skip the same step again: no second question.
    h.do({ type: 'prev_step' });
    h.do({ type: 'skip_task', task: { implicit: true } });
    expect(Object.values(h.session.nudges)).toHaveLength(1);
  });

  it('is cancelled when the user goes back before it fires', () => {
    const h = planned();
    h.do({ type: 'next_step' });
    h.do({ type: 'skip_task', task: { implicit: true } });
    h.do({ type: 'prev_step' });
    expect(Object.values(h.session.nudges)[0]?.status).toBe('cancelled');
    h.advance(60_000);
    expect(dueEvents(h.session, h.now)).toEqual([]);
  });

  it('is not created for free-standing tasks', () => {
    const h = planned([]);
    h.do({ type: 'add_task', label: 'pasta' });
    h.do({ type: 'skip_task', task: { label: 'pasta' } });
    expect(Object.values(h.session.nudges)).toHaveLength(0);
  });
});

describe('focus break', () => {
  it('fires after N minutes, re-arms after being handled, and can be turned off', () => {
    const h = planned(['a']);
    h.do({ type: 'set_focus_break', afterMs: 50 * MIN });
    h.at(T0 + 49 * MIN);
    expect(dueEvents(h.session, h.now)).toEqual([]);
    h.at(T0 + 50 * MIN);
    const [ev] = dueEvents(h.session, h.now);
    expect(ev).toMatchObject({ kind: 'nudge', nudgeKind: 'focus_break', elapsedMs: 50 * MIN });
    expect(describeDue(ev!, 'en')).toBe("That's 50 minutes of focus. Want to take a short break?");
    expect(describeDue(ev!, 'ko')).toContain('50분');
    h.do({ type: 'handle_due', key: ev!.key, outcome: 'delivered' });
    const next = Object.values(h.session.nudges).find((n) => n.status === 'scheduled');
    expect(next?.dueAt).toBe(T0 + 100 * MIN);
    h.do({ type: 'set_focus_break', afterMs: null });
    expect(Object.values(h.session.nudges).some((n) => n.status === 'scheduled')).toBe(false);
  });

  it('does not run while the session is paused and shifts by the pause on resume', () => {
    const h = planned(['a']);
    h.do({ type: 'set_focus_break', afterMs: 10 * MIN });
    h.advance(5 * MIN);
    h.do({ type: 'pause_session' });
    h.advance(30 * MIN);
    expect(dueEvents(h.session, h.now)).toEqual([]);
    h.do({ type: 'resume_session' });
    expect(Object.values(h.session.nudges).find((n) => n.status === 'scheduled')?.dueAt).toBe(T0 + 40 * MIN);
  });

  it('is cancelled when the session ends', () => {
    const h = planned(['a']);
    h.do({ type: 'set_focus_break', afterMs: 10 * MIN });
    h.do({ type: 'end_session' });
    expect(Object.values(h.session.nudges).every((n) => n.status !== 'scheduled')).toBe(true);
  });

  it('rejects an invalid length', () => {
    const h = planned(['a']);
    expect(h.try({ type: 'set_focus_break', afterMs: 0 })).toMatchObject({ ok: false, reason: 'invalid_value' });
  });
});

describe('quiet for N minutes', () => {
  it('expires by itself', () => {
    const h = planned(['a']);
    const r = h.do({ type: 'set_quiet', quiet: true, forMs: 10 * MIN });
    expect(describeChanges(r.changes, 'en')).toBe('Okay, quiet for 10 minutes.');
    expect(describeChanges(r.changes, 'ko')).toBe('10분 동안 조용히 할게요.');
    expect(isQuiet(h.session, T0 + 9 * MIN)).toBe(true);
    expect(isQuiet(h.session, T0 + 10 * MIN)).toBe(false);
  });

  it('plain quiet has no end and turning it off clears the deadline', () => {
    const h = planned(['a']);
    h.do({ type: 'set_quiet', quiet: true });
    expect(isQuiet(h.session, T0 + 999 * MIN)).toBe(true);
    h.do({ type: 'set_quiet', quiet: true, forMs: MIN });
    h.do({ type: 'set_quiet', quiet: false });
    expect(h.session.quietUntil).toBeUndefined();
    expect(isQuiet(h.session, T0)).toBe(false);
  });

  it('rejects a bad duration', () => {
    const h = planned(['a']);
    expect(h.try({ type: 'set_quiet', quiet: true, forMs: -1 })).toMatchObject({ ok: false, reason: 'invalid_value' });
  });
});
