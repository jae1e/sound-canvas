import type { Env } from "./env";

export interface RateResult {
  ok: boolean;
  retryAfterS: number;
}

// In-memory fallback (per isolate). Good enough for `wrangler dev` and tests only.
const memory = new Map<string, number>();

async function bump(env: Env, key: string, ttlS: number): Promise<number> {
  if (env.RATE_LIMIT) {
    // KV is eventually consistent and read-modify-write is not atomic, so under heavy
    // concurrency a client can exceed the limit slightly. Acceptable for abuse protection;
    // switch to a Durable Object if exact limits are needed.
    const cur = Number((await env.RATE_LIMIT.get(key)) ?? "0");
    const next = cur + 1;
    await env.RATE_LIMIT.put(key, String(next), { expirationTtl: Math.max(60, ttlS) });
    return next;
  }
  const next = (memory.get(key) ?? 0) + 1;
  memory.set(key, next);
  if (memory.size > 5000) memory.clear();
  return next;
}

/** Fixed-window limits per install id: per minute and per day. */
export async function checkRate(env: Env, installId: string, nowMs: number): Promise<RateResult> {
  const perMin = Number(env.RATE_LIMIT_PER_MIN) || 30;
  const perDay = Number(env.RATE_LIMIT_PER_DAY) || 2000;
  const minute = Math.floor(nowMs / 60000);
  const day = Math.floor(nowMs / 86400000);
  const m = await bump(env, `rl:m:${installId}:${minute}`, 120);
  if (m > perMin) return { ok: false, retryAfterS: 60 - Math.floor((nowMs % 60000) / 1000) };
  const d = await bump(env, `rl:d:${installId}:${day}`, 90000);
  if (d > perDay) return { ok: false, retryAfterS: 3600 };
  return { ok: true, retryAfterS: 0 };
}
