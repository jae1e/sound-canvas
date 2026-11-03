import type { Place, WalkRoute, WhereAmI } from "@vlc/travel";
import type { SearchRequest, WalkRequest, WhereRequest } from "../schemas";

export interface PlacesProvider {
  search(req: SearchRequest): Promise<Place[]>;
  where(req: WhereRequest): Promise<WhereAmI>;
}

export interface WalkProvider {
  route(req: WalkRequest): Promise<WalkRoute>;
}

/** Upstream failure. The message never contains request coordinates or keys. */
export class ProviderError extends Error {
  constructor(
    readonly provider: string,
    readonly upstreamStatus: number,
    message = "upstream error",
  ) {
    super(message);
  }
}

/** fetch with a timeout. Network failures and timeouts become ProviderError(status 0). */
export async function fetchJson(
  provider: string,
  doFetch: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs = 8000,
): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await doFetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new ProviderError(provider, res.status);
    return await res.json();
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    throw new ProviderError(provider, 0, "network error");
  } finally {
    clearTimeout(timer);
  }
}
