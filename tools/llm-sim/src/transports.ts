import { BackendTransport, LlamaServerBackend, WorkerTransport, TASKS, type TaskName, type TaskTransport } from '@vlc/llm';

export type BackendKind = 'anthropic' | 'worker' | 'llama-server' | 'fake';

export interface TransportOptions {
  kind: BackendKind;
  /** llama-server base URL, or Worker base URL. */
  url?: string;
  /** Model name for anthropic (default claude-haiku-5-5). */
  model?: string;
  label?: string;
}

/** Fake backend: returns a valid but trivial answer per task (not a command / not answerable / empty routine). Verifies the harness without any model. */
export function fakeTransport(): TaskTransport {
  const none = { type: 'none', target: '', label: '', from: '', seconds: 0, count: 0, flag: false };
  const answers: Record<TaskName, unknown> = {
    align: { text: '', ...none, confidence: 'low', needsConfirmation: false, confirmQuestion: '' },
    command: { kind: 'not_command', ...none, question: '' },
    routine_setup: { name: 'Routine', targetMinutes: 0, items: [], assumptions: [], needsConfirmation: false, question: '' },
    correction: { scope: 'routine', itemId: '', movementNo: 0, side: 'none', part: '', cueKo: '자세!', cueEn: 'posture!', needsConfirmation: false, question: '' },
    travel_qa: { answerable: false, answer: '', quote: '' },
  };
  return {
    name: 'fake',
    async call(task: TaskName, input: unknown) {
      const parsed = (TASKS[task].inputSchema as { parse(x: unknown): unknown }).parse(input);
      const { system, user } = (TASKS[task] as { buildPrompt(i: unknown): { system: string; user: string } }).buildPrompt(parsed);
      const text = JSON.stringify(answers[task]);
      return { text, promptTokens: Math.ceil((system.length + user.length) / 3), completionTokens: Math.ceil(text.length / 3), ms: 1 };
    },
  };
}

export async function makeTransport(o: TransportOptions): Promise<TaskTransport> {
  switch (o.kind) {
    case 'fake':
      return fakeTransport();
    case 'llama-server':
      return new BackendTransport(new LlamaServerBackend({ baseUrl: o.url ?? 'http://127.0.0.1:8080' }, o.label ?? 'llama-server'));
    case 'worker': {
      const url = o.url ?? process.env.VLC_WORKER_URL;
      const token = process.env.VLC_WORKER_TOKEN;
      if (!url || !token) throw new Error('worker backend needs --url (or VLC_WORKER_URL) and the VLC_WORKER_TOKEN env var (see `pnpm --filter @vlc/worker mint-token`)');
      return new WorkerTransport({ baseUrl: url, token: () => token, timeoutMs: 15_000 });
    }
    case 'anthropic': {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error('anthropic backend needs the ANTHROPIC_API_KEY environment variable (never stored in the repo)');
      const { AnthropicBackend } = await import('@vlc/llm/anthropic');
      return new BackendTransport(new AnthropicBackend({ apiKey: key, model: o.model ?? process.env.LLM_MODEL ?? 'claude-haiku-5-5', timeoutMs: 20_000 }));
    }
  }
}
