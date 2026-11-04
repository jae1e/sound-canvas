import type { Score } from './score';

export interface Row {
  id: string;
  task: string;
  lang: string;
  tags: readonly string[];
  heard: string;
  score: Score;
  promptTokens: number;
  completionTokens: number;
  ms: number;
  raw?: string;
}

export interface Meta {
  label: string;
  backend: string;
  date: string;
  concurrency: number;
  note: string;
}

const pct = (n: number, d: number) => (d === 0 ? '-' : `${Math.round((100 * n) / d)}%`);
const q = (xs: number[], p: number) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))]!;
};
const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
const check = (rows: Row[], key: string) => {
  const rel = rows.filter((r) => key in r.score.checks);
  return pct(rel.filter((r) => r.score.checks[key]).length, rel.length);
};

/** Markdown report: overall, per task, per language, per tag, tokens/latency, and the failures worth reading. */
export function renderReport(meta: Meta, rows: Row[]): string {
  const tasks = [...new Set(rows.map((r) => r.task))];
  const L: string[] = [];
  L.push(`# LLM eval: ${meta.label}`, '', `Backend: \`${meta.backend}\`. Date: ${meta.date}. Cases: ${rows.length}. Concurrency: ${meta.concurrency}.${meta.note ? ' ' + meta.note : ''}`, '');
  L.push('Pass = every check for the case is right (action, arguments, confirmation behaviour, groundedness). JSON valid = output parsed and matched the output schema. Accepted = the task validator would let the app use it; anything else is rejected and never applied.', '');
  L.push('## By task', '', '| Task | Cases | Pass | JSON valid | Accepted | Prompt tok (mean) | Completion tok (mean) | Latency ms p50 | p95 |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  const line = (name: string, rs: Row[]) =>
    `| ${name} | ${rs.length} | ${pct(rs.filter((r) => r.score.pass).length, rs.length)} | ${pct(rs.filter((r) => r.score.jsonValid).length, rs.length)} | ${pct(rs.filter((r) => r.score.accepted).length, rs.length)} | ${mean(rs.map((r) => r.promptTokens))} | ${mean(rs.map((r) => r.completionTokens))} | ${q(rs.map((r) => r.ms), 0.5)} | ${q(rs.map((r) => r.ms), 0.95)} |`;
  for (const t of tasks) L.push(line(t, rows.filter((r) => r.task === t)));
  L.push(line('**all**', rows), '');

  L.push('## Detail checks', '', '| Task | Check | Result |', '| --- | --- | --- |');
  for (const t of tasks) {
    const rs = rows.filter((r) => r.task === t);
    const keys = [...new Set(rs.flatMap((r) => Object.keys(r.score.checks)))];
    for (const k of keys) L.push(`| ${t} | ${k} | ${check(rs, k)} |`);
  }
  L.push('');

  L.push('Clarification: `askedWhenShould` is the share of cases labelled "ask / confirm" where the system asked; `quietWhenShould` is the share labelled "just do it" where it did not interrupt the user. Both appear under Detail checks for `align` (needsConfirmation) and `command` (clarify).', '');

  L.push('## By language', '', '| Task | ko pass | en pass |', '| --- | --- | --- |');
  for (const t of tasks) {
    const rs = rows.filter((r) => r.task === t);
    const f = (lang: string) => {
      const x = rs.filter((r) => r.lang === lang);
      return `${pct(x.filter((r) => r.score.pass).length, x.length)} (${x.length})`;
    };
    L.push(`| ${t} | ${f('ko')} | ${f('en')} |`);
  }
  L.push('', '## By tag', '', '| Tag | Cases | Pass |', '| --- | --- | --- |');
  for (const tag of [...new Set(rows.flatMap((r) => r.tags))].sort()) {
    const rs = rows.filter((r) => r.tags.includes(tag));
    L.push(`| ${tag} | ${rs.length} | ${pct(rs.filter((r) => r.score.pass).length, rs.length)} |`);
  }
  L.push('', '## Failures', '');
  const fails = rows.filter((r) => !r.score.pass);
  if (fails.length === 0) L.push('None.');
  for (const t of tasks) {
    const fs = fails.filter((r) => r.task === t);
    if (fs.length === 0) continue;
    L.push(`### ${t} (${fs.length})`, '');
    for (const r of fs.slice(0, 25)) L.push(`- \`${r.id}\` ${r.tags.join(',')}: "${r.heard.replace(/\n/g, ' ')}" -> ${r.score.actual}${r.score.why ? ` (${r.score.why})` : ''}`);
    if (fs.length > 25) L.push(`- ... ${fs.length - 25} more in results.json`);
    L.push('');
  }
  return L.join('\n') + '\n';
}
