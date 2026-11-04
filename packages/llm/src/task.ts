import { z } from 'zod';

/** What a task validator returns. `reason` is a short machine-readable code for logs and the eval report. */
export type Checked<T> = { ok: true; value: T } | { ok: false; reason: string };

export const ok = <T>(value: T): Checked<T> => ({ ok: true, value });
export const bad = (reason: string): Checked<never> => ({ ok: false, reason });

/**
 * One LLM feature. The prompt, the output JSON schema and the validator live together and are shared by the app, the Worker
 * and the eval runner, so a prompt change is evaluated exactly as it ships.
 *
 * Contract: the model only proposes. `validate` maps the parsed JSON to engine types, and rejects anything the engine
 * schemas would not accept; callers apply the result through the engine, which stays authoritative.
 */
export interface Task<I, O> {
  readonly name: string;
  /** Validates untrusted input (the Worker receives it from the network). */
  readonly inputSchema: z.ZodType<I>;
  /** System prompt (static per task and language, so it is cacheable) and the per-call user message. */
  buildPrompt(input: I): { system: string; user: string };
  /** JSON Schema for constrained decoding. May depend on the input (allowed action types). */
  outputSchema(input: I): Record<string, unknown>;
  maxTokens: number;
  /** Maps parsed model JSON to a value, or rejects it. */
  validate(raw: unknown, input: I): Checked<O>;
}

/** zod -> plain JSON Schema (draft-07 subset, no `$schema` key) that both Anthropic and llama.cpp accept. */
export function jsonSchemaOf(schema: z.ZodType): Record<string, unknown> {
  const out = z.toJSONSchema(schema, { target: 'draft-7', io: 'output' }) as Record<string, unknown>;
  delete out.$schema;
  return out;
}

/** Extracts the first JSON object from model text (tolerates code fences and leading chatter from non-constrained backends). */
export function parseJsonObject(text: string): unknown {
  const t = text.trim();
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1));
    throw new Error('no JSON object in output');
  }
}
