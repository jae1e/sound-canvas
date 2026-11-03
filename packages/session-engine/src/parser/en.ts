import type { Action } from '../actions';
import { type Span, findMention, normalizeSpoken, refOf, removeSpans, stripLeadingFillers } from './common';
import { scanDurations } from './duration';
import type { Intent, ParseContext } from './types';

function words(s: string): string[] {
  return s ? s.split(' ') : [];
}

function onlyFrom(tokens: string[], allowed: ReadonlySet<string>): boolean {
  return tokens.every((t) => allowed.has(t));
}

function set(list: string): ReadonlySet<string> {
  return new Set(list.split(/\s+/).filter(Boolean));
}

// ---------------------------------------------------------------- journal

const JOURNAL_PATTERNS: RegExp[] = [
  /^(?:journal(?: note| entry)?|diary(?: entry)?|note to self|note|memo)\s*[:\-–—]\s*(\S[\s\S]*)$/iu,
  /^(?:journal note|journal entry|diary entry)\s+(\S[\s\S]*)$/iu,
  /^(?:save|take|make|add|write|jot|record)(?: down)?\s+(?:a |the )?(?:quick )?(?:note|memo|journal entry|journal note)\s*(?:[:\-–—]\s*)?(\S[\s\S]*)$/iu,
];

function journal(raw: string): Intent | null {
  for (const re of JOURNAL_PATTERNS) {
    const text = re.exec(raw)?.[1]?.trim();
    if (text) return { kind: 'journal', text };
  }
  return null;
}

// -------------------------------------------------------------- recording

const RECORD_STOP = /^(?:stop|end|finish|turn off|cancel) (?:the |my |this )?recording$/;
const RECORD_START = /^(?:(?:start|begin|turn on) (?:a |the |my )?(?:new )?recording|record(?: this| me| it| that)?)(?: now)?$/;
const RECORD_PLAY = [
  /^play (?:it|that|this|the recording|my recording|the last take|the last one|the last recording|the take) back$/,
  /^play back (?:it|that|this|the recording|my recording|the last take|the last one|the last recording|the take)$/,
  /^(?:play|replay) (?:it|that|this|the recording|the last take|the last one|the last recording) again$/,
  /^(?:play|replay) (?:the recording|the last take|the last recording|the last one)$/,
  /^replay(?: it| that)?$/,
  /^let me hear (?:it|that|the recording|the last take|the last one)(?: again)?$/,
];

function recording(s: string): Intent | null {
  if (RECORD_STOP.test(s)) return { kind: 'recording', command: 'stop' };
  if (RECORD_PLAY.some((re) => re.test(s))) return { kind: 'recording', command: 'play' };
  if (RECORD_START.test(s)) return { kind: 'recording', command: 'start' };
  return null;
}

// ------------------------------------------------------------- navigation

const NAV_DIST_WORDS = set('is it the destination there to go left away do i we have got now still from here until get arrive my');
const NAV_NEXT = [
  /^(?:whats|what is) (?:the )?next(?: (?:turn|step|instruction|direction|move))?$/,
  /^where (?:do|should|must) (?:i|we) (?:turn|go|head)(?: next)?$/,
  /^which way(?: (?:do|should) (?:i|we) (?:turn|go))?(?: next)?$/,
  /^(?:the )?next (?:turn|direction|instruction)$/,
  /^where (?:to|next)$/,
];

function navigation(s: string): Intent | null {
  if (NAV_NEXT.some((re) => re.test(s))) return { kind: 'navigation', query: 'next_instruction' };
  const m = /^how (?:much )?(?:far|farther|further)(?: (.*))?$/.exec(s);
  if (m && onlyFrom(words(m[1] ?? ''), NAV_DIST_WORDS)) return { kind: 'navigation', query: 'distance_remaining' };
  if (/^how many (?:meters|metres|miles|km|kilometers|kilometres|blocks|feet|steps) (?:left|to go|away|more)$/.test(s)) {
    return { kind: 'navigation', query: 'distance_remaining' };
  }
  if (/^(?:the )?distance (?:left|remaining|to go)$/.test(s)) return { kind: 'navigation', query: 'distance_remaining' };
  return null;
}

// ------------------------------------------------------------------ rules

const EXTEND_MARKERS = set('more extra another longer add extend additional');
const EXTEND_WORDS = set(
  'not yet no nope done still give it them that this let cook go add extend by for can i have need needs we ill make keep going to timer wait hold on just only bit more extra another longer additional the a also run bake boil one time ok okay',
);
const CHECK_VERBS = set('check remind ask ping tell nudge');
const CHECK_WORDS = set(
  'check on up back remind me to ask again tell ping nudge the it how is are going if whether its done ready finished can you could with about this that them and let know when ill i will want need in my they theyre cooked ok okay',
);
const TIMER_WORDS = set(
  'set start a an the me timer for please can you could new create make begin go up on of my run i want need to another lets give us it ill also countdown ok okay now',
);
/** Words that make a leftover phrase a sentence rather than a timer label ("give it 5 minutes"). */
const ELLIPTICAL_STOP = set(
  'i me my we us you it that this them they he she is are was be to of in on at after by from give giving let lets please set start run make add can could would will should do does did have has take takes need wait waiting more extra another longer again later left remaining ago what how when why which who and or but not no yes for',
);
const TIMER_DENY = set('cancel stop pause resume delete clear kill remove off restart continue unpause');
const CTL_WORDS = set('the my a this that timer please can you could for on turn off it again now let lets go up back shut start');

const DONE_SUBJ = '(?:its|it is|thats|that is|theyre|they are|this is|is|are|all)';
const DONE_MAIN = new RegExp(`^(?:${DONE_SUBJ} )?(?:all )?(?:done|finished|complete|completed|cooked)(?: now| cooking| already| with it)?$`);
/** "ready" alone is too ambiguous ("ready?"), so it needs a subject: "it's ready". */
const DONE_READY = new RegExp(`^${DONE_SUBJ} (?:all )?ready(?: now)?$`);
const NOT_YET = [
  /^(?:(?:no|nope|nah) )?not (?:yet|done|ready|finished|quite|quite yet|done yet|ready yet|finished yet)$/,
  new RegExp(`^(?:${DONE_SUBJ} )?(?:still )?not (?:yet|done|ready|finished|done yet|ready yet|finished yet)$`),
  /^(?:it )?(?:isnt|arent) (?:done|ready|finished)(?: yet)?$/,
  /^(?:(?:its|it is) )?still (?:cooking|going|baking|boiling|running|working|in progress|not done)$/,
];

const QUIET_OFF = [
  /^unmute(?: yourself)?$/,
  /^(?:you can|you may|feel free to) (?:talk|speak) again$/,
  /^(?:talk|speak) again$/,
  /^(?:turn off|disable|exit) quiet(?: mode)?$/,
  /^quiet mode off$/,
  /^start talking again$/,
];
const QUIET_ON = [
  /^(?:be|stay|keep|go|keep it) (?:quiet|silent)$/,
  /^quiet$/,
  /^mute(?: yourself)?$/,
  /^quiet mode(?: on)?$/,
  /^(?:turn on|enable|switch to|go into|use) quiet mode$/,
  /^(?:talk|speak) less$/,
  /^hush$/,
];

const SESSION_PAUSE = /^pause(?: the)?(?: session| everything)?$/;
const SESSION_RESUME = /^(?:lets )?(?:resume|continue|carry on|keep going|go on)(?: the)?(?: session| everything)?$/;
const SESSION_END = [
  /^(?:lets )?(?:end|stop|finish|wrap up|close)(?: the)? (?:session|today)$/,
  /^(?:lets )?(?:end|stop|finish|wrap up) for today$/,
  /^(?:were|we are|im|i am) (?:all )?done for (?:today|now|the day|tonight)$/,
  /^thats (?:all|it) for (?:today|now)$/,
  /^lets (?:call it a day|wrap up)$/,
];
const SKIP = /^(?:lets )?skip(?: this| it| that| this one| that one| this step| this task)?$/;

const REMAINING = [
  /^how (?:much time|long|many (?:minutes|seconds|hours))(?: is| are| do we have| do i have| does it have)?(?: still)? (?:left|remaining|to go)(?: on| for| in| with)?(?: it| this| that)?$/,
  /^how much (?:time )?longer(?: to go)?(?: on| for)?$/,
  /^(?:whats the )?time (?:left|remaining)(?: on| for)?(?: it| this)?$/,
  /^how much (?:time )?(?:is )?left(?: on| for)?$/,
];
const STATUS = [
  /^(?:whats|what is) (?:the |our |my )?(?:current )?(?:status|progress)(?: of| on| for)?$/,
  /^(?:give me |tell me )?(?:a |the )?status(?: update| report)?$/,
];

// ------------------------------------------------------------------ entry

export function parseEn(raw: string, ctx: ParseContext): Intent[] {
  const text = stripLeadingFillers(raw, 'en');
  const j = journal(text);
  if (j) return [j];

  const s = normalizeSpoken(text).replace(/\s+(?:please|thanks|thank you)$/, '');
  if (!s) return [];

  const rec = recording(s);
  if (rec) return [rec];
  const nav = navigation(s);
  if (nav) return [nav];

  const { mention, conflict } = findMention(s, ctx, 'en');
  if (conflict) return [];
  const ref = refOf(mention);
  const act = (action: Action): Intent[] => [{ kind: 'action', action }];

  const scan = scanDurations(s, 'en');
  if (scan.vague || scan.durations.length > 1) return [];
  const dur = scan.durations[0];

  // Widen the duration span to include its preposition ("in", "for", ...) and "from now".
  let prep: string | undefined;
  const durSpans: Span[] = [];
  if (dur) {
    let { start, end } = dur;
    const before = /(?:^|\s)(in|after|for|by|within|to)\s+$/.exec(s.slice(0, start));
    if (before) {
      prep = before[1];
      start -= before[0].length - (before[0].startsWith(' ') ? 1 : 0);
    }
    const after = /^\s+(?:from now|later)\b/.exec(s.slice(end));
    if (after) end += after[0].length;
    durSpans.push({ start, end });
  }
  const labelSpan: Span[] = mention ? [{ start: mention.start, end: mention.end }] : [];
  const rl = removeSpans(s, labelSpan, ' ');
  const r = removeSpans(s, [...labelSpan, ...durSpans], ' ');
  const rTokens = words(r);

  if (dur) {
    // Extension: "two more minutes", "give it 30 seconds more", "not yet, five more minutes".
    const marked = dur.more || rTokens.some((t) => EXTEND_MARKERS.has(t));
    if (marked && (prep === undefined || prep === 'for' || prep === 'by') && onlyFrom(rTokens, EXTEND_WORDS)) {
      return act({ type: 'extend_task', task: ref, byMs: dur.ms });
    }

    // Timers: "set a timer for 5 minutes", "10 minute timer for the pasta".
    if (rTokens.includes('timer') && (prep === undefined || prep === 'for' || prep === 'to')) {
      const extra = rTokens.filter((t) => !TIMER_WORDS.has(t));
      if (extra.some((t) => TIMER_DENY.has(t)) || extra.length > 3 || (mention && extra.length > 0)) return [];
      const label = mention?.label ?? (extra.length > 0 ? extra.join(' ') : 'timer');
      const action: Action = { type: 'start_timer', label, durationMs: dur.ms };
      if (mention?.source === 'task') action.task = { label: mention.label };
      return act(action);
    }

    // Elliptical timers: "pasta 3 minutes", "3 minutes pasta", "pasta for 3 minutes", bare "3 minutes".
    if (!rTokens.includes('timer') && (prep === undefined || prep === 'for')) {
      const lead = rTokens.length > 1 && ['a', 'an', 'the', 'my'].includes(rTokens[0]!) ? rTokens.slice(1) : rTokens;
      const bare = lead.length === 0;
      const plain = lead.length <= 2 && lead.every((t) => !ELLIPTICAL_STOP.has(t) && !TIMER_DENY.has(t));
      if (!(prep === 'for' && bare && !mention) && (mention ? rTokens.length === 0 : plain)) {
        const label = mention?.label ?? (bare ? 'timer' : lead.join(' '));
        const action: Action = { type: 'start_timer', label, durationMs: dur.ms };
        if (mention?.source === 'task') action.task = { label: mention.label };
        return act(action);
      }
    }

    // Check-ins: "check on the pasta in 2 minutes", "remind me in 10 minutes".
    if ((prep === 'in' || prep === 'after') && rTokens.some((t) => CHECK_VERBS.has(t)) && onlyFrom(rTokens, CHECK_WORDS)) {
      return act({ type: 'schedule_check_in', task: ref, inMs: dur.ms });
    }
    return [];
  }

  // Timer control: "pause the timer", "cancel the pasta timer".
  const tokens = words(rl);
  if (tokens.includes('timer')) {
    const pause = tokens.some((t) => ['pause', 'hold', 'freeze'].includes(t));
    const resume =
      tokens.some((t) => ['resume', 'unpause', 'restart', 'continue'].includes(t)) ||
      (tokens.includes('start') && tokens.includes('again'));
    const cancel = tokens.some((t) => ['cancel', 'stop', 'delete', 'clear', 'kill', 'remove', 'dismiss', 'off'].includes(t));
    const verbs = set('pause hold freeze resume unpause restart continue cancel stop delete clear kill remove dismiss');
    if (Number(pause) + Number(resume) + Number(cancel) === 1 && tokens.every((t) => CTL_WORDS.has(t) || verbs.has(t))) {
      if (pause) return act({ type: 'pause_timer', timer: ref });
      if (resume) return act({ type: 'resume_timer', timer: ref });
      return act({ type: 'cancel_timer', timer: ref });
    }
    return [];
  }

  if (REMAINING.some((re) => re.test(rl))) return [{ kind: 'query', query: 'remaining', target: ref }];
  if (STATUS.some((re) => re.test(rl))) return [{ kind: 'query', query: 'status', ...(mention ? { target: ref } : {}) }];

  if (QUIET_OFF.some((re) => re.test(rl))) return act({ type: 'set_quiet', quiet: false });
  if (QUIET_ON.some((re) => re.test(rl))) return act({ type: 'set_quiet', quiet: true });

  if (SESSION_PAUSE.test(rl)) return act({ type: 'pause_session' });
  if (SESSION_RESUME.test(rl)) return act({ type: 'resume_session' });
  if (SESSION_END.some((re) => re.test(rl))) return act({ type: 'end_session' });

  if (SKIP.test(rl)) return act({ type: 'skip_task', task: ref });

  if (NOT_YET.some((re) => re.test(rl))) return act({ type: 'report_task', task: ref, report: 'not_yet' });
  if (DONE_MAIN.test(rl) || DONE_READY.test(rl)) return act({ type: 'report_task', task: ref, report: 'done' });
  return [];
}
