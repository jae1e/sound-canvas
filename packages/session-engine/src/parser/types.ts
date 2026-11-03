import type { Action, Ref } from '../actions';

/** Labels of things the user may refer to by name (current open tasks and live timers). */
export interface ParseContext {
  taskLabels: string[];
  timerLabels: string[];
}

export type Intent =
  | { kind: 'action'; action: Action }
  | { kind: 'query'; query: 'remaining' | 'status' | 'steps_left' | 'where' | 'next_step'; target?: Ref }
  /** "steps: unpack, frame, shelves": a spoken plan. */
  | { kind: 'plan'; steps: string[] }
  | { kind: 'journal'; text: string }
  | { kind: 'recording'; command: 'start' | 'stop' | 'play' }
  | { kind: 'navigation'; query: 'distance_remaining' | 'next_instruction' };

export interface ParseResult {
  intents: Intent[];
  /** `low` (with no intents) means: escalate to an LLM. The parser never guesses. */
  confidence: 'high' | 'low';
}
