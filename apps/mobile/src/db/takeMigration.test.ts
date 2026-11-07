import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import initSqlJs from 'sql.js';
import { describe, expect, it } from 'vitest';

describe('take migration', () => {
  it('retains legacy rows and assigns them the song kind', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    const migration = (name: string) =>
      readFileSync(join(__dirname, 'migrations', name), 'utf8').replaceAll('--> statement-breakpoint', '');
    for (const name of ['0000_init.sql', '0001_aspiring_hedge_knight.sql', '0002_dear_lucky_pierre.sql'])
      db.run(migration(name));
    db.run("INSERT INTO takes (id, file_uri, created_at) VALUES ('old', '/old.wav', 1)");
    db.run(migration('0003_breezy_garia.sql'));
    expect(db.exec('SELECT id, file_uri, kind, recovered FROM takes')[0].values).toEqual([
      ['old', '/old.wav', 'song', 0],
    ]);
    db.run(migration('0004_fat_silver_samurai.sql'));
    expect(db.exec('SELECT id, file_uri, kind, plan_id, transcript_state FROM takes')[0].values).toEqual([
      ['old', '/old.wav', 'song', null, null],
    ]);
    db.close();
  });
});
