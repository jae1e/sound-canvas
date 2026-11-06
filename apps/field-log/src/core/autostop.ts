export interface AutoStopSettings {
  onLeaveApp: boolean;
  keepWhenScreenOff: boolean;
}

export const DEFAULT_AUTO_STOP: AutoStopSettings = { onLeaveApp: true, keepWhenScreenOff: true };

/** Parses a stored "1"/"0" switch; a missing value gives the default. */
export function parseSwitch(stored: string | null, fallback: boolean): boolean {
  return stored === null ? fallback : stored === '1';
}

/** The exact object passed to FlNative.setAutoStop. */
export function autoStopPayload(s: { stopOnLeaveApp: boolean; keepWhenScreenOff: boolean }): AutoStopSettings {
  return { onLeaveApp: s.stopOnLeaveApp, keepWhenScreenOff: s.keepWhenScreenOff };
}

/** Recording ids that Android stopped because the user left the app (journal reason left_app). */
export function leftAppRecordings(records: { kind: string; recordingId: string; reason?: string }[]): string[] {
  return records.filter((r) => r.kind === 'recording_stopped' && r.reason === 'left_app').map((r) => r.recordingId);
}

/** i18n key for a stop reason shown on a recording, or null when nothing special should be shown. */
export function stopReasonKey(reason: string | null): 'stoppedLeftApp' | null {
  return reason === 'left_app' ? 'stoppedLeftApp' : null;
}
