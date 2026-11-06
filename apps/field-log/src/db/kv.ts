import { getDb, writeTx, type Q } from './db';

export async function kvGet(key: string, q?: Q): Promise<string | null> {
  const row = await (q ?? (await getDb())).getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
  return row?.value ?? null;
}

export async function kvSet(key: string, value: string, q?: Q): Promise<void> {
  const sql = 'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value';
  if (q) await q.runAsync(sql, key, value);
  else await writeTx((t) => t.runAsync(sql, key, value));
}

export async function kvGetJson<T>(key: string): Promise<T | null> {
  const v = await kvGet(key);
  if (v === null) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}
