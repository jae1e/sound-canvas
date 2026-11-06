export type LevelAlert = 'ok' | 'silent' | 'quiet';

export const SILENT_DB_X100 = -9000;
export const QUIET_DB_X100 = -7000;
export const SILENT_AFTER_MS = 1500;
export const QUIET_AFTER_MS = 3000;

export interface LevelMonitorState {
  /** Start of the current run of levels <= SILENT_DB_X100, or null. */
  silentSince: number | null;
  /** Start of the current run of levels < QUIET_DB_X100, or null. */
  quietSince: number | null;
  alert: LevelAlert;
}

export const initialLevelMonitor = (): LevelMonitorState => ({ silentSince: null, quietSince: null, alert: 'ok' });

/** Feeds one level reading (rmsDbfsX100 at time tMs). Silent wins over quiet; any louder reading clears. */
export function stepLevelMonitor(s: LevelMonitorState, tMs: number, dbX100: number): LevelMonitorState {
  const silentSince = dbX100 <= SILENT_DB_X100 ? (s.silentSince ?? tMs) : null;
  const quietSince = dbX100 < QUIET_DB_X100 ? (s.quietSince ?? tMs) : null;
  const alert: LevelAlert =
    silentSince !== null && tMs - silentSince >= SILENT_AFTER_MS
      ? 'silent'
      : quietSince !== null && tMs - quietSince >= QUIET_AFTER_MS
        ? 'quiet'
        : 'ok';
  return { silentSince, quietSince, alert };
}
