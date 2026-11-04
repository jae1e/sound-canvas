import { BackendTransport, type LlmBackend, type TaskTransport } from "@vlc/llm";
import { AnthropicBackend } from "@vlc/llm/anthropic";
import type { Deps, Env } from "../env";

/**
 * Provider-neutral LLM adapter. Every provider is an `LlmBackend` from `@vlc/llm`; `llmTransport` picks one from the
 * environment. Adding another provider means adding a backend class and a branch here; routes and tasks do not change.
 */
export function llmBackend(env: Env, deps: Deps): LlmBackend | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  return new AnthropicBackend({
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.LLM_MODEL || "claude-haiku-5-5",
    timeoutMs: Number(env.LLM_TIMEOUT_MS) || 5000,
    fetch: deps.fetch,
  });
}

export function llmTransport(env: Env, deps: Deps): TaskTransport | null {
  const b = llmBackend(env, deps);
  return b ? new BackendTransport(b) : null;
}
