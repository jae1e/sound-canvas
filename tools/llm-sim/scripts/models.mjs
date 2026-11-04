#!/usr/bin/env node
// Model config helper (no dependencies). Usage:
//   node scripts/models.mjs list
//   node scripts/models.mjs path <id>        prints the local GGUF path
//   node scripts/models.mjs download <id>    downloads from Hugging Face into .cache/models and verifies sha256
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, '.cache', 'models');
const { models } = JSON.parse(readFileSync(join(root, 'models.json'), 'utf8'));
const [cmd, id] = process.argv.slice(2);
const find = (i) => models.find((m) => m.id === i) ?? (console.error(`unknown model id: ${i}`), process.exit(2));
const sha = (f) => new Promise((res, rej) => { const h = createHash('sha256'); createReadStream(f).on('data', (d) => h.update(d)).on('end', () => res(h.digest('hex'))).on('error', rej); });

if (cmd === 'list') {
  for (const m of models) console.log(`${m.id}\t${existsSync(join(dir, m.file)) ? 'present' : 'missing'}\t${m.repo}/${m.file}\t${m.license}`);
} else if (cmd === 'path') {
  console.log(join(dir, find(id).file));
} else if (cmd === 'download') {
  const m = find(id);
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, m.file);
  if (!existsSync(dest) || (m.sizeBytes && statSync(dest).size !== m.sizeBytes)) {
    const tmp = `${dest}.part`;
    const r = spawnSync('curl', ['-L', '--fail', '-C', '-', '-o', tmp, `https://huggingface.co/${m.repo}/resolve/main/${m.file}`], { stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status ?? 1);
    renameSync(tmp, dest);
  }
  if (m.sha256) {
    const got = await sha(dest);
    if (got !== m.sha256) { console.error(`sha256 mismatch for ${m.file}: ${got}`); process.exit(3); }
    console.log(`sha256 ok ${got}`);
  }
  console.log(dest);
} else {
  console.error('usage: models.mjs list | path <id> | download <id>');
  process.exit(2);
}
