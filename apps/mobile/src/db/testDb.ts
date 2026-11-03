import path from 'node:path';

import { drizzle } from 'drizzle-orm/sql-js';
import { migrate } from 'drizzle-orm/sql-js/migrator';
import initSqlJs from 'sql.js';

import * as schema from './schema';
import type { AppDb } from './types';

/** An in-memory database with the real migrations applied. For Vitest only: never import it from app code. */
export async function createTestDb(): Promise<AppDb> {
  const SQL = await initSqlJs();
  const db = drizzle(new SQL.Database(), { schema });
  migrate(db, { migrationsFolder: path.join(__dirname, 'migrations') });
  return db as unknown as AppDb;
}
