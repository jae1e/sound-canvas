import { type CompleteResult, type LlmBackend, LlmBackendError } from './backend';
import { alignTask } from './tasks/align';
import { commandTask } from './tasks/command';
import { correctionTask } from './tasks/correction';
import { routineSetupTask } from './tasks/routine-setup';
import { travelQaTask } from './tasks/travel-qa';
import { type Task, parseJsonObject } from './task';

export const TASKS = {
  align: alignTask,
  command: commandTask,
  routine_setup: routineSetupTask,
  correction: correctionTask,
  travel_qa: travelQaTask,
} as const;

export type TaskName = keyof typeof TASKS;
export const TASK_NAMES = Object.keys(TASKS) as TaskName[];
export type InputOf<N extends TaskName> = (typeof TASKS)[N] extends Task<infer I, unknown> ? I : never;
export type OutputOf<N extends TaskName> = (typeof TASKS)[N] extends Task<unknown, infer O> ? O : never;

export interface Usage {
  promptTokens: number;
  completionTokens: number;
  ms: number;
}

/**
 * Moves one task call to a model and returns the raw text. Two implementations: `BackendTransport` (prompt built locally,
 * used by the Worker, the eval and dev) and the app's `WorkerTransport` (posts `{task, input}`, the server builds the prompt).
 */
export interface TaskTransport {
  readonly name: string;
  call(task: TaskName, input: unknown, signal?: AbortSignal): Promise<CompleteResult>;
}

/** Builds the task prompt and calls a backend. This is the single place where prompt + schema + backend meet. */
export class BackendTransport implements TaskTransport {
  constructor(private readonly backend: LlmBackend) {}
  get name() {
    return this.backend.name;
  }
  async call(taskName: TaskName, input: unknown, signal?: AbortSignal): Promise<CompleteResult> {
    const task = TASKS[taskName] as Task<unknown, unknown>;
    const parsed = task.inputSchema.safeParse(input);
    if (!parsed.success) throw new LlmBackendError(`invalid ${taskName} input`, 'unavailable');
    const { system, user } = task.buildPrompt(parsed.data);
    return this.backend.complete({ system, messages: [{ role: 'user', content: user }], jsonSchema: task.outputSchema(parsed.data), maxTokens: task.maxTokens, temperature: 0, signal });
  }
}

export type TaskOutcome<N extends TaskName> =
  | { ok: true; value: OutputOf<N>; raw: string; usage: Usage }
  | { ok: false; reason: 'backend_error' | 'invalid_json' | 'invalid_output' | 'invalid_input'; detail: string; raw?: string; usage?: Usage; backendKind?: LlmBackendError['kind'] };

/**
 * Runs one task end to end: transport -> JSON parse -> task validator. Never throws. A failed outcome means "do not apply
 * anything": the caller falls back to the deterministic path or asks the user to repeat.
 */
export async function runTask<N extends TaskName>(transport: TaskTransport, name: N, input: InputOf<N>, signal?: AbortSignal): Promise<TaskOutcome<N>> {
  const task = TASKS[name] as unknown as Task<InputOf<N>, OutputOf<N>>;
  const parsedInput = task.inputSchema.safeParse(input);
  if (!parsedInput.success) return { ok: false, reason: 'invalid_input', detail: parsedInput.error.issues[0]?.message ?? 'invalid input' };
  let res: CompleteResult;
  try {
    res = await transport.call(name, parsedInput.data, signal);
  } catch (e) {
    const kind = e instanceof LlmBackendError ? e.kind : undefined;
    return { ok: false, reason: 'backend_error', detail: (e as Error).message, ...(kind ? { backendKind: kind } : {}) };
  }
  const usage: Usage = { promptTokens: res.promptTokens, completionTokens: res.completionTokens, ms: res.ms };
  let json: unknown;
  try {
    json = parseJsonObject(res.text);
  } catch {
    return { ok: false, reason: 'invalid_json', detail: 'output is not JSON', raw: res.text, usage };
  }
  const checked = task.validate(json, parsedInput.data);
  if (!checked.ok) return { ok: false, reason: 'invalid_output', detail: checked.reason, raw: res.text, usage };
  return { ok: true, value: checked.value, raw: res.text, usage };
}
