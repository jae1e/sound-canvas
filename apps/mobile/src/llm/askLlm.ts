import {
  type AlignResult,
  type CommandResult,
  type CorrectionProposal,
  correctionItems,
  contextFromRun,
  contextFromSession,
  runTask,
  type RoutineSetupResult,
  type TaskTransport,
  type TravelQaResult,
} from '@vlc/llm';
import type { Lang, RoutineItem, RunState, Session } from '@vlc/session-engine';

/**
 * The app's single entry point to the LLM tier. Requests go through a `TaskTransport` (the Worker `/llm` route in production;
 * a fake in tests; later possibly an OS-provided model). Every result is validated by the `@vlc/llm` task validator, so the
 * caller only ever sees engine-ready values or a clean failure, and then falls back to the deterministic path.
 */
export type LlmKind = 'align' | 'command' | 'routine_setup' | 'routine_target' | 'routine_command' | 'travel_qa';

export interface LlmRequest {
  /** The recognizer's n-best list, top hypothesis first (or `[text]` for typed text). */
  hypotheses: string[];
  lang: Lang;
  /** Work Partner session (read-only: the model never mutates state, the engine validates every action). */
  session?: Session;
  /** Wall clock for timer remaining times in the context (defaults to Date.now()). */
  now?: number;
  /**
   * - `align` (default): n-best alignment in a work session.
   * - `command`: one clean utterance in a work session.
   * - `routine_setup`: free-form routine text the deterministic parser could not place.
   * - `routine_target`: a correction note whose target is ambiguous (`routineItems` required).
   * - `routine_command`: a live utterance during a routine run (`run` required).
   * - `travel_qa`: a question about a landmark (`travel` required).
   */
  kind?: LlmKind;
  context?: unknown;
  /** The last few turns, oldest first. */
  recentTurns: { heard: string; reply: string | null }[];
  routineItems?: readonly RoutineItem[];
  practice?: { itemId?: string; movementNo?: number };
  run?: RunState;
  currentItem?: string;
  travel?: { landmarkName: string; sourceText: string };
}

export type LlmResult =
  | { ok: true; reply: string; task: 'align'; align: AlignResult }
  | { ok: true; reply: string; task: 'command'; command: CommandResult }
  | { ok: true; reply: string; task: 'routine_setup'; setup: RoutineSetupResult }
  | { ok: true; reply: string; task: 'correction'; proposal: CorrectionProposal }
  | { ok: true; reply: string; task: 'travel_qa'; qa: TravelQaResult }
  | { ok: false; reason: LlmFailure; message?: string };

/** `not_implemented`: no transport configured. `offline`: network or HTTP failure. `timeout`: slower than the voice loop allows. `rejected`: the answer failed validation. */
export type LlmFailure = 'not_implemented' | 'offline' | 'timeout' | 'rejected' | 'error';

export class LlmNotImplementedError extends Error {
  constructor() {
    super('No LLM transport is configured (set expo.extra.travel.baseUrl/token to use the Worker).');
    this.name = 'LlmNotImplementedError';
  }
}

/** Voice-loop budget: a slow answer is worse than none. Routine setup is read on screen, so it may take longer. */
export const LLM_TIMEOUT_MS: Record<LlmKind, number> = { align: 2500, command: 2500, routine_target: 2500, routine_command: 2500, travel_qa: 4000, routine_setup: 6000 };

let transport: TaskTransport | null = null;

/** Installs (or clears) the transport. Called at app start and by tests. */
export function setLlmTransport(t: TaskTransport | null): void {
  transport = t;
}

export function getLlmTransport(): TaskTransport | null {
  return transport;
}

/** True when a transport is configured; callers skip the LLM path entirely otherwise. */
export function isLlmAvailable(): boolean {
  return transport !== null;
}

/**
 * Runs the task for `request.kind`. Never throws. Resolves with `ok: false` when there is no transport, the call times out or
 * fails, or the model output is rejected by the validator: the caller then uses the deterministic path or asks the user to repeat.
 */
export async function askLlm(request: LlmRequest): Promise<LlmResult> {
  if (!transport) return { ok: false, reason: 'not_implemented', message: new LlmNotImplementedError().message };
  const kind = request.kind ?? 'align';
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), LLM_TIMEOUT_MS[kind]);
  const recentTurns = request.recentTurns.slice(-3);
  const text = request.hypotheses[0] ?? '';
  try {
    switch (kind) {
      case 'align':
      case 'command': {
        if (!request.session) return { ok: false, reason: 'error', message: 'session required' };
        const context = contextFromSession(request.session, request.now ?? Date.now());
        if (kind === 'align') {
          const r = await runTask(transport, 'align', { hypotheses: request.hypotheses.slice(0, 4), lang: request.lang, context, recentTurns }, ctl.signal);
          return r.ok ? { ok: true, task: 'align', align: r.value, reply: r.value.needsConfirmation ? r.value.confirmQuestion : '' } : failure(r, ctl);
        }
        const r = await runTask(transport, 'command', { utterance: text, lang: request.lang, context, recentTurns }, ctl.signal);
        return r.ok ? { ok: true, task: 'command', command: r.value, reply: r.value.kind === 'clarify' ? r.value.question : r.value.kind === 'action' ? r.value.question : '' } : failure(r, ctl);
      }
      case 'routine_command': {
        if (!request.run) return { ok: false, reason: 'error', message: 'run required' };
        const context = contextFromRun(request.run, request.currentItem);
        const r = await runTask(transport, 'command', { utterance: text, lang: request.lang, context, recentTurns }, ctl.signal);
        return r.ok ? { ok: true, task: 'command', command: r.value, reply: r.value.kind === 'clarify' ? r.value.question : r.value.kind === 'action' ? r.value.question : '' } : failure(r, ctl);
      }
      case 'routine_setup': {
        const r = await runTask(transport, 'routine_setup', { text, lang: request.lang }, ctl.signal);
        return r.ok ? { ok: true, task: 'routine_setup', setup: r.value, reply: r.value.needsConfirmation ? r.value.question : '' } : failure(r, ctl);
      }
      case 'routine_target': {
        if (!request.routineItems) return { ok: false, reason: 'error', message: 'routineItems required' };
        const r = await runTask(transport, 'correction', { note: text, lang: request.lang, items: correctionItems(request.routineItems, request.lang), ...(request.practice ? { practice: request.practice } : {}) }, ctl.signal);
        return r.ok ? { ok: true, task: 'correction', proposal: r.value, reply: r.value.needsConfirmation ? r.value.question : '' } : failure(r, ctl);
      }
      case 'travel_qa': {
        if (!request.travel) return { ok: false, reason: 'error', message: 'travel required' };
        const r = await runTask(transport, 'travel_qa', { question: text, lang: request.lang, landmarkName: request.travel.landmarkName, sourceText: request.travel.sourceText }, ctl.signal);
        return r.ok ? { ok: true, task: 'travel_qa', qa: r.value, reply: r.value.text } : failure(r, ctl);
      }
    }
  } finally {
    clearTimeout(timer);
  }
}

function failure(r: { ok: false; reason: string; detail: string; backendKind?: string }, ctl: AbortController): LlmResult {
  if (r.reason === 'backend_error') {
    if (r.backendKind === 'timeout' || ctl.signal.aborted) return { ok: false, reason: 'timeout', message: r.detail };
    return { ok: false, reason: r.backendKind === 'network' || r.backendKind === 'http' ? 'offline' : 'error', message: r.detail };
  }
  return { ok: false, reason: 'rejected', message: `${r.reason}: ${r.detail}` };
}
