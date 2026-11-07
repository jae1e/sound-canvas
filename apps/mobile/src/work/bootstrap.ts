import { wireModeSessions } from '../session/wire';
import { wireRoutineController } from '../routine/instance';
import { restoreWork } from './instance';

/**
 * Called once after the database is migrated and settings are loaded. Restores an unfinished Work Partner session and
 * connects Travel Guide and Voice Coach to the native session.
 */
export function restoreWorkSession(showHiddenModes = false): void {
  if (!showHiddenModes) return;
  restoreWork();
  wireRoutineController();
  wireModeSessions();
}
