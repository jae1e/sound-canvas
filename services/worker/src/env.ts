export interface Env {
  /** Kakao Developers REST API key (secret). */
  KAKAO_REST_KEY: string;
  /** SK Open API / TMAP app key (secret). */
  TMAP_APP_KEY: string;
  /** HMAC secret used to validate per-install bearer tokens (secret). */
  TOKEN_SIGNING_SECRET: string;
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
