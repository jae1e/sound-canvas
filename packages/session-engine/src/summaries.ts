import type { Ref } from './actions';
import { formatDuration } from './messages';
import { currentStep, looseTasks, stepsOf } from './plan';
import { resolveTimer } from './refs';
import { remainingMs } from './timing';
import type { Lang, Session, Task, Timer } from './types';

/**
 * Deterministic spoken answers about the session state. Every sentence is derived from engine state;
 * nothing is generated or guessed. Used for "what's left?", "where was I?" and similar queries.
 */

const liveTimers = (s: Session): Timer[] =>
  Object.values(s.timers)
    .filter((t) => t.state === 'running' || t.state === 'paused')
    .sort((a, b) => a.createdAt - b.createdAt);

function listLabels(labels: string[], lang: Lang, max = 4): string {
  const shown = labels.slice(0, max);
  const more = labels.length - shown.length;
  if (lang === 'ko') return shown.join(', ') + (more > 0 ? ` 외 ${more}개` : '');
  const base = shown.length <= 2 ? shown.join(' and ') : `${shown.slice(0, -1).join(', ')}, and ${shown[shown.length - 1]}`;
  return base + (more > 0 ? `, and ${more} more` : '');
}

function timersSentence(s: Session, now: number, lang: Lang): string {
  const timers = liveTimers(s);
  if (timers.length === 0) return '';
  const parts = timers.slice(0, 3).map((t) => {
    const rem = formatDuration(remainingMs(t, now), lang);
    const name = t.label.trim() && !['타이머', 'timer'].includes(t.label.trim().toLowerCase()) ? t.label : '';
    if (lang === 'ko') return `${name ? `${name} 타이머` : '타이머'} ${rem} 남음`;
    return `${name ? `the ${name} timer` : 'the timer'} has ${rem} left`;
  });
  return lang === 'ko' ? `${parts.join(', ')}.` : `${parts.map((p, i) => (i === 0 ? p[0]!.toUpperCase() + p.slice(1) : p)).join('; ')}.`;
}

/** "What's left?" / "뭐 남았어?": remaining steps and open tasks, then live timers. */
export function describeStepsLeft(s: Session, now: number, lang: Lang): string {
  const ko = lang === 'ko';
  const steps = stepsOf(s);
  const openSteps = steps.filter((t) => t.status === 'pending' || t.status === 'in_progress' || t.status === 'awaiting_confirmation');
  const loose = looseTasks(s);
  const labels = [...openSteps, ...loose].map((t) => t.label);
  const timers = timersSentence(s, now, lang);
  if (labels.length === 0) {
    const none = steps.length > 0
      ? ko ? '남은 단계가 없어요. 모두 끝났어요.' : 'Nothing is left. All steps are done.'
      : ko ? '남은 할 일이 없어요.' : 'Nothing is left to do.';
    return [none, timers].filter(Boolean).join(' ');
  }
  const n = labels.length;
  const head = ko
    ? `${n}개 남았어요: ${listLabels(labels, lang)}.`
    : `${n} ${steps.length > 0 ? (n === 1 ? 'step' : 'steps') : n === 1 ? 'item' : 'items'} left: ${listLabels(labels, lang)}.`;
  return [head, timers].filter(Boolean).join(' ');
}

function stepPosition(s: Session, t: Task): { index: number; total: number } {
  const list = stepsOf(s);
  return { index: list.findIndex((x) => x.id === t.id) + 1, total: list.length };
}

function nextPendingAfter(s: Session, t: Task | undefined): Task | undefined {
  const pending = stepsOf(s).filter((x) => x.status === 'pending');
  return (t?.order !== undefined ? pending.find((x) => (x.order as number) > (t.order as number)) : undefined) ?? pending[0];
}

/** "Where was I?" / "어디까지 했지?": the current step, how long it has run, and what comes next. */
export function describeWhere(s: Session, now: number, lang: Lang): string {
  const ko = lang === 'ko';
  const cur = currentStep(s);
  const steps = stepsOf(s);
  if (!cur) {
    if (steps.length === 0) {
      const loose = looseTasks(s);
      if (loose.length === 0) return ko ? '진행 중인 작업이 없어요.' : "You're not working on anything yet.";
      const list = listLabels(loose.map((t) => t.label), lang);
      return ko ? `진행 중인 작업은 ${list}이에요.` : `You're working on ${list}.`;
    }
    const done = steps.filter((t) => t.status === 'completed' || t.status === 'skipped').length;
    if (done === steps.length) return ko ? `${steps.length}단계를 모두 마쳤어요.` : `All ${steps.length} steps are done.`;
    const next = nextPendingAfter(s, undefined);
    return ko ? `아직 시작 전이에요. 첫 단계는 ${next?.label ?? ''}이에요.` : `You haven't started yet. The first step is ${next?.label ?? ''}.`;
  }
  const { index, total } = stepPosition(s, cur);
  const spent = cur.startedAt !== undefined ? formatDuration(Math.max(0, now - cur.startedAt), lang) : '';
  const next = nextPendingAfter(s, cur);
  const timers = timersSentence(s, now, lang);
  const sentences: string[] = [];
  if (ko) {
    sentences.push(`${total}단계 중 ${index}번째, ${cur.label} 하는 중이에요${spent ? `. ${spent} 지났어요` : ''}.`);
    if (cur.estimateMs !== undefined) sentences.push(`예상 시간은 ${formatDuration(cur.estimateMs, lang)}이에요.`);
    sentences.push(next ? `다음은 ${next.label}이에요.` : '이게 마지막 단계예요.');
  } else {
    sentences.push(`You're on step ${index} of ${total}: ${cur.label}${spent ? `, for ${spent} so far` : ''}.`);
    if (cur.estimateMs !== undefined) sentences.push(`It was planned for ${formatDuration(cur.estimateMs, lang)}.`);
    sentences.push(next ? `Next is ${next.label}.` : "That's the last step.");
  }
  if (timers) sentences.push(timers);
  return sentences.join(' ');
}

/** "What's the next step?": only the upcoming step. */
export function describeNextStep(s: Session, lang: Lang): string {
  const ko = lang === 'ko';
  const cur = currentStep(s);
  const next = nextPendingAfter(s, cur);
  if (!next) {
    return stepsOf(s).length === 0
      ? ko ? '계획된 단계가 없어요.' : "There's no plan yet."
      : ko ? '다음 단계는 없어요.' : "There's no next step.";
  }
  const { index, total } = stepPosition(s, next);
  return ko ? `다음은 ${total}단계 중 ${index}번째, ${next.label}이에요.` : `Next is step ${index} of ${total}: ${next.label}.`;
}

/** "How much time is left?": the named timer, or every live timer. */
export function describeTimeLeft(s: Session, now: number, lang: Lang, target?: Ref): string {
  const ko = lang === 'ko';
  if (target && !('implicit' in target)) {
    const r = resolveTimer(s, target);
    if (r.ok) {
      const t = r.value;
      const rem = formatDuration(remainingMs(t, now), lang);
      const name = t.label.trim() && !['타이머', 'timer'].includes(t.label.trim().toLowerCase()) ? t.label : '';
      if (t.state === 'paused') return ko ? `${name} 타이머는 멈춰 있고 ${rem} 남았어요.` : `The ${name ? `${name} ` : ''}timer is paused with ${rem} left.`;
      return ko ? `${name ? `${name} ` : ''}${rem} 남았어요.` : `${rem} left${name ? ` on the ${name}` : ''}.`;
    }
  }
  const timers = timersSentence(s, now, lang);
  return timers || (ko ? '실행 중인 타이머가 없어요.' : 'No timers are running.');
}

/** Short status: position in the plan plus timers. */
export function describeStatus(s: Session, now: number, lang: Lang): string {
  return [describeWhere(s, now, lang)].filter(Boolean).join(' ');
}

/** Elapsed time of the whole session, for reflections. */
export function sessionElapsedMs(s: Session, now: number): number {
  return s.startedAt === undefined ? 0 : Math.max(0, (s.endedAt ?? now) - s.startedAt);
}

export function describeCannotAnswer(lang: Lang): string {
  return lang === 'ko' ? '그건 아직 대답할 수 없어요.' : "I can't answer that yet.";
}

export function describeNoteSaved(lang: Lang, label?: string): string {
  if (lang === 'ko') return label ? `${label} 단계에 메모를 저장했어요.` : '메모를 저장했어요.';
  return label ? `Saved the note on ${label}.` : 'Saved the note.';
}

const EN_Q_START = /^(?:what|whats|how|why|when|where|which|who|whose|can|could|do|does|did|is|are|am|was|were|should|will|would|tell me|explain|convert)\b/;
const KO_Q = /(?:뭐|뭔|무엇|무슨|얼마|어떻게|어떤|왜|언제|어디|누구|몇|어느)|(?:까요?|나요|가요|니|냐|죠|인가|할까|될까|알려줘|알려주세요|말해줘|설명해)$/;

/** Heuristic: is this transcript a question the deterministic layer could not answer (so the LLM tier should see it)? */
export function looksLikeQuestion(text: string, lang: Lang): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/[?？]\s*$/.test(t)) return true;
  if (lang === 'ko') return KO_Q.test(t.replace(/[\s.!]+/g, ''));
  const plain = t.toLowerCase().replace(/[’']/g, '').replace(/[^\p{L}\p{N}\s/]/gu, ' ').replace(/\s+/g, ' ').trim();
  return EN_Q_START.test(plain);
}
