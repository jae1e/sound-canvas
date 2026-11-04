export interface Env {
  /** Kakao Developers REST API key (secret). */
  KAKAO_REST_KEY: string;
  /** SK Open API / TMAP app key (secret). */
  TMAP_APP_KEY: string;
  /** data.go.kr service key for Korea Tourism Organization TourAPI (secret, optional: landmarks fall back to Kakao only). */
  TOUR_API_KEY?: string;
  /** HMAC secret used to validate per-install bearer tokens (secret). */
  TOKEN_SIGNING_SECRET: string;
  /** Anthropic API key for `/llm` (secret: `wrangler secret put ANTHROPIC_API_KEY`). Without it `/llm` answers 503. */
  ANTHROPIC_API_KEY?: string;
  /** Model for `/llm` (default `claude-haiku-5-5`). */
  LLM_MODEL?: string;
  /** Upstream timeout for `/llm` in milliseconds (default 5000). */
  LLM_TIMEOUT_MS?: string;
  /** Optional KV namespace for rate-limit counters. Falls back to in-memory counters when absent. */
  RATE_LIMIT?: KVNamespace;
  /** Requests per token per minute (default 30). */
  RATE_LIMIT_PER_MIN?: string;
  /** Requests per token per day (default 2000). */
  RATE_LIMIT_PER_DAY?: string;
}

/** Injectable dependencies so tests can mock network and time. */
export interface Deps {
  fetch: typeof fetch;
  now: () => number;
}

export const defaultDeps = (): Deps => ({
  fetch: (...args) => globalThis.fetch(...args),
  now: () => Date.now(),
});
