import { describe, expect, it } from 'vitest';
import type { Action } from '../src/actions';
import { type Intent, type ParseContext, parseUtterance } from '../src/parser';

const ctx: ParseContext = { taskLabels: ['pasta', 'mushrooms', 'steak'], timerLabels: ['pasta', 'rest'] };
const none: ParseContext = { taskLabels: [], timerLabels: [] };
const imp = { implicit: true } as const;
const act = (action: Action): Intent => ({ kind: 'action', action });

type Case = [utterance: string, expected: Intent | null, context?: ParseContext];

const cases: Case[] = [
  // done
  ['done', act({ type: 'report_task', task: imp, report: 'done' }), none],
  ['Finished.', act({ type: 'report_task', task: imp, report: 'done' }), none],
  ["it's ready", act({ type: 'report_task', task: imp, report: 'done' }), none],
  ["It's done!", act({ type: 'report_task', task: imp, report: 'done' }), none],
  ['complete', act({ type: 'report_task', task: imp, report: 'done' }), none],
  ['um okay the mushrooms are done', act({ type: 'report_task', task: { label: 'mushrooms' }, report: 'done' })],
  ["the pasta's ready", act({ type: 'report_task', task: { label: 'pasta' }, report: 'done' })],
  // not yet
  ['not yet', act({ type: 'report_task', task: imp, report: 'not_yet' }), none],
  ['not done', act({ type: 'report_task', task: imp, report: 'not_yet' }), none],
  ['still cooking', act({ type: 'report_task', task: imp, report: 'not_yet' }), none],
  ['no, not yet', act({ type: 'report_task', task: imp, report: 'not_yet' }), none],
  ["the steak isn't done yet", act({ type: 'report_task', task: { label: 'steak' }, report: 'not_yet' })],
  // extend
  ['two more minutes', act({ type: 'extend_task', task: imp, byMs: 120_000 }), none],
  ['30 seconds more', act({ type: 'extend_task', task: imp, byMs: 30_000 }), none],
  ['give it five more minutes', act({ type: 'extend_task', task: imp, byMs: 300_000 }), none],
  ['not yet, two more minutes', act({ type: 'extend_task', task: imp, byMs: 120_000 }), none],
  ['thirty more seconds please', act({ type: 'extend_task', task: imp, byMs: 30_000 }), none],
  ['give the pasta a minute and a half more', act({ type: 'extend_task', task: { label: 'pasta' }, byMs: 90_000 })],
  ['yes it is done', act({ type: 'report_task', task: imp, report: 'done' }), none],
  ['a couple of minutes more', act({ type: 'extend_task', task: imp, byMs: 120_000 }), none],
  // check-in
  ['check on the mushrooms in 2 minutes', act({ type: 'schedule_check_in', task: { label: 'mushrooms' }, inMs: 120_000 })],
  ['check the pasta in three minutes', act({ type: 'schedule_check_in', task: { label: 'pasta' }, inMs: 180_000 })],
  ['remind me in ten minutes', act({ type: 'schedule_check_in', task: imp, inMs: 600_000 }), none],
  ['check back in an hour and a half', act({ type: 'schedule_check_in', task: imp, inMs: 5_400_000 }), none],
  // timers
  ['set a timer for 2 minutes 30 seconds', act({ type: 'start_timer', label: 'timer', durationMs: 150_000 }), none],
  ['set a timer for ten minutes', act({ type: 'start_timer', label: 'timer', durationMs: 600_000 }), none],
  ['10 minute timer for the pasta', act({ type: 'start_timer', label: 'pasta', durationMs: 600_000, task: { label: 'pasta' } })],
  ['start a 5 minute rest timer', act({ type: 'start_timer', label: 'rest', durationMs: 300_000 }), none],
  ['start a ninety second rest timer', act({ type: 'start_timer', label: 'rest', durationMs: 90_000 })],
  ['pause the timer', act({ type: 'pause_timer', timer: imp }), none],
  ['resume the timer', act({ type: 'resume_timer', timer: imp }), none],
  ['cancel the timer', act({ type: 'cancel_timer', timer: imp }), none],
  ['turn off the timer', act({ type: 'cancel_timer', timer: imp }), none],
  ['pause the rest timer', act({ type: 'pause_timer', timer: { label: 'rest' } })],
  // session
  ['pause the session', act({ type: 'pause_session' }), none],
  ['pause', act({ type: 'pause_session' }), none],
  ['resume', act({ type: 'resume_session' }), none],
  ["let's continue", act({ type: 'resume_session' }), none],
  ['end the session', act({ type: 'end_session' }), none],
  ["we're done for today", act({ type: 'end_session' }), none],
  // quiet
  ['be quiet', act({ type: 'set_quiet', quiet: true }), none],
  ['mute', act({ type: 'set_quiet', quiet: true }), none],
  ['quiet mode', act({ type: 'set_quiet', quiet: true }), none],
  ['unmute', act({ type: 'set_quiet', quiet: false }), none],
  ['you can talk again', act({ type: 'set_quiet', quiet: false }), none],
  // skip
  ['skip', act({ type: 'skip_task', task: imp }), none],
  ['skip this', act({ type: 'skip_task', task: imp }), none],
  ['skip the steak', act({ type: 'skip_task', task: { label: 'steak' } })],
  // queries
  ['how much time is left', { kind: 'query', query: 'remaining', target: imp }, none],
  ['how long left on the pasta', { kind: 'query', query: 'remaining', target: { label: 'pasta' } }],
  ["what's the status", { kind: 'query', query: 'status' }, none],
  // navigation
  ['how much farther', { kind: 'navigation', query: 'distance_remaining' }, none],
  ['how far is it?', { kind: 'navigation', query: 'distance_remaining' }, none],
  ["what's next", { kind: 'navigation', query: 'next_instruction' }, none],
  ['where do I turn', { kind: 'navigation', query: 'next_instruction' }, none],
  // journal
  ['journal note: the walk felt great', { kind: 'journal', text: 'the walk felt great' }, none],
  ['Note: buy more olive oil', { kind: 'journal', text: 'buy more olive oil' }, none],
  ['save a note the soup needed salt', { kind: 'journal', text: 'the soup needed salt' }, none],
  ['um, journal note - voice felt tired today', { kind: 'journal', text: 'voice felt tired today' }, none],
  // recording
  ['start recording', { kind: 'recording', command: 'start' }, none],
  ['stop recording', { kind: 'recording', command: 'stop' }, none],
  ['play it back', { kind: 'recording', command: 'play' }, none],
  // negatives: must not guess
  ['what should I cook tonight', null],
  ['a few minutes more', null],
  ['give it a few more minutes', null],
  ['remind me to stretch in five minutes', null],
  ['more', null],
  ['save a note', null],
  ['cancel the 5 minute timer for pasta and mushrooms', null],
  ["it's raining outside", null],
  ['ready', null],
  ['', null],
];

describe('English Tier 0 parser', () => {
  it.each(cases)('%s', (utterance, expected, context = ctx) => {
    const result = parseUtterance(utterance, 'en', context);
    if (expected === null) {
      expect(result).toEqual({ intents: [], confidence: 'low' });
    } else {
      expect(result).toEqual({ intents: [expected], confidence: 'high' });
    }
  });

  it('does not match a label inside another word', () => {
    // "tea" must not match inside "steak"
    const r = parseUtterance('the steak is done', 'en', { taskLabels: ['tea', 'steak'], timerLabels: [] });
    expect(r.intents).toEqual([act({ type: 'report_task', task: { label: 'steak' }, report: 'done' })]);
  });
});
