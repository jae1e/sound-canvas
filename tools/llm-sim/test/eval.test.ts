import { describe, expect, it } from 'vitest';

import { loadCases } from '../eval/validate-cases';
import { scoreCase, squash } from '../eval/score';
import { fakeTransport } from '../src/transports';
import { runTask } from '@vlc/llm';

describe('eval case set', () => {
  const cases = loadCases();
  it('has 150+ cases over the five tasks, about half Korean', () => {
    expect(cases.length).toBeGreaterThanOrEqual(150);
    expect(new Set(cases.map((c) => c.task)).size).toBe(5);
    const ko = cases.filter((c) => c.lang === 'ko').length;
    expect(ko / cases.length).toBeGreaterThan(0.4);
    expect(ko / cases.length).toBeLessThan(0.6);
  });
  it('includes the real device utterances', () => {
    const heard = JSON.stringify(cases);
    for (const s of ['리조또 5분 타이머', 'Hey Google turn', 'Pasta 3 minutes', '오른손 먼저 나가야되는데 자꾸 왼손이 나가요']) expect(heard).toContain(s);
  });
  it('covers the required kinds of difficulty', () => {
    const tags = new Set(cases.flatMap((c) => c.tags));
    for (const t of ['real', 'asr', 'honorific', 'casual', 'mixed', 'ambiguous', 'oos']) expect(tags.has(t as never)).toBe(true);
  });
});

describe('scoring', () => {
  it('squash ignores case, spaces and punctuation', () => {
    expect(squash('Right  Hand, first!')).toBe('righthandfirst');
  });
  it('the do-nothing fake backend passes out-of-scope cases and fails real commands (harness sanity)', async () => {
    const t = fakeTransport();
    const align = loadCases().filter((c) => c.task === 'align');
    const real = align.find((c) => c.id === 'align-ko-001')!;
    const oos = align.find((c) => c.tags.includes('oos') && c.expect.type === 'none')!;
    if (real.task !== 'align' || oos.task !== 'align') throw new Error('unexpected case type');
    const rr = await runTask(t, 'align', { ...real.input, recentTurns: [] });
    const ro = await runTask(t, 'align', { ...oos.input, recentTurns: [] });
    expect(scoreCase(real, rr as never).pass).toBe(false);
    expect(scoreCase(oos, ro as never).pass).toBe(true);
  });
});
