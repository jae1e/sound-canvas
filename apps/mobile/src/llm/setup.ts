import { WorkerTransport } from '@vlc/llm';

import { readTravelConfig } from '../travel/config';
import { setLlmTransport } from './askLlm';

/** Points the LLM tier at the Worker `/llm` route when the app has Worker credentials (same config as the travel client). */
export function configureLlm(): boolean {
  const cfg = readTravelConfig();
  if (cfg.mock) {
    setLlmTransport(null);
    return false;
  }
  setLlmTransport(new WorkerTransport({ baseUrl: cfg.baseUrl, token: () => cfg.token, timeoutMs: 10_000 }));
  return true;
}
