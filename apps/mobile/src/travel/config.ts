import Constants from 'expo-constants';

export type TravelConfig = {
  /** Worker base URL without a trailing slash. */
  baseUrl: string;
  /** Per-install bearer token minted with `pnpm --filter @vlc/worker mint-token`. */
  token: string;
  /** Force fixtures instead of the Worker. */
  mock: boolean;
};

export const PLACEHOLDER_BASE_URL = 'https://REPLACE_WITH_WORKER_URL.workers.dev';

/**
 * Reads `expo.extra.travel` from app.json, for example:
 *   "extra": { "travel": { "baseUrl": "https://vlc-worker.you.workers.dev", "token": "...", "mock": false } }
 * Missing or placeholder values fall back to mock mode so the UI works without keys.
 */
export function readTravelConfig(): TravelConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as { travel?: Partial<TravelConfig> };
  const t = extra.travel ?? {};
  const baseUrl = (t.baseUrl ?? PLACEHOLDER_BASE_URL).replace(/\/+$/, '');
  const token = t.token ?? '';
  const configured = !baseUrl.includes('REPLACE_WITH') && token.length > 0;
  return { baseUrl, token, mock: t.mock === true || !configured };
}
