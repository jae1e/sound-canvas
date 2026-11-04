/**
 * Provider-neutral completion interface. Every backend (Anthropic via the Worker, llama-server on the dev PC, a future
 * on-device module, a fake for tests) implements this. Backends only move text: prompts, schemas and validation live in
 * the tasks, so switching provider never changes behaviour contracts.
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CompleteRequest {
  system: string;
  messages: ChatMessage[];
  /** JSON Schema the output must satisfy (providers that support constrained decoding enforce it). */
  jsonSchema?: Record<string, unknown>;
  /** GBNF grammar, for llama.cpp backends that prefer it over `jsonSchema`. */
  grammar?: string;
  maxTokens: number;
  /** Ignored by providers that reject sampling parameters (Claude Haiku 5.5). Local backends default to 0 (greedy). */
  temperature?: number;
  signal?: AbortSignal;
}

export interface CompleteResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  /** Wall-clock milliseconds of the backend call. */
  ms: number;
}

export interface LlmBackend {
  readonly name: string;
  complete(req: CompleteRequest): Promise<CompleteResult>;
}

export class LlmBackendError extends Error {
  constructor(
    message: string,
    readonly kind: 'timeout' | 'network' | 'http' | 'refused' | 'unavailable',
    readonly status?: number,
  ) {
    super(message);
    this.name = 'LlmBackendError';
  }
}

/** Scripted backend for unit tests: returns queued responses (strings or functions of the request) and records requests. */
export class FakeBackend implements LlmBackend {
  readonly name = 'fake';
  readonly requests: CompleteRequest[] = [];
  constructor(private readonly responses: Array<string | ((req: CompleteRequest) => string)>, private readonly fallback?: string) {}

  async complete(req: CompleteRequest): Promise<CompleteResult> {
    this.requests.push(req);
    const next = this.responses.shift();
    const text = typeof next === 'function' ? next(req) : next ?? this.fallback;
    if (text === undefined) throw new LlmBackendError('FakeBackend has no response queued', 'unavailable');
    return { text, promptTokens: Math.ceil((req.system.length + req.messages.reduce((n, m) => n + m.content.length, 0)) / 3), completionTokens: Math.ceil(text.length / 3), ms: 1 };
  }
}
