import { type CompleteResult, LlmBackendError } from './backend';
import type { TaskName, TaskTransport } from './run';

export interface WorkerTransportOptions {
  /** Base URL of the Worker, for example `https://vlc-worker.example.workers.dev`. The route is `/llm`. */
  baseUrl: string;
  /** Bearer token provider (the per-install HMAC token). */
  token: () => Promise<string> | string;
  /** Hard client-side timeout, milliseconds. The app uses about 2500: a slow answer is worse than no answer in a voice loop. */
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * App-side transport: posts `{task, input}` to the Worker `/llm` route. The prompt and schema are built on the server from
 * the same `@vlc/llm` task definitions, so the client cannot inject arbitrary prompts through our key.
 */
export class WorkerTransport implements TaskTransport {
  readonly name = 'worker';
  constructor(private readonly opts: WorkerTransportOptions) {}

  async call(task: TaskName, input: unknown, signal?: AbortSignal): Promise<CompleteResult> {
    const f = this.opts.fetchImpl ?? fetch;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), this.opts.timeoutMs ?? 2500);
    signal?.addEventListener('abort', () => ctl.abort());
    const t0 = Date.now();
    try {
      const res = await f(`${this.opts.baseUrl.replace(/\/$/, '')}/llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await this.opts.token()}` },
        body: JSON.stringify({ task, input }),
        signal: ctl.signal,
      });
      if (!res.ok) throw new LlmBackendError(`worker HTTP ${res.status}`, 'http', res.status);
      const data = (await res.json()) as Partial<CompleteResult>;
      if (typeof data.text !== 'string') throw new LlmBackendError('worker returned no text', 'http', res.status);
      return { text: data.text, promptTokens: data.promptTokens ?? 0, completionTokens: data.completionTokens ?? 0, ms: Date.now() - t0 };
    } catch (e) {
      if (e instanceof LlmBackendError) throw e;
      if (ctl.signal.aborted) throw new LlmBackendError('worker timed out', 'timeout');
      throw new LlmBackendError('worker unreachable', 'network');
    } finally {
      clearTimeout(timer);
    }
  }
}
