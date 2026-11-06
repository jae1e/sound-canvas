import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from './schema';
import { bump } from '../state/dataVersion';

export type Db = SQLite.SQLiteDatabase;
/** Either the database or the object handed to a transaction callback; both run queries. */
export type Q = Pick<SQLite.SQLiteDatabase, 'runAsync' | 'getFirstAsync' | 'getAllAsync'>;

let dbPromise: Promise<Db> | null = null;

export function getDb(): Promise<Db> {
  dbPromise ??= (async () => {
    const db = await SQLite.openDatabaseAsync('field-log.db');
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    let version = row?.user_version ?? 0;
    for (; version < MIGRATIONS.length; version++) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(MIGRATIONS[version]);
        await db.execAsync(`PRAGMA user_version = ${version + 1}`);
      });
    }
    return db;
  })();
  return dbPromise;
}

// All writes run one at a time on the single connection, so interleaved async work can never
// land inside another task's transaction.
let writeChain: Promise<unknown> = Promise.resolve();

export function writeTx<T>(fn: (q: Q) => Promise<T>): Promise<T> {
  const run = async () => {
    const db = await getDb();
    let result!: T;
    await db.withTransactionAsync(async () => {
      result = await fn(db);
    });
    bump();
    return result;
  };
  const p = writeChain.then(run, run);
  writeChain = p.catch(() => undefined);
  return p;
}
