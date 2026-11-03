import { parseUtterance, type Intent } from '@vlc/session-engine';

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
  }
}

/** Runs the Tier 0 parser (no task/timer context) and summarizes intent kind/type plus confidence in one line. */
export function summarizeParse(text: string, lang: Lang): string {
  try {
    const r = parseUtterance(text, lang, { taskLabels: [], timerLabels: [] });
    const body = r.intents.length > 0 ? r.intents.map(describeIntent).join(' + ') : 'no intent (would escalate to LLM)';
    return `${body} [${r.confidence}]`;
  } catch (e) {
    return `parser error: ${e}`;
  }
}
