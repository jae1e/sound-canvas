export type ControlPhase = 'idle' | 'recording' | 'paused' | 'stopped';
export type ControlAction = 'record' | 'pause' | 'resume' | 'stop' | 'recordMore' | 'play';

export interface ControlInput {
  /** This memo is being recorded now (paused included). */
  active: boolean;
  paused: boolean;
  /** The memo already has at least one recording. */
  hasRecordings: boolean;
}

export function controlPhase(i: ControlInput): ControlPhase {
  if (i.active) return i.paused ? 'paused' : 'recording';
  return i.hasRecordings ? 'stopped' : 'idle';
}

/** The primary buttons, in order, for each phase. */
export function controlActions(phase: ControlPhase): ControlAction[] {
  switch (phase) {
    case 'idle':
      return ['record'];
    case 'recording':
      return ['pause', 'stop'];
    case 'paused':
      return ['resume', 'stop'];
    case 'stopped':
      return ['recordMore', 'play'];
  }
}

/** Which state line to show: the key plus the time to print next to it (null for none). */
export function statusLine(phase: ControlPhase, recordedMs: number, savedMs: number): { key: 'recording' | 'paused' | 'saved' | 'none'; ms: number | null } {
  switch (phase) {
    case 'recording':
      return { key: 'recording', ms: recordedMs };
    case 'paused':
      return { key: 'paused', ms: recordedMs };
    case 'stopped':
      return { key: 'saved', ms: savedMs };
    case 'idle':
      return { key: 'none', ms: null };
  }
}
