import { verifyBearer } from "./auth";
import { defaultDeps, type Deps, type Env } from "./env";
import { KakaoPlaces } from "./providers/kakao";
import { TmapWalk } from "./providers/tmap";
import { ProviderError, type PlacesProvider, type WalkProvider } from "./providers/types";
import { checkRate } from "./ratelimit";
import { llmRequest, searchRequest, walkRequest, whereRequest } from "./schemas";
import type { ZodType } from "zod";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    readonly headers: Record<string, string> = {},
  ) {
    super("http error");
  }
}

async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, { error: "invalid_json" });
  }
  const r = schema.safeParse(raw);
  if (!r.success) {
    // Only paths and messages; never echo input values (they may be coordinates).
    throw new HttpError(400, {
      error: "invalid_request",
      issues: r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  return r.data;
}

export interface Providers {
  places: PlacesProvider;
  walk: WalkProvider;
}

function providersFor(env: Env, deps: Deps): Providers {
  return {
    places: {
      search: (r) => requireKey(env.KAKAO_REST_KEY, () => new KakaoPlaces(env.KAKAO_REST_KEY, deps).search(r)),
      where: (r) => requireKey(env.KAKAO_REST_KEY, () => new KakaoPlaces(env.KAKAO_REST_KEY, deps).where(r)),
    },
    walk: {
      route: (r) => requireKey(env.TMAP_APP_KEY, () => new TmapWalk(env.TMAP_APP_KEY, deps).route(r)),
    },
  };
}

async function requireKey<T>(key: string | undefined, run: () => Promise<T>): Promise<T> {
  if (!key) throw new HttpError(503, { error: "not_configured" });
  return run();
}

/** Request handler with injectable dependencies (tests mock fetch and time). */
export async function handle(request: Request, env: Env, deps: Deps = defaultDeps(), providers?: Providers): Promise<Response> {
  const started = deps.now();
  const path = new URL(request.url).pathname;
  let status = 500;
  try {
    const res = await route(request, path, env, deps, providers ?? providersFor(env, deps));
    status = res.status;
    return res;
  } catch (e) {
    if (e instanceof HttpError) {
      status = e.status;
      return json(e.body, e.status, e.headers);
    }
    if (e instanceof ProviderError) {
      status = 502;
      return json({ error: "upstream_error", provider: e.provider, status: e.upstreamStatus }, 502);
    }
    status = 500;
    return json({ error: "internal_error" }, 500);
  } finally {
    // Metadata only: never coordinates, queries, tokens or keys.
    console.log(JSON.stringify({ path, status, ms: deps.now() - started }));
  }
}

async function route(request: Request, path: string, env: Env, deps: Deps, p: Providers): Promise<Response> {
  if (path === "/health" && request.method === "GET") return json({ ok: true });
  if (!["/places/search", "/places/where", "/route/walk", "/llm"].includes(path)) throw new HttpError(404, { error: "not_found" });
  if (request.method !== "POST") throw new HttpError(405, { error: "method_not_allowed" }, { Allow: "POST" });

  const installId = await verifyBearer(request.headers.get("Authorization"), env.TOKEN_SIGNING_SECRET);
  if (!installId) throw new HttpError(401, { error: "unauthorized" }, { "WWW-Authenticate": "Bearer" });
  const rate = await checkRate(env, installId, deps.now());
  if (!rate.ok) throw new HttpError(429, { error: "rate_limited" }, { "Retry-After": String(rate.retryAfterS) });

  switch (path) {
    case "/places/search":
      return json({ places: await p.places.search(await parseBody(request, searchRequest)) });
    case "/places/where":
      return json({ where: await p.places.where(await parseBody(request, whereRequest)) });
    case "/route/walk":
      return json({ route: await p.walk.route(await parseBody(request, walkRequest)) });
    default: {
      await parseBody(request, llmRequest);
      return json({ error: "not_implemented", message: "LLM proxy arrives in milestone M4" }, 501);
    }
  }
}

export default {
  fetch: (request: Request, env: Env) => handle(request, env),
};
