import { type CompleteRequest, type CompleteResult, LlmBackendError, type LlmBackend } from '@vlc/llm';

/**
 * Slot for an on-device model (a future Expo native module wrapping an OS-provided or bundled runtime). Product direction
 * (2026-11-04) is the cloud Worker route; this stays a stub so the seam exists if an OS model such as Gemini Nano proves usable.
 * Register an implementation with `registerNativeLlm`; wrap it in `BackendTransport` and pass it to `setLlmTransport`.
 */
let native: LlmBackend | null = null;

export function registerNativeLlm(backend: LlmBackend | null): void {
  native = backend;
}

export const nativeLlmBackend: LlmBackend = {
  name: 'native',
  async complete(req: CompleteRequest): Promise<CompleteResult> {
    if (!native) throw new LlmBackendError('No native LLM module registered', 'unavailable');
    return native.complete(req);
  },
};
