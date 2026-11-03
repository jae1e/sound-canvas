import { eq } from 'drizzle-orm';

import { DEFAULT_SETTINGS, parseSettings, type AppSettings } from '../../settings/schema';
import { settings } from '../schema';
import type { AppDb } from '../types';

const KEY = 'app';

export function loadSettings(db: AppDb): AppSettings {
  const row = db.select().from(settings).where(eq(settings.key, KEY)).get();
  if (!row) return DEFAULT_SETTINGS;
  try {
    return parseSettings(JSON.parse(row.valueJson));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Merges a patch into the stored settings and returns the validated result. */
export function saveSettings(db: AppDb, patch: Partial<AppSettings>, now: number): AppSettings {
  const next = parseSettings({ ...loadSettings(db), ...patch });
  const valueJson = JSON.stringify(next);
  db.insert(settings)
    .values({ key: KEY, valueJson, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { valueJson, updatedAt: now } })
    .run();
  return next;
}
