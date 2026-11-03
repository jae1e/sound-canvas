import type { Candidate, Change, RejectReason } from './actions';
import { withParticle } from './korean';
import type { DueEvent, Lang } from './types';

// ---------------------------------------------------------------- helpers

/** "2분 30초" / "2 minutes 30 seconds". Rounds to whole seconds (at least 1 s for positive input). */
export function formatDuration(ms: number, lang: Lang): string {
  const total = ms > 0 ? Math.max(1, Math.round(ms / 1000)) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (lang === 'ko') {
    const parts = [h && `${h}시간`, m && `${m}분`, s && `${s}초`].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : '0초';
  }
  const unit = (n: number, name: string) => `${n} ${name}${n === 1 ? '' : 's'}`;
  const parts = [h && unit(h, 'hour'), m && unit(m, 'minute'), s && unit(s, 'second')].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '0 seconds';
}

const DEFAULT_LABELS = new Set(['타이머', 'timer', '']);

function isDefaultLabel(label: string): boolean {
  return DEFAULT_LABELS.has(label.trim().toLowerCase());
}

/** English plural heuristic for choosing is/are and it/they. */
function isPlural(label: string): boolean {
  return /[^s]s$/i.test(label.trim());
}

function joinNatural(items: string[], lang: Lang): string {
  if (lang === 'ko') {
    return items.join(', ');
  }
  if (items.length <= 2) return items.join(' or ');
  return `${items.slice(0, -1).join(', ')}, or ${items[items.length - 1]}`;
}

interface Clause {
  /** Connective form (continues into the next clause) and final form, without punctuation. */
  conn: string;
  fin: string;
}

function koTaskClause(label: string, status: string): Clause | null {
  const obj = withParticle(label, 'object');
  switch (status) {
    case 'completed':
      return { conn: `${obj} 완료로 표시하고`, fin: `${obj} 완료로 표시했어요` };
    case 'skipped':
      return { conn: `${obj} 건너뛰고`, fin: `${obj} 건너뛰었어요` };
    case 'cancelled':
      return { conn: `${obj} 취소하고`, fin: `${obj} 취소했어요` };
    case 'in_progress':
      return { conn: `${obj} 진행 중으로 표시하고`, fin: `${obj} 진행 중으로 표시했어요` };
    case 'pending':
      return { conn: `${obj} 다시 열고`, fin: `${obj} 다시 열었어요` };
    case 'awaiting_confirmation':
      return { conn: `${label} 확인을 기다리고`, fin: `${label} 확인을 기다리고 있어요` };
    default:
      return null;
  }
}

function enTaskClause(label: string, status: string): Clause | null {
  const the = `the ${label}`;
  switch (status) {
    case 'completed':
      return { conn: `Marked ${the} done`, fin: `Marked ${the} done` };
    case 'skipped':
      return { conn: `Skipped ${the}`, fin: `Skipped ${the}` };
    case 'cancelled':
      return { conn: `Cancelled ${the}`, fin: `Cancelled ${the}` };
    case 'in_progress':
      return { conn: `Marked ${the} in progress`, fin: `Marked ${the} in progress` };
    case 'pending':
      return { conn: `Reopened ${the}`, fin: `Reopened ${the}` };
    case 'awaiting_confirmation':
      return { conn: `Waiting for your confirmation on ${the}`, fin: `Waiting for your confirmation on ${the}` };
    default:
      return null;
  }
}

function timerLabel(label: string): { ko: string; en: string } {
  const none = isDefaultLabel(label);
  return {
    ko: none ? '타이머' : `${label} 타이머`,
    en: none ? 'the timer' : `the ${label} timer`,
  };
}

// ------------------------------------------------------------ acknowledgements

/**
 * Acknowledgement of a committed result only. Every clause is derived from an
 * entry in `changes`; nothing is claimed beyond them. Bookkeeping changes
 * (`due_handled`) are silent.
 */
export function describeChanges(changes: Change[], lang: Lang): string {
  const sentences: string[] = [];
  const merged = new Set<Change>();

  // "Marked X done and cancelled the check-in" - fold cancelled check-ins into the task change.
  for (const ch of changes) {
    if (ch.kind !== 'task_status') continue;
    const cancel = changes.find((c) => c.kind === 'check_ins_cancelled' && c.taskId === ch.taskId && c.count > 0);
    if (!cancel || cancel.kind !== 'check_ins_cancelled') continue;
    if (merged.has(cancel)) continue;
    const clause = lang === 'ko' ? koTaskClause(ch.label, ch.status) : enTaskClause(ch.label, ch.status);
    if (!clause) continue;
    merged.add(ch);
    merged.add(cancel);
    if (lang === 'ko') {
      const what = cancel.count > 1 ? `확인 알림 ${cancel.count}개를` : '확인 알림을';
      sentences.push(`${clause.conn} ${what} 취소했어요.`);
    } else {
      const what = cancel.count > 1 ? `${cancel.count} check-ins` : 'the check-in';
      sentences.push(`${clause.conn} and cancelled ${what}.`);
    }
  }

  // An extension already implies the task is back in progress; do not narrate that status change.
  for (const ch of changes) {
    if (ch.kind !== 'task_status' || ch.status !== 'in_progress') continue;
    const extended = changes.some(
      (c) =>
        (c.kind === 'check_in_scheduled' && c.taskId === ch.taskId) ||
        (c.kind === 'timer_extended' && c.label === ch.label),
    );
    if (extended) merged.add(ch);
  }

  for (const ch of changes) {
    if (merged.has(ch)) continue;
    const s = describeOne(ch, lang);
    if (s) sentences.push(s);
  }
  return sentences.join(' ');
}

function describeOne(ch: Change, lang: Lang): string {
  const ko = lang === 'ko';
  switch (ch.kind) {
    case 'session_status':
      switch (ch.status) {
        case 'paused':
          return ko ? '세션을 일시정지했어요.' : 'Paused the session.';
        case 'active':
          return ko ? '세션이 진행 중이에요.' : 'The session is running.';
        case 'ended':
          return ko ? '세션을 종료했어요.' : 'Ended the session.';
        default:
          return '';
      }
    case 'quiet':
      if (ch.quiet && ch.forMs !== undefined) {
        const dur = formatDuration(ch.forMs, lang);
        return ko ? `${dur} 동안 조용히 할게요.` : `Okay, quiet for ${dur}.`;
      }
      return ko
        ? ch.quiet ? '조용히 할게요.' : '다시 말씀드릴게요.'
        : ch.quiet ? 'Okay, quiet mode on.' : 'Quiet mode off.';
    case 'step_added':
      return ko ? `단계 ${withParticle(ch.label, 'object')} 추가했어요.` : `Added the step ${ch.label}.`;
    case 'step_edited':
      return ko ? `단계 이름을 ${withParticle(ch.label, 'instrumental')} 바꿨어요.` : `Updated the step ${ch.label}.`;
    case 'step_moved':
      return ko ? `${withParticle(ch.label, 'object')} ${ch.index}번째로 옮겼어요.` : `Moved ${ch.label} to position ${ch.index}.`;
    case 'step_removed':
      return ko ? `단계 ${withParticle(ch.label, 'object')} 삭제했어요.` : `Removed the step ${ch.label}.`;
    case 'step_started': {
      const est = ch.estimateMs !== undefined ? formatDuration(ch.estimateMs, lang) : '';
      if (ko) {
        const head = ch.returning ? '이전 단계로 돌아왔어요.' : '다음 단계예요.';
        return `${head} ${ch.total}단계 중 ${ch.index}번째, ${ch.label}${est ? `, 예상 ${est}` : ''}.`;
      }
      const head = ch.returning ? 'Back to' : 'Next is';
      return `${head} step ${ch.index} of ${ch.total}: ${ch.label}${est ? `, about ${est}` : ''}.`;
    }
    case 'plan_complete':
      return ko ? `${ch.total}단계를 모두 마쳤어요.` : `That was the last step. All ${ch.total} steps are done.`;
    case 'focus_break_set':
      return '';
    case 'task_added':
      return ko ? `${withParticle(ch.label, 'object')} 추가했어요.` : `Added the ${ch.label}.`;
    case 'task_status': {
      const clause = ko ? koTaskClause(ch.label, ch.status) : enTaskClause(ch.label, ch.status);
      return clause ? `${clause.fin}.` : '';
    }
    case 'timer_started': {
      const dur = formatDuration(ch.durationMs, lang);
      if (ko) {
        const name = isDefaultLabel(ch.label) ? '타이머를' : `${ch.label} 타이머를`;
        return `${name} ${withParticle(dur, 'instrumental')} 시작했어요.`;
      }
      return isDefaultLabel(ch.label)
        ? `Started a timer for ${dur}.`
        : `Started a ${ch.label} timer for ${dur}.`;
    }
    case 'timer_extended': {
      const name = timerLabel(ch.label);
      const rem = formatDuration(ch.remainingMs, lang);
      return ko ? `${name.ko}를 연장했어요. ${rem} 남았어요.` : `Extended ${name.en}. ${rem} left.`;
    }
    case 'timer_paused': {
      const name = timerLabel(ch.label);
      const rem = formatDuration(ch.remainingMs, lang);
      return ko ? `${name.ko}를 멈췄어요. ${rem} 남았어요.` : `Paused ${name.en} with ${rem} left.`;
    }
    case 'timer_resumed': {
      const name = timerLabel(ch.label);
      const rem = formatDuration(ch.remainingMs, lang);
      return ko ? `${name.ko}를 다시 시작했어요. ${rem} 남았어요.` : `Resumed ${name.en}, ${rem} left.`;
    }
    case 'timer_cancelled': {
      const name = timerLabel(ch.label);
      return ko ? `${name.ko}를 취소했어요.` : `Cancelled ${name.en}.`;
    }
    case 'timer_expired': {
      const name = timerLabel(ch.label);
      return ko ? `${name.ko}가 끝났어요.` : `${name.en.replace(/^the/, 'The')} is up.`;
    }
    case 'check_in_scheduled': {
      const dur = formatDuration(ch.inMs, lang);
      return ko
        ? `${ch.label} 확인을 ${dur} 뒤로 잡았어요.`
        : `I'll check the ${ch.label} in ${dur}.`;
    }
    case 'check_ins_cancelled':
      if (ch.count <= 0) return '';
      if (ko) return ch.count > 1 ? `${ch.label} 확인 알림 ${ch.count}개를 취소했어요.` : `${ch.label} 확인 알림을 취소했어요.`;
      return ch.count > 1
        ? `Cancelled ${ch.count} check-ins for the ${ch.label}.`
        : `Cancelled the check-in for the ${ch.label}.`;
    case 'due_handled':
      return '';
  }
}

// -------------------------------------------------------------------- due

/**
 * Text for a due event. Stale milestones and exhausted check-ins are silent
 * (empty string); a stale expiry is still worth saying, phrased as past.
 */
export function describeDue(event: DueEvent, lang: Lang): string {
  const ko = lang === 'ko';
  const named = !isDefaultLabel(event.label);
  const label = event.label;
  switch (event.kind) {
    case 'timer_milestone': {
      if (event.stale || !event.milestone) return '';
      const ms = event.milestone.offsetMs;
      const dur = formatDuration(ms, lang);
      const on = named ? ` on the ${label}` : '';
      if (event.milestone.kind === 'elapsed') {
        if (ko) return `${named ? `${label} ` : ''}${dur} 지났어요.`;
        return `${dur} ${/^1 \w+$/.test(dur) ? 'has' : 'have'} passed${on}.`;
      }
      return ko ? `${named ? `${label} ` : ''}${dur} 남았어요.` : `${dur} left${on}.`;
    }
    case 'timer_expired':
      if (event.stale) {
        return ko
          ? `${named ? `${label} ` : ''}시간이 지났어요. 확인하고 알려주세요.`
          : `${named ? `The ${label} timer ran out` : 'The timer ran out'}. Check it and let me know.`;
      }
      return ko
        ? `${named ? `${label} ` : ''}시간 다 됐어요. 확인하고 알려주세요.`
        : `${named ? `The ${label} timer is up` : "Time's up"}. Check it and let me know.`;
    case 'nudge':
      if (event.nudgeKind === 'focus_break') {
        const dur = event.elapsedMs !== undefined ? formatDuration(event.elapsedMs, lang) : '';
        if (ko) return dur ? `${dur} 동안 집중하셨어요. 잠깐 쉬어 볼까요?` : '잠깐 쉬어 볼까요?';
        return dur ? `That's ${dur} of focus. Want to take a short break?` : 'Want to take a short break?';
      }
      if (event.nudgeKind === 'skipped_step') {
        return ko
          ? `${withParticle(event.label, 'object')} 건너뛰셨어요. 일부러 그러신 건가요? 돌아가려면 이전이라고 말씀해 주세요.`
          : `You skipped ${event.label}. Was that on purpose? Say go back to return to it.`;
      }
      return '';
    case 'check_in': {
      const attempt = event.attempt ?? 1;
      if (event.overrun) {
        return ko
          ? `${event.label} 단계가 예상보다 오래 걸리고 있어요. 어떠세요? 시간이 더 필요하면 알려 주세요.`
          : `The ${event.label} step is taking longer than planned. How is it going? Tell me if you need more time.`;
      }
      if (ko) {
        if (attempt <= 1) return `${label} 다 됐는지 확인해 주시겠어요?`;
        if (attempt === 2) return `${label}, 다 됐는지 한 번만 더 확인해 주시겠어요?`;
        return `마지막으로 한 번 더 여쭤볼게요. ${label} 다 됐나요?`;
      }
      const plural = isPlural(label);
      const done = `${plural ? 'are' : 'is'} the ${label} done`;
      if (attempt <= 1) return `Could you check whether the ${label} ${plural ? 'are' : 'is'} done?`;
      if (attempt === 2) return `Just a gentle reminder: ${done} yet?`;
      return `One last check: ${done}?`;
    }
    case 'check_in_exhausted':
      return '';
  }
}

// -------------------------------------------------------------- rejections

export function describeRejection(
  reason: RejectReason,
  candidates: Candidate[] | undefined,
  lang: Lang,
): string {
  const ko = lang === 'ko';
  switch (reason) {
    case 'ambiguous_target': {
      const labels = (candidates ?? []).map((c) => c.label).slice(0, 4);
      if (labels.length < 2) return ko ? '어떤 걸 말씀하시는 건가요?' : 'Which one do you mean?';
      if (ko) {
        if (labels.length === 2) return `${labels[0]}${koWith(labels[0]!)} ${labels[1]} 중 어느 쪽이요?`;
        return `${joinNatural(labels, 'ko')} 중 어느 쪽이요?`;
      }
      return `Which one: ${joinNatural(labels, 'en')}?`;
    }
    case 'not_found':
      return ko ? '그건 찾지 못했어요.' : "I couldn't find that.";
    case 'stale_revision':
      return ko ? '방금 상태가 바뀌었어요. 다시 말씀해 주세요.' : 'Things just changed. Please say that again.';
    case 'invalid_state':
      return ko ? '지금은 그렇게 할 수 없어요.' : "I can't do that right now.";
    case 'invalid_value':
      return ko ? '그 값은 사용할 수 없어요.' : "That value doesn't work.";
  }
}

function koWith(word: string): string {
  return withParticle(word, 'with').slice(word.length);
}
