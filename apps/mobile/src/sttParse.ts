import { chooseHypothesis, parseUtterance, type Intent } from '@vlc/session-engine';

type Lang = 'ko' | 'en';

function seconds(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s >= 3600 && s % 60 === 0) return `${s / 3600}h`;
  if (s >= 60 && s % 60 === 0) return `${s / 60}m`;
  if (s > 60) return `${Math.floor(s / 60)}m${s % 60}s`;
  return `${s}s`;
}

function describeIntent(i: Intent): string {
  switch (i.kind) {
    case 'action': {
      const a = i.action;
      switch (a.type) {
        case 'start_timer':
          return `action:start_timer ${seconds(a.durationMs)} "${a.label}"`;
        case 'extend_timer':
        case 'extend_task':
          return `action:${a.type} +${seconds(a.byMs)}`;
        case 'schedule_check_in':
          return `action:schedule_check_in in ${seconds(a.inMs)}`;
        case 'add_task':
          return `action:add_task "${a.label}"`;
        default:
          return `action:${a.type}`;
      }
    }
    case 'query':
      return `query:${i.query}`;
    case 'journal':
      return `journal "${i.text.length > 40 ? `${i.text.slice(0, 40)}...` : i.text}"`;
    case 'recording':
      return `recording:${i.command}`;
    case 'navigation':
      return `navigation:${i.query}`;
    case 'plan':
      return `plan ${i.steps.length} steps`;
  }
}

export interface LabParse {
  /** Hypothesis chosen from the n-best list (equals the top one when nothing better was found). */
  chosen: string;
  /** True when the chosen hypothesis is not the recognizer's top one. */
  differs: boolean;
  /** Why it was chosen: known_label | parsed | top. */
  reason: string;
  /** One-line parser summary of the chosen hypothesis. */
  summary: string;
}

/**
 * Picks the best hypothesis of top + alternatives (no task/timer context in the lab) and runs the Tier 0 parser on it.
 * Summarizes intent kind/type plus confidence in one line.
 */
export function analyzeFinal(text: string, alternatives: string[], lang: Lang): LabParse {
  const none = { taskLabels: [], timerLabels: [] };
  try {
    const list = [text, ...alternatives.filter((a) => a !== text)];
    const pick = chooseHypothesis(list, lang, none) ?? { text, index: 0, reason: 'top' as const };
    const r = parseUtterance(pick.text, lang, none);
    const body = r.intents.length > 0 ? r.intents.map(describeIntent).join(' + ') : 'no intent (would escalate to LLM)';
    return { chosen: pick.text, differs: pick.text !== text, reason: pick.reason, summary: `${body} [${r.confidence}]` };
  } catch (e) {
    return { chosen: text, differs: false, reason: 'top', summary: `parser error: ${e}` };
  }
}
