import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';

import migrations from './migrations/migrations';
import * as schema from './schema';
import type { AppDb } from './types';

const DB_NAME = 'vlc.db';

let instance: ReturnType<typeof create> | null = null;

function create() {
  const sqlite = openDatabaseSync(DB_NAME);
  sqlite.execSync('PRAGMA journal_mode = WAL;');
  return drizzle(sqlite, { schema });
}

/** The app database (opened lazily, one connection). Run `useDatabaseMigrations` once at startup before using it. */
export function getDb(): AppDb {
  instance ??= create();
  return instance;
}

export function useDatabaseMigrations(): { success: boolean; error?: Error } {
  return useMigrations((instance ??= create()), migrations);
}
