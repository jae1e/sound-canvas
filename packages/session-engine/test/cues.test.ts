import { describe, expect, it } from 'vitest';
import { classifyDue, diffCues, isSuppressed, parseSession, planCues, planTemplateSchema, builtinTemplates, templateActions, templateFromSession, BUILTIN_TEMPLATES, createSession } from '../src';
import { MIN, T0, harness } from './helpers';

function session() {
  const h = harness();
  h.do({ type: 'start_session' });
  h.do({ type: 'add_step', label: 'frame', estimateMs: 20 * MIN });
  h.do({ type: 'add_step', label: 'shelves' });
  h.do({ type: 'next_step' });
  h.do({ type: 'start_timer', label: 'glue', durationMs: 10 * MIN });
  h.do({ type: 'set_focus_break', afterMs: 50 * MIN });
  return h;
}

describe('cue planning', () => {
  it('plans milestone, expiry, overrun and focus break at normal level', () => {
    const h = session();
    const cues = planCues(h.session, 'en', 'normal');
    expect(cues.map((c) => c.kind)).toEqual(['timer_milestone', 'timer_expired', 'check_in', 'nudge']);
    expect(cues.map((c) => c.atEpochMs)).toEqual([T0 + 9 * MIN, T0 + 10 * MIN, T0 + 20 * MIN, T0 + 50 * MIN]);
    expect(cues[0]?.text).toBe('1 minute left on the glue.');
    expect(cues[1]?.class).toBe('requested');
  });

  it('the quiet level keeps only user-requested cues', () => {
    const cues = planCues(session().session, 'en', 'quiet');
    expect(cues.map((c) => c.kind)).toEqual(['timer_expired']);
  });

  it('quiet mode suppresses nudges but not timer expiry', () => {
    const h = session();
    h.do({ type: 'set_quiet', quiet: true });
    expect(planCues(h.session, 'en', 'chatty').map((c) => c.kind)).toEqual(['timer_expired']);
  });

  it('timed quiet lets later events through', () => {
    const h = session();
    h.do({ type: 'set_quiet', quiet: true, forMs: 15 * MIN });
    const kinds = planCues(h.session, 'en', 'normal').map((c) => c.kind);
    expect(kinds).toEqual(['timer_expired', 'check_in', 'nudge']);
  });

  it('chatty adds a derived halfway cue for an estimated step', () => {
    const cues = planCues(session().session, 'en', 'chatty');
    const half = cues.find((c) => c.kind === 'step_halfway');
    expect(half).toMatchObject({ atEpochMs: T0 + 10 * MIN, derived: true, text: 'Halfway through frame. About 10 minutes left.' });
    expect(planCues(session().session, 'en', 'normal').some((c) => c.kind === 'step_halfway')).toBe(false);
  });

  it('nothing is planned after the session ends', () => {
    const h = session();
    h.do({ type: 'end_session' });
    expect(planCues(h.session, 'en', 'chatty')).toEqual([]);
  });

  it('skipped-step question respects the level', () => {
    const h = session();
    h.do({ type: 'skip_task', task: { implicit: true } });
    expect(planCues(h.session, 'en', 'normal').some((c) => c.text.startsWith('You skipped'))).toBe(true);
    expect(planCues(h.session, 'en', 'quiet').some((c) => c.text.startsWith('You skipped'))).toBe(false);
  });

  it('classifies and suppresses consistently', () => {
    const h = session();
    const tm = Object.values(h.session.timers)[0]!;
    expect(classifyDue({ key: 'k', kind: 'timer_expired', dueAt: 0, label: tm.label })).toBe('requested');
    expect(isSuppressed(h.session, { key: 'k', kind: 'check_in_exhausted', dueAt: 0, label: '' }, 'chatty')).toBe(true);
  });
});

describe('cue diffing', () => {
  it('schedules new and changed cues and cancels the missing ones', () => {
    const planned = [
      { id: 'a', atEpochMs: 1, text: '', kind: 'timer_expired' as const, class: 'requested' as const },
      { id: 'b', atEpochMs: 5, text: '', kind: 'timer_expired' as const, class: 'requested' as const },
    ];
    const diff = diffCues(planned, new Map([['a', 1], ['b', 4], ['gone', 9]]));
    expect(diff.schedule.map((c) => c.id)).toEqual(['b']);
    expect(diff.cancel).toEqual(['gone']);
  });
});

describe('session schema', () => {
  it('round-trips an engine session through JSON', () => {
    const h = session();
    const restored = parseSession(JSON.parse(JSON.stringify(h.session)));
    expect(restored).toEqual(JSON.parse(JSON.stringify(h.session)));
    expect(restored?.nudges).toBeDefined();
  });
  it('restores sessions saved before nudges existed', () => {
    const old = JSON.parse(JSON.stringify(createSession({ id: 's', mode: 'activity', lang: 'en', now: 1 })));
    delete old.nudges;
    expect(parseSession(old)?.nudges).toEqual({});
  });
  it('rejects corrupt data', () => {
    expect(parseSession({ id: 'x' })).toBeNull();
    expect(parseSession(null)).toBeNull();
    const bad = JSON.parse(JSON.stringify(session().session));
    bad.status = 'weird';
    expect(parseSession(bad)).toBeNull();
  });
});

describe('templates', () => {
  it('ships the four example templates in both languages and they validate', () => {
    expect(BUILTIN_TEMPLATES.map((t) => t.id)).toEqual(['builtin-focus', 'builtin-furniture', 'builtin-stretching', 'builtin-cooking']);
    for (const lang of ['ko', 'en'] as const) {
      for (const t of builtinTemplates(lang)) expect(planTemplateSchema.safeParse(t).success).toBe(true);
    }
    expect(builtinTemplates('ko')[0]?.name).toBe('집중 세션');
  });
  it('loading a template creates its steps through the engine', () => {
    const h = harness();
    h.do({ type: 'start_session' });
    for (const a of templateActions(builtinTemplates('en')[1]!)) h.do(a);
    expect(Object.values(h.session.tasks).map((t) => t.label)[0]).toBe('Unpack and check the parts');
    expect(Object.values(h.session.tasks)).toHaveLength(5);
    expect(Object.values(h.session.tasks)[0]?.estimateMs).toBe(10 * MIN);
  });
  it('captures a session plan as a template, preserving order and estimates', () => {
    const h = session();
    h.do({ type: 'move_step', task: { label: 'shelves' }, toIndex: 0 });
    const t = templateFromSession(h.session, 'Mine', 'tpl-1');
    expect(t.steps.map((s) => s.label)).toEqual(['shelves', 'frame']);
    expect(t.steps[1]?.estimateMs).toBe(20 * MIN);
  });
  it('rejects malformed templates', () => {
    expect(planTemplateSchema.safeParse({ id: 'x', name: '', steps: [] }).success).toBe(false);
    expect(planTemplateSchema.safeParse({ id: 'x', name: 'n', steps: [{ label: ' ' }] }).success).toBe(false);
  });
});

