import { type CompleteRequest, type CompleteResult, LlmBackendError, type LlmBackend } from './backend';

export interface LlamaServerOptions {
  /** For example `http://127.0.0.1:8080`. */
  baseUrl: string;
  /** Request timeout in milliseconds (default 120 s: CPU runs are slow). */
  timeoutMs?: number;
  /** Disable reasoning on thinking-capable models (Qwen3.5 and similar). Default true. */
  disableThinking?: boolean;
  fetchImpl?: typeof fetch;
}

/**
 * Backend for llama.cpp's `llama-server` (OpenAI-compatible `/v1/chat/completions`). Development stand-in only: it lets the
 * tasks and eval run offline and free on the dev PC. Constrained decoding uses `response_format.json_schema` or `grammar`.
 */
export class LlamaServerBackend implements LlmBackend {
  readonly name: string;
  constructor(private readonly opts: LlamaServerOptions, label = 'llama-server') {
    this.name = label;
  }

  async complete(req: CompleteRequest): Promise<CompleteResult> {
    const f = this.opts.fetchImpl ?? fetch;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), this.opts.timeoutMs ?? 120_000);
    req.signal?.addEventListener('abort', () => ctl.abort());
    const body: Record<string, unknown> = {
      messages: [{ role: 'system', content: req.system }, ...req.messages],
      max_tokens: req.maxTokens,
      temperature: req.temperature ?? 0,
      stream: false,
      cache_prompt: true,
    };
    if (req.grammar) body.grammar = req.grammar;
    else if (req.jsonSchema) body.response_format = { type: 'json_schema', json_schema: { name: 'out', strict: true, schema: req.jsonSchema } };
    if (this.opts.disableThinking !== false) body.chat_template_kwargs = { enable_thinking: false };
    const t0 = Date.now();
    try {
      const res = await f(`${this.opts.baseUrl}/v1/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
      if (!res.ok) throw new LlmBackendError(`llama-server HTTP ${res.status}`, 'http', res.status);
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };
      return {
        text: data.choices?.[0]?.message?.content ?? '',
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        ms: Date.now() - t0,
      };
    } catch (e) {
      if (e instanceof LlmBackendError) throw e;
      if (ctl.signal.aborted) throw new LlmBackendError('llama-server timed out', 'timeout');
      throw new LlmBackendError(`llama-server unreachable: ${(e as Error).message}`, 'network');
    } finally {
      clearTimeout(timer);
    }
  }
}
