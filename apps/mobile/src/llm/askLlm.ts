import type { Lang, Session } from '@vlc/session-engine';

/**
 * The LLM tier (milestone M4) is not built yet. This is the stable interface the voice loop calls for questions the
 * deterministic layer cannot answer; the loop logs an `llm_needed` event and speaks a short "can't answer yet".
 */
export interface LlmRequest {
  /** The recognizer's n-best list, top hypothesis first. */
  hypotheses: string[];
  lang: Lang;
  /** Read-only session context (the model never mutates state: the engine validates every action). Absent for routine setup. */
  session?: Session;
  /**
   * What the text is for. `routine_setup`: free-form routine text the deterministic parser could not place
   * (`context` lists the unparsed parts). `routine_target`: a correction note that matches several movements.
   */
  kind?: 'routine_setup' | 'routine_target';
  context?: unknown;
  /** The last few turns, oldest first. */
  recentTurns: { heard: string; reply: string | null }[];
}

export type LlmResult =
  | { ok: true; reply: string }
  | { ok: false; reason: 'not_implemented' | 'offline' | 'error'; message?: string };

export class LlmNotImplementedError extends Error {
  constructor() {
    super('The LLM tier is not implemented yet (milestone M4).');
    this.name = 'LlmNotImplementedError';
  }
}

/** Always resolves with `not_implemented` until M4 replaces the body (provider chosen by the bake-off). */
export async function askLlm(_request: LlmRequest): Promise<LlmResult> {
  return { ok: false, reason: 'not_implemented', message: new LlmNotImplementedError().message };
}
