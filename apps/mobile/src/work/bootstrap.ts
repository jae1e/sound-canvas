import { restoreWork } from './instance';

/** Called once after the database is migrated and settings are loaded. Restores an unfinished Work Partner session. */
export function restoreWorkSession(): void {
  restoreWork();
}
