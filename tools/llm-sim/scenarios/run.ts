import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { setLlmTransport } from '../../../apps/mobile/src/llm/askLlm';
import { type BackendKind, makeTransport } from '../src/transports';
import { MeteredTransport, summarize } from './harness';
import { routineSetupAndRun, taegeukCorrection } from './routine';
import { travelQa } from './travel';
import { workCooking } from './work';

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i++) if (process.argv[i]!.startsWith('--')) args.set(process.argv[i]!.slice(2), process.argv[i + 1]?.startsWith('--') || process.argv[i + 1] === undefined ? 'true' : process.argv[++i]!);

const kind = (args.get('backend') ?? 'llama-server') as BackendKind;
const label = args.get('label') ?? kind;
const only = args.get('only');
const scenarios = { work: workCooking, routine: routineSetupAndRun, taegeuk: taegeukCorrection, travel: travelQa } as const;

async function main() {
  const inner = await makeTransport({ kind, url: args.get('url'), model: args.get('model'), label });
  const out: string[] = [`# Scenario transcripts: ${label}`, '', `Backend: \`${inner.name}\`. Date: ${new Date().toISOString().slice(0, 10)}. Each turn shows what was heard, which path handled it, the engine action and state, and what was spoken.`, ''];
  for (const [key, run] of Object.entries(scenarios)) {
    if (only && only !== key) continue;
    const metered = new MeteredTransport(inner);
    setLlmTransport(metered);
    const tr = await run(metered);
    out.push(tr.render(), `_${summarize(metered)}_`, '');
  }
  setLlmTransport(null);
  const text = out.join('\n');
  console.log(text);
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'results');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `scenarios-${label}.md`), text);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e instanceof Error ? e.stack : e);
  process.exit(1);
});
