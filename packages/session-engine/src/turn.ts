import { apply } from './engine';
import { type ChosenHypothesis, chooseHypothesis } from './hypothesis';
import { describeChanges, describeRejection } from './messages';
import { type Intent, type ParseContext, parseUtterance } from './parser';
import type { Lang, Session } from './types';

export interface TurnResult {
  /** The session after the turn (unchanged unless `outcome` is `applied`). */
  session: Session;
  chosen: ChosenHypothesis | null;
  intent: Intent | null;
  outcome: 'empty' | 'no_intent' | 'unsupported_intent' | 'applied' | 'rejected';
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

/**
 * One voice turn: pick the best recognizer hypothesis with the session's real labels, parse it, apply the first action and
 * produce the acknowledgement. Replies use the session language so they match the TTS voice.
 * Queries, journal, recording and navigation intents are reported as `unsupported_intent` (handled elsewhere).
 */
export function handleUtterance(
  session: Session,
  hypotheses: string[],
  lang: Lang,
  ctx: { now: number; newId: () => string },
): TurnResult {
  const parseCtx = parseContextOf(session);
  const chosen = chooseHypothesis(hypotheses, lang, parseCtx);
  if (!chosen) return { session, chosen: null, intent: null, outcome: 'empty', reply: null };
  const parsed = parseUtterance(chosen.text, lang, parseCtx);
  const intent = parsed.intents[0] ?? null;
  if (parsed.confidence !== 'high' || !intent) return { session, chosen, intent: null, outcome: 'no_intent', reply: null };
  if (intent.kind !== 'action') return { session, chosen, intent, outcome: 'unsupported_intent', reply: null };
  const r = apply(session, { action: intent.action, source: 'voice', expectedRevision: session.revision }, ctx);
  if (!r.ok) {
    return { session, chosen, intent, outcome: 'rejected', reply: describeRejection(r.reason, r.candidates, session.lang) || null };
  }
  return { session: r.session, chosen, intent, outcome: 'applied', reply: describeChanges(r.changes, session.lang) || null };
}
