import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from './schema';

/**
 * The synchronous Drizzle database used by the app (expo-sqlite) and by the Vitest suite (sql.js). Repositories
 * depend only on this type, so they run unchanged in both.
 */
export type AppDb = BaseSQLiteDatabase<'sync', any, typeof schema>;
