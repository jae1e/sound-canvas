import Anthropic from '@anthropic-ai/sdk';

import { type CompleteRequest, type CompleteResult, LlmBackendError, type LlmBackend } from './backend';

export interface AnthropicBackendOptions {
  apiKey: string;
  /** Default `claude-haiku-5-5`. */
  model?: string;
  /** Per-request timeout, milliseconds (default 8 s; the app gives up earlier on its own). */
  timeoutMs?: number;
  /** Test hook: a fetch implementation for the SDK. */
  fetch?: typeof fetch;
  /** `output_config.effort` for the model (default `low`: these are short extraction tasks). */
  effort?: 'low' | 'medium' | 'high';
}

/**
 * Anthropic Messages backend (structured JSON output). Used by the Worker `/llm` route and the eval runner; it is a
 * separate entry point (`@vlc/llm/anthropic`) so the mobile bundle never imports the SDK.
 *
 * Claude Haiku 5.5 notes (from the SDK reference): thinking is adaptive and on by default, `{type: 'disabled'}` is accepted
 * at effort `high` or below, and non-default sampling parameters are rejected, so `temperature` is never sent.
 */
export class AnthropicBackend implements LlmBackend {
  readonly name: string;
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly effort: 'low' | 'medium' | 'high';

  constructor(opts: AnthropicBackendOptions) {
    this.model = opts.model ?? 'claude-haiku-5-5';
    this.name = `anthropic:${this.model}`;
    this.effort = opts.effort ?? 'low';
    this.client = new Anthropic({ apiKey: opts.apiKey, timeout: opts.timeoutMs ?? 8000, maxRetries: 0, ...(opts.fetch ? { fetch: opts.fetch } : {}) });
  }

  async complete(req: CompleteRequest): Promise<CompleteResult> {
    const t0 = Date.now();
    try {
      const res = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: req.maxTokens,
          system: req.system,
          messages: req.messages,
          thinking: { type: 'disabled' },
          output_config: { effort: this.effort, ...(req.jsonSchema ? { format: { type: 'json_schema', schema: req.jsonSchema } } : {}) },
        },
        req.signal ? { signal: req.signal } : undefined,
      );
      if (res.stop_reason === 'refusal') throw new LlmBackendError('model refused', 'refused');
      const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
      return { text, promptTokens: res.usage.input_tokens + (res.usage.cache_read_input_tokens ?? 0) + (res.usage.cache_creation_input_tokens ?? 0), completionTokens: res.usage.output_tokens, ms: Date.now() - t0 };
    } catch (e) {
      if (e instanceof LlmBackendError) throw e;
      if (e instanceof Anthropic.APIConnectionTimeoutError) throw new LlmBackendError('anthropic timed out', 'timeout');
      if (e instanceof Anthropic.APIConnectionError) throw new LlmBackendError('anthropic unreachable', 'network');
      if (e instanceof Anthropic.APIError) throw new LlmBackendError(`anthropic HTTP ${e.status}`, 'http', e.status);
      throw new LlmBackendError(`anthropic error: ${(e as Error).message}`, 'network');
    }
  }
}
