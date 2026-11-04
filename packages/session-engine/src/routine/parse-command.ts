import { scanDurations } from '../parser/duration';
import type { Lang } from '../types';
import { hasHangul, norm, NUM_SRC, parseNum } from './numtok';
import type { RoutineCommand } from './run';

export type RoutineIntent =
  | { kind: 'command'; command: RoutineCommand }
  /** "이제 괜찮아", "mark as fixed": stop the latest correction cue. */
  | { kind: 'fix' }
  /** "어제 루틴 시작", "start my last routine". */
  | { kind: 'start_last' }
  /** "루틴 만들기", "create routine". */
  | { kind: 'create' };

const cmd = (command: RoutineCommand): RoutineIntent => ({ kind: 'command', command });

/** A word that must stop pacing immediately (handled on partials too). */
export const STOP_WORD_RE = /^(?:\s*(?:잠깐|잠시)?\s*)?(?:멈춰|멈춰줘|스톱|스탑|정지|일시\s*정지|stop|pause|hold on|wait)[\s.!]*$/u;

export function isStopWord(text: string): boolean {
  return STOP_WORD_RE.test(norm(text));
}

const N = `(${NUM_SRC})`;

function parseKo(t: string): RoutineIntent | null {
  if (/이제\s*괜찮|고쳤|고친\s*것\s*같|해결\s*(?:됐|했)|이\s*교정\s*(?:끝|해제)/.test(t)) return { kind: 'fix' };
  if (/(?:어제|지난번|저번|마지막|최근|지난|전에\s*한)[^,]*?(?:루틴|운동)?[^,]*?(?:시작|해줘|하자|할래|열어)/.test(t) && /(?:루틴|운동)/.test(t)) return { kind: 'start_last' };
  if (/(?:루틴|운동)\s*(?:만들|새로|짜)/.test(t)) return { kind: 'create' };

  let m = new RegExp(`${N}\\s*번\\s*(?:동작|무브|품새)?\\s*(?:부터|에서)\\s*(?:다시|반복)?|다시\\s*${N}\\s*번\\s*(?:동작)?`).exec(t);
  if (m) {
    const n = parseNum(m[1] ?? m[2]!);
    if (n !== undefined) return cmd({ kind: 'repeat_from', no: n });
  }
  m = /(.+?)\s*(?:대신(?:에)?|말고)\s*(.+?)\s*(?:로|으로|를|을)?\s*(?:해줘|할래|하자|할게|해)?$/.exec(t);
  if (m && !/세트|휴식/.test(t)) return cmd({ kind: 'swap', from: m[2]!.trim(), to: m[1]!.trim() });
  m = /(.+?)\s*(?:을|를)\s*(.+?)\s*(?:으로|로)\s*(?:바꿔|바꾸|교체|변경)/.exec(t);
  if (m && !/세트|휴식|쉬는/.test(t)) return cmd({ kind: 'swap', from: m[1]!.trim(), to: m[2]!.trim() });

  if (/(?:휴식|쉬는\s*시간|쉬는시간|쉬는)/.test(t)) {
    const d = scanDurations(t, 'ko').durations;
    if (d.length === 1) return cmd({ kind: 'rest', sec: Math.round(d[0]!.ms / 1000) });
  }
  if (/(?:한|1|하나)\s*세트\s*(?:더|추가)|세트\s*(?:하나|1|한\s*개)?\s*(?:더|추가)/.test(t)) return cmd({ kind: 'sets', delta: 1 });
  if (/(?:한|1|하나)\s*세트\s*(?:덜|적게|줄|빼)|세트\s*(?:하나|1|한\s*개)?\s*(?:덜|줄여|빼)/.test(t)) return cmd({ kind: 'sets', delta: -1 });
  m = new RegExp(`${N}\\s*(?:개|번|회)\\s*더|더\\s*${N}\\s*(?:개|번|회)`).exec(t);
  if (m) {
    const n = parseNum(m[1] ?? m[2]!);
    if (n !== undefined && n > 0) return cmd({ kind: 'more_reps', n });
  }
  if (/한\s*동작\s*(?:뒤로|전으로)|이전\s*동작|전\s*동작|뒤로\s*(?:가|돌아)|한\s*번\s*뒤로|하나\s*뒤로|^뒤로$/.test(t)) return cmd({ kind: 'back' });
  if (/건너\s*뛰|건너뛸|스킵|넘어가|넘겨|패스|다음\s*(?:운동|동작|거)\s*(?:으로|로)?\s*(?:가|해|넘어)?$/.test(t) && !/뭐|뭘|무엇/.test(t)) return cmd({ kind: 'skip' });
  if (/느리게|천천히|속도\s*(?:줄|낮)/.test(t)) return cmd({ kind: 'tempo', dir: 'slower' });
  if (/빠르게|빨리|속도\s*(?:올|높)/.test(t)) return cmd({ kind: 'tempo', dir: 'faster' });
  if (/다음(?:은|이)?\s*(?:뭐|뭘|무엇|어떤)|다음\s*(?:운동|동작)\s*(?:이|은)?\s*뭐/.test(t)) return cmd({ kind: 'query', query: 'next' });
  if (/얼마나\s*남|몇\s*(?:개|세트|동작)\s*(?:더\s*)?남|남았어|남은\s*(?:거|게|시간|운동)/.test(t)) return cmd({ kind: 'query', query: 'left' });
  if (/그만\s*(?:할래|할게|하자|해|둘래|할래요)|(?:운동|루틴)\s*(?:끝|종료)|끝낼래|끝내자|종료|여기까지/.test(t)) return cmd({ kind: 'end' });
  if (/다시\s*시작|계속|재개|이어서|이어가/.test(t)) return cmd({ kind: 'resume' });
  if (/^(?:잠깐|잠시)?\s*(?:멈춰|멈춰줘|스톱|스탑|정지|일시\s*정지|중지)|잠깐만?$|잠시만?$/.test(t)) return cmd({ kind: 'pause' });
  return null;
}

function parseEn(t: string): RoutineIntent | null {
  if (/\bmark (?:it |that )?(?:as )?fixed\b|\bfixed (?:it|that)\b|\bgot (?:it|that) now\b|\bi(?:ve| have) fixed\b/.test(t)) return { kind: 'fix' };
  if (/\b(?:start|begin|do|run|open)\s+(?:my\s+|the\s+)?(?:last|previous|latest|most recent|yesterday'?s?)\s*(?:routine|workout)?\b/.test(t) || /\bstart yesterday/.test(t)) return { kind: 'start_last' };
  if (/\b(?:create|make|build|new|set up)\s+(?:a\s+|my\s+|new\s+)?(?:routine|workout)\b/.test(t)) return { kind: 'create' };

  let m = new RegExp(`\\b(?:repeat|restart|redo|start over|go back|back|again|resume)?\\s*(?:from|at|to)\\s+(?:the\\s+)?(?:movement|move|count|step|number|no\\.?|#)?\\s*${N}\\b`).exec(t);
  if (m && /\b(?:repeat|restart|redo|start over|go back|back|again|from)\b/.test(t) && !/\bset\b/.test(t)) {
    const n = parseNum(m[1]!);
    if (n !== undefined) return cmd({ kind: 'repeat_from', no: n });
  }
  m = /\bswap\s+(.+?)\s+(?:for|with|to)\s+(.+)$/.exec(t);
  if (m) return cmd({ kind: 'swap', from: m[1]!.trim(), to: m[2]!.trim() });
  m = /\breplace\s+(.+?)\s+with\s+(.+)$/.exec(t);
  if (m) return cmd({ kind: 'swap', from: m[1]!.trim(), to: m[2]!.trim() });
  m = /^(?:do\s+)?(.+?)\s+instead(?:\s+of\s+(.+))?$/.exec(t);
  if (m) return cmd({ kind: 'swap', ...(m[2] ? { from: m[2].trim() } : {}), to: m[1]!.trim() });

  if (/\b(?:rest|break)\b/.test(t) && !/\bset\b.*\bmore\b/.test(t)) {
    const d = scanDurations(t, 'en').durations;
    if (d.length === 1) return cmd({ kind: 'rest', sec: Math.round(d[0]!.ms / 1000) });
  }
  if (/\b(?:one|1|another|a)\s+(?:more|extra|additional)\s+set\b|\badd\s+(?:a|one|1)\s+set\b|\banother set\b/.test(t)) return cmd({ kind: 'sets', delta: 1 });
  if (/\b(?:one|1|a)\s+(?:fewer|less)\s+set\b|\b(?:remove|drop|skip)\s+(?:a|one|1)\s+set\b|\bone set less\b/.test(t)) return cmd({ kind: 'sets', delta: -1 });
  m = new RegExp(`\\b${N}\\s+(?:more|extra|additional)(?:\\s+(?:reps?|times|repetitions?))?\\b|\\b(?:do|add)\\s+${N}\\s+more\\b`).exec(t);
  if (m) {
    const n = parseNum(m[1] ?? m[2]!);
    if (n !== undefined && n > 0) return cmd({ kind: 'more_reps', n });
  }
  if (/\b(?:go\s+)?back(?:\s+one(?:\s+(?:move|movement|rep|step))?)?\b|\bprevious\s+(?:move|movement|one)\b/.test(t) && !/\bback to\b/.test(t)) return cmd({ kind: 'back' });
  if (/\bskip\b|\bnext exercise\b|\bmove on\b/.test(t)) return cmd({ kind: 'skip' });
  if (/\bslower\b|\bslow down\b|\btoo fast\b/.test(t)) return cmd({ kind: 'tempo', dir: 'slower' });
  if (/\bfaster\b|\bspeed up\b|\btoo slow\b/.test(t)) return cmd({ kind: 'tempo', dir: 'faster' });
  if (/\bwhat(?:s| is)\s+next\b|\bnext up\b|\bwhat next\b/.test(t)) return cmd({ kind: 'query', query: 'next' });
  if (/\bhow many\b.*\b(?:left|more|remaining)\b|\bwhat(?:s| is)\s+left\b|\bhow much\s+(?:is\s+)?left\b|\bhow long\b.*\bleft\b|\bremaining\b/.test(t)) return cmd({ kind: 'query', query: 'left' });
  if (/\b(?:end|finish|quit|stop)\s+(?:the\s+|this\s+|my\s+)?(?:routine|workout|session)\b|\bi(?:m| am)\s+done\b|\bthat(?:s| is)\s+enough\b|\bend early\b/.test(t)) return cmd({ kind: 'end' });
  if (/\bresume\b|\bcontinue\b|\bkeep going\b|\bgo on\b|\bstart again\b/.test(t)) return cmd({ kind: 'resume' });
  if (/^(?:pause|stop|hold on|wait)\b/.test(t)) return cmd({ kind: 'pause' });
  return null;
}

/**
 * Deterministic parser for routine voice commands (live changes, "start my last routine", "create routine").
 * Returns null when the text is not a routine command (the caller may then try the correction-note parser or escalate).
 */
export function parseRoutineIntent(text: string, lang?: Lang): RoutineIntent | null {
  const t = norm(text.replace(/\bpush-up/g, 'pushup'));
  if (t === '') return null;
  const l = lang ?? (hasHangul(t) ? 'ko' : 'en');
  return l === 'ko' ? parseKo(t) : parseEn(t);
}
