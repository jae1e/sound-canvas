import type { TaskName, TaskTransport } from '@vlc/llm';

/** Wraps a transport to record every LLM call (task, latency, tokens) and to let scenarios wait for in-flight calls. */
export class MeteredTransport implements TaskTransport {
  readonly calls: Array<{ task: TaskName; ms: number; promptTokens: number; completionTokens: number; ok: boolean }> = [];
  private inflight = 0;
  constructor(private readonly inner: TaskTransport) {}
  get name() {
    return this.inner.name;
  }
  async call(task: TaskName, input: unknown, signal?: AbortSignal) {
    this.inflight++;
    try {
      const r = await this.inner.call(task, input, signal);
      this.calls.push({ task, ms: r.ms, promptTokens: r.promptTokens, completionTokens: r.completionTokens, ok: true });
      return r;
    } catch (e) {
      this.calls.push({ task, ms: 0, promptTokens: 0, completionTokens: 0, ok: false });
      throw e;
    } finally {
      this.inflight--;
    }
  }
  /** Resolves once no call is in flight and the controllers had a chance to react. */
  async settle(): Promise<void> {
    await new Promise((r) => setTimeout(r, 5));
    while (this.inflight > 0) await new Promise((r) => setTimeout(r, 10));
    await new Promise((r) => setTimeout(r, 20));
  }
}

export interface Line {
  heard: string;
  alternatives?: string[];
  path: string;
  action?: string;
  state?: string;
  spoken: string[];
  llm?: { task: string; ms: number; promptTokens: number; completionTokens: number };
  note?: string;
}

/** One transcript: heard -> path -> action -> engine state -> spoken reply. */
export class Transcript {
  readonly lines: Line[] = [];
  constructor(readonly title: string, readonly intro: string) {}
  add(l: Line): void {
    this.lines.push(l);
  }
  render(): string {
    const out = [`## ${this.title}`, '', this.intro, ''];
    this.lines.forEach((l, i) => {
      out.push(`${i + 1}. heard: "${l.heard}"${l.alternatives?.length ? ` (alternatives: ${l.alternatives.map((a) => `"${a}"`).join(', ')})` : ''}`);
      out.push(`   - path: ${l.path}${l.llm ? ` [${l.llm.task} ${l.llm.ms} ms, ${l.llm.promptTokens}+${l.llm.completionTokens} tokens]` : ''}`);
      if (l.action) out.push(`   - action: ${l.action}`);
      if (l.state) out.push(`   - state: ${l.state}`);
      out.push(`   - spoken: ${l.spoken.length ? l.spoken.map((s) => `"${s}"`).join(' / ') : '(silent)'}`);
      if (l.note) out.push(`   - note: ${l.note}`);
    });
    out.push('');
    return out.join('\n');
  }
}

export function summarize(t: MeteredTransport): string {
  if (t.calls.length === 0) return 'LLM calls: 0';
  const ok = t.calls.filter((c) => c.ok);
  const ms = ok.map((c) => c.ms).sort((a, b) => a - b);
  const sum = (f: (c: (typeof ok)[number]) => number) => ok.reduce((a, c) => a + f(c), 0);
  return `LLM calls: ${t.calls.length} (${t.calls.length - ok.length} failed), latency p50 ${ms[Math.floor(ms.length / 2)] ?? 0} ms, max ${ms[ms.length - 1] ?? 0} ms, tokens in/out ${sum((c) => c.promptTokens)}/${sum((c) => c.completionTokens)}`;
}
