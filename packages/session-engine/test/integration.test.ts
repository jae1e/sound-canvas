import { describe, expect, it } from 'vitest';
import {
  apply,
  createSession,
  describeChanges,
  describeDue,
  describeRejection,
  dueEvents,
  nextWakeAt,
  parseUtterance,
  type Lang,
  type Session,
} from '../src';

const MIN = 60_000;

/**
 * Minimal stand-in for the app's voice loop: parse → apply → acknowledge,
 * and deliver due events through the scheduler.
 */
function companion(lang: Lang) {
  let now = 0;
  let n = 0;
  const newId = () => `e${++n}`;
  let session: Session = createSession({ id: 's', mode: 'activity', lang, now });
  session = mustApply(session, { type: 'start_session' });

  function mustApply(s: Session, action: Parameters<typeof apply>[1]['action']): Session {
    const r = apply(s, { action, source: 'ui' }, { now, newId });
    if (!r.ok) throw new Error(r.reason);
    return r.session;
  }

  return {
    get session() {
      return session;
    },
    addTask(label: string) {
      session = mustApply(session, { type: 'add_task', label });
    },
    say(text: string): string {
      const ctx = {
        taskLabels: Object.values(session.tasks).map((t) => t.label),
        timerLabels: Object.values(session.timers).map((t) => t.label),
      };
      const parsed = parseUtterance(text, lang, ctx);
      const intent = parsed.intents[0];
      if (parsed.confidence !== 'high' || !intent || intent.kind !== 'action') return '<escalate>';
      const r = apply(session, { action: intent.action, source: 'voice', expectedRevision: session.revision }, { now, newId });
      if (!r.ok) return describeRejection(r.reason, r.candidates, lang);
      session = r.session;
      return describeChanges(r.changes, lang);
    },
    /** Advance the clock and return what the companion would say. */
    advanceTo(t: number): string[] {
      now = t;
      const spoken: string[] = [];
      for (const ev of dueEvents(session, now)) {
        const text = describeDue(ev, lang);
        if (text) spoken.push(text);
        const r = apply(session, { action: { type: 'handle_due', key: ev.key, outcome: 'delivered' }, source: 'system' }, { now, newId });
        if (r.ok) session = r.session;
      }
      return spoken;
    },
    get nextWake() {
      return nextWakeAt(session, now);
    },
  };
}

describe('README cooking dialogue (English)', () => {
  it('tracks two dishes, checks in, extends, and completes', () => {
    const c = companion('en');
    c.addTask('pasta');
    c.addTask('mushrooms');

    expect(c.say('Set a timer for 8 minutes for the pasta')).not.toBe('<escalate>');
    expect(c.say('Check on the mushrooms in 3 minutes')).toMatch(/mushrooms/i);

    // Ambiguous "done" with two open tasks must ask, not guess.
    expect(c.say('done')).toMatch(/pasta|mushrooms/i);
    expect(Object.values(c.session.tasks).every((t) => t.status !== 'completed')).toBe(true);

    expect(c.nextWake).toBe(3 * MIN);
    const atThree = c.advanceTo(3 * MIN);
    expect(atThree.join(' ')).toMatch(/mushrooms/i);

    // The single task awaiting confirmation is the implicit target now.
    expect(c.say('Not yet. Two more minutes.')).toMatch(/2 minutes/);
    expect(c.advanceTo(4 * MIN)).toEqual([]);

    const atSeven = c.advanceTo(7 * MIN);
    expect(atSeven.join(' ')).toMatch(/pasta/i); // one minute remaining on the pasta

    const ack = c.say('The mushrooms are done');
    expect(ack).toMatch(/mushrooms/i);
    const mushrooms = Object.values(c.session.tasks).find((t) => t.label === 'mushrooms');
    expect(mushrooms?.status).toBe('completed');
    // No mushroom reminders remain.
    expect(dueEvents(c.session, 60 * MIN).some((e) => e.label === 'mushrooms')).toBe(false);
  });
});

describe('Superseded milestones and redundant acknowledgements (English)', () => {
  it('announces only the expiry after a clock jump, and does not narrate in_progress', () => {
    const c = companion('en');
    c.addTask('pasta');
    c.addTask('mushrooms');
    c.say('Set a timer for 8 minutes for the pasta');
    c.say('Check on the mushrooms in 3 minutes');
    c.advanceTo(3 * MIN);
    c.advanceTo(5 * MIN);
    expect(c.say('not yet, two more minutes')).toBe("I'll check the mushrooms in 2 minutes.");
    const spoken = c.advanceTo(8 * MIN);
    expect(spoken.filter((s) => /pasta/i.test(s))).toEqual(['The pasta timer is up. Check it and let me know.']);
  });
});

describe('Korean polite not-yet', () => {
  it('extends with 아직이요 2분만 더', () => {
    const c = companion('ko');
    c.addTask('버섯');
    c.say('3분 뒤에 버섯 확인해줘');
    c.advanceTo(3 * MIN);
    expect(c.say('아직이요 2분만 더')).toBe('버섯 확인을 2분 뒤로 잡았어요.');
  });
});

describe('Korean cooking dialogue', () => {
  it('handles extension and completion in Korean', () => {
    const c = companion('ko');
    c.addTask('파스타');
    c.addTask('버섯');

    expect(c.say('3분 뒤에 버섯 확인해줘')).toMatch(/버섯/);
    expect(c.advanceTo(3 * MIN).join(' ')).toMatch(/버섯/);
    expect(c.say('아직, 2분 더')).toMatch(/2분/);
    expect(c.advanceTo(5 * MIN).join(' ')).toMatch(/버섯/);
    expect(c.say('버섯 다 됐어요')).toMatch(/버섯/);
    const mushrooms = Object.values(c.session.tasks).find((t) => t.label === '버섯');
    expect(mushrooms?.status).toBe('completed');
  });

  it('escalates utterances outside the grammar', () => {
    const c = companion('ko');
    expect(c.say('오늘 저녁 뭐 해먹을까')).toBe('<escalate>');
  });
});
