import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { evalCase, type EvalCase } from './schema';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'cases');

export function loadCases(): EvalCase[] {
  const out: EvalCase[] = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    const raw = JSON.parse(readFileSync(join(dir, f), 'utf8')) as unknown[];
    raw.forEach((c, i) => {
      const r = evalCase.safeParse(c);
      if (!r.success) throw new Error(`${f}[${i}] (${(c as { id?: string }).id}): ${r.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; ')}`);
      out.push(r.data);
    });
  }
  const ids = new Set<string>();
  for (const c of out) {
    if (ids.has(c.id)) throw new Error(`duplicate id ${c.id}`);
    ids.add(c.id);
    if (!c.id.startsWith(`${c.task}-${c.lang}-`)) throw new Error(`id ${c.id} does not match task/lang`);
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const cases = loadCases();
  const by: Record<string, number> = {};
  for (const c of cases) by[`${c.task}/${c.lang}`] = (by[`${c.task}/${c.lang}`] ?? 0) + 1;
  console.log(`${cases.length} cases OK`, by);
}
