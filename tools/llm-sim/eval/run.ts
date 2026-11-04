import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { correctionItems, runTask, TASK_NAMES, type TaskName, type TaskOutcome } from '@vlc/llm';

import { type BackendKind, makeTransport } from '../src/transports';
import { landmarkSource, routineFixture } from './fixtures';
import { renderReport, type Row } from './report';
import { scoreCase } from './score';
import type { EvalCase } from './schema';
import { loadCases } from './validate-cases';

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i]!;
  if (a.startsWith('--')) args.set(a.slice(2), process.argv[i + 1]?.startsWith('--') || process.argv[i + 1] === undefined ? 'true' : process.argv[++i]!);
}

const kind = (args.get('backend') ?? 'fake') as BackendKind;
const label = args.get('label') ?? kind;
const tasks = (args.get('tasks')?.split(',') ?? TASK_NAMES) as TaskName[];
const limit = Number(args.get('limit') ?? 0);
const concurrency = Number(args.get('concurrency') ?? (kind === 'anthropic' || kind === 'worker' ? 4 : 1));
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'results', label);

/** Expands a case into the task input (fixtures are resolved here so case files stay small). */
function inputOf(c: EvalCase): unknown {
  switch (c.task) {
    case 'correction':
      return { note: c.input.note, lang: c.input.lang, items: correctionItems(routineFixture(c.input.fixture, c.input.lang), c.input.lang), ...(c.input.practice ? { practice: c.input.practice } : {}) };
    case 'travel_qa': {
      const s = landmarkSource(c.input.landmark, c.input.lang);
      return { question: c.input.question, lang: c.input.lang, landmarkName: s.name, sourceText: s.sourceText };
    }
    default:
      return { ...c.input, recentTurns: [] };
  }
}

async function main() {
  const transport = await makeTransport({ kind, url: args.get('url'), model: args.get('model'), label });
  const cases = loadCases().filter((c) => tasks.includes(c.task));
  const picked = limit > 0 ? cases.filter((_, i) => i % Math.ceil(cases.length / limit) === 0) : cases;
  console.log(`eval ${label} (${transport.name}): ${picked.length} cases, concurrency ${concurrency}`);
  const rows: Row[] = new Array(picked.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= picked.length) return;
      const c = picked[i]!;
      const t0 = Date.now();
      const outcome = (await runTask(transport, c.task as TaskName, inputOf(c) as never)) as TaskOutcome<TaskName>;
      const wall = Date.now() - t0;
      const score = scoreCase(c, outcome as never);
      rows[i] = {
        id: c.id,
        task: c.task,
        lang: c.lang,
        tags: c.tags,
        heard: c.task === 'align' ? c.input.hypotheses.join(' | ') : c.task === 'command' ? c.input.utterance : c.task === 'routine_setup' ? c.input.text : c.task === 'correction' ? c.input.note : c.input.question,
        score,
        promptTokens: outcome.usage?.promptTokens ?? 0,
        completionTokens: outcome.usage?.completionTokens ?? 0,
        ms: outcome.usage?.ms ?? wall,
        raw: outcome.ok || outcome.raw !== undefined ? ('raw' in outcome ? outcome.raw : undefined) : undefined,
      };
      if (++done % 20 === 0) console.log(`  ${done}/${picked.length}`);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  mkdirSync(outDir, { recursive: true });
  const meta = { label, backend: transport.name, date: new Date().toISOString().slice(0, 10), concurrency, note: args.get('note') ?? '' };
  writeFileSync(join(outDir, 'results.json'), JSON.stringify({ meta, rows }, null, 1));
  const md = renderReport(meta, rows);
  writeFileSync(join(outDir, 'summary.md'), md);
  console.log(md.split('\n').slice(0, 40).join('\n'));
  console.log(`\nwrote ${outDir}/summary.md and results.json`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
