/**
 * Microphone gate. The Voice Coach recorder opens its own AudioRecord, and the app's session STT also uses the mic, so the
 * app installs a gate that pauses session STT before a recorder starts and resumes it afterwards. The default gate does
 * nothing, so the module works on its own (and in tests).
 */
export type CaptureKind = 'take' | 'monitor' | 'playback';

export interface CaptureGate {
  /** Resolves once the other microphone user has been paused and had time to let go of the mic. */
  acquire(kind: CaptureKind): Promise<void>;
  /** Idempotent. */
  release(kind: CaptureKind): void;
}

const NOOP: CaptureGate = { acquire: async () => undefined, release: () => undefined };

export const captureGate: CaptureGate = {
  acquire: (k) => current.acquire(k),
  release: (k) => current.release(k),
};

let current: CaptureGate = NOOP;

export function setCaptureGate(gate: CaptureGate | null): void {
  current = gate ?? NOOP;
}
