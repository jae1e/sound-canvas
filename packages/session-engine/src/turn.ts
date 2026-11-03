import type { Action } from './actions';
import { apply } from './engine';
import { type ChosenHypothesis, chooseHypothesis } from './hypothesis';
import { describeChanges, describeRejection } from './messages';
import { type Intent, type ParseContext, parseUtterance } from './parser';
import {
  describeCannotAnswer,
  describeNextStep,
  describeStatus,
  describeStepsLeft,
  describeTimeLeft,
  describeWhere,
  looksLikeQuestion,
} from './summaries';
import type { Lang, Session } from './types';

export interface TurnResult {
  /** The session after the turn (unchanged unless `outcome` is `applied`). */
  session: Session;
  chosen: ChosenHypothesis | null;
  intent: Intent | null;
  /**
   * - `applied`: an action changed the session.
   * - `answered`: a deterministic spoken answer to a query (the session is unchanged).
   * - `needs_llm`: a question the deterministic layer cannot answer; `reply` is the short "can't answer yet".
   * - `unsupported_intent`: journal, recording or navigation; the app handles it from `intent`.
   */
  outcome: 'empty' | 'no_intent' | 'unsupported_intent' | 'applied' | 'rejected' | 'answered' | 'needs_llm';
  /** Spoken acknowledgement, or null when nothing should be said (unrecognised speech stays silent). */
  reply: string | null;
}

/** Labels the user can refer to right now: open tasks and live timers. */
export function parseContextOf(session: Session): ParseContext {
  return {
    taskLabels: Object.values(session.tasks)
      .filter((t) => t.status !== 'completed' && t.status !== 'skipped' && t.status !== 'cancelled')
      .map((t) => t.label),
    timerLabels: Object.values(session.timers)
      .filter((t) => t.state === 'running' || t.state === 'paused')
      .map((t) => t.label),
  };
}

type Ctx = { now: number; newId: () => string };

/**
 * One voice turn: pick the best recognizer hypothesis with the session's real labels, parse it, apply the first action and
 * produce the acknowledgement. Replies use the session language so they match the TTS voice.
 * Queries about the plan and timers are answered deterministically. Journal, recording and navigation intents are reported as
 * `unsupported_intent` (handled elsewhere). Questions that nothing here can answer are reported as `needs_llm`.
 */
export function handleUtterance(session: Session, hypotheses: string[], lang: Lang, ctx: Ctx): TurnResult {
  const parseCtx = parseContextOf(session);
  const chosen = chooseHypothesis(hypotheses, lang, parseCtx);
  if (!chosen) return { session, chosen: null, intent: null, outcome: 'empty', reply: null };
  const parsed = parseUtterance(chosen.text, lang, parseCtx);
  const intent = parsed.intents[0] ?? null;
  if (parsed.confidence !== 'high' || !intent) {
    if (looksLikeQuestion(chosen.text, lang)) {
      return { session, chosen, intent: null, outcome: 'needs_llm', reply: describeCannotAnswer(session.lang) };
    }
    return { session, chosen, intent: null, outcome: 'no_intent', reply: null };
  }
  const answer = answerIntent(session, intent, ctx.now);
  if (answer !== undefined) return { session, chosen, intent, outcome: 'answered', reply: answer };
  if (intent.kind === 'plan') return applyAll(session, chosen, intent, planActions(session, intent), ctx);
  if (intent.kind !== 'action') return { session, chosen, intent, outcome: 'unsupported_intent', reply: null };
  return applyAll(session, chosen, intent, [intent.action], ctx);
}

/** Deterministic answer for a query intent, or undefined when the intent is not a query this layer answers. */
export function answerIntent(session: Session, intent: Intent, now: number): string | undefined {
  const lang = session.lang;
  if (intent.kind === 'navigation' && session.mode === 'activity' && intent.query === 'next_instruction') {
    return describeNextStep(session, lang);
  }
  if (intent.kind !== 'query') return undefined;
  switch (intent.query) {
    case 'steps_left':
      return describeStepsLeft(session, now, lang);
    case 'where':
      return describeWhere(session, now, lang);
    case 'next_step':
      return describeNextStep(session, lang);
    case 'remaining':
      return describeTimeLeft(session, now, lang, intent.target);
    case 'status':
      return describeStatus(session, now, lang);
  }
}

/** A spoken plan: one `add_step` per step, then start the first one if nothing is current yet. */
function planActions(session: Session, intent: Extract<Intent, { kind: 'plan' }>): Action[] {
  const actions: Action[] = intent.steps.map((label) => ({ type: 'add_step', label }));
  if (!session.currentTaskId) actions.push({ type: 'next_step' });
  return actions;
}

function applyAll(session: Session, chosen: ChosenHypothesis, intent: Intent, actions: Action[], ctx: Ctx): TurnResult {
  let current = session;
  const replies: string[] = [];
  for (const action of actions) {
    const r = apply(current, { action, source: 'voice', expectedRevision: current.revision }, ctx);
    if (!r.ok) {
      const reply = describeRejection(r.reason, r.candidates, session.lang) || null;
      return current === session
        ? { session, chosen, intent, outcome: 'rejected', reply }
        : { session: current, chosen, intent, outcome: 'applied', reply: [...replies, reply].filter(Boolean).join(' ') || null };
    }
    current = r.session;
    const said = describeChanges(r.changes, session.lang);
    if (said) replies.push(said);
  }
  const reply = actions.length > 1 && intent.kind === 'plan' ? planReply(current, intent.steps.length, replies) : replies.join(' ');
  return { session: current, chosen, intent, outcome: 'applied', reply: reply || null };
}

function planReply(session: Session, count: number, replies: string[]): string {
  const started = replies.find((r) => /step \d+ of|번째/.test(r)) ?? '';
  return session.lang === 'ko' ? `${count}개 단계를 추가했어요. ${started}`.trim() : `Added ${count} steps. ${started}`.trim();
}
