import { describe, expect, it } from 'vitest';

import type { JournalEntry } from '../db/repos/journal';
import { exportFileName, toJson, toMarkdown } from './export';

const at = (y: number, mo: number, d: number, h: number, mi: number) => new Date(y, mo - 1, d, h, mi).getTime();
const NOW = at(2026, 11, 3, 9, 5);

function entry(p: Partial<JournalEntry> & { id: string }): JournalEntry {
  return {
    sessionId: null, mode: 'general', source: 'user_note', originalText: 'hello', text: 'hello',
    taskId: null, taskLabel: null, takeId: null, placeId: null, location: null,
    createdAt: at(2026, 11, 2, 8, 0), updatedAt: at(2026, 11, 2, 8, 0), ...p,
  };
}

describe('toMarkdown', () => {
  it('handles an empty list', () => {
    const md = toMarkdown([], { lang: 'en', now: NOW });
    expect(md).toContain('# Voice Life Companion journal');
    expect(md).toContain('No entries.');
    expect(md).toContain('2026-11-03 09:05');
  });
  it('orders newest first and groups by date', () => {
    const a = entry({ id: 'a', text: 'older', originalText: 'older', createdAt: at(2026, 11, 1, 10, 0) });
    const b = entry({ id: 'b', text: 'newer', originalText: 'newer', createdAt: at(2026, 11, 2, 10, 0) });
    const c = entry({ id: 'c', text: 'newest', originalText: 'newest', createdAt: at(2026, 11, 2, 18, 30) });
    const md = toMarkdown([a, b, c], { lang: 'en', now: NOW });
    expect(md.indexOf('newest')).toBeLessThan(md.indexOf('newer\n'));
    expect(md.indexOf('newer\n')).toBeLessThan(md.indexOf('older'));
    expect(md.match(/^## 2026-11-02$/gm)).toHaveLength(1);
    expect(md).toContain('## 2026-11-01');
  });
  it('localizes labels', () => {
    const e = entry({ id: 'a', source: 'generated_summary', mode: 'work' });
    expect(toMarkdown([e], { lang: 'en', now: NOW })).toContain('Generated summary | Work Partner');
    const ko = toMarkdown([e], { lang: 'ko', now: NOW });
    expect(ko).toContain('자동 요약');
    expect(ko).toContain('업무 파트너');
  });
  it('shows original only when edited', () => {
    const same = toMarkdown([entry({ id: 'a' })], { lang: 'en', now: NOW });
    expect(same).not.toContain('Original');
    const edited = toMarkdown([entry({ id: 'a', originalText: 'um hello\nline2', text: 'hello' })], { lang: 'en', now: NOW });
    expect(edited).toContain('Original:\n> um hello\n> line2');
  });
  it('includes step and location only when present', () => {
    const withBoth = toMarkdown([entry({ id: 'a', taskLabel: 'Review PR', location: { latitude: 37.5, longitude: 127.02, accuracyM: 5 } })], { lang: 'en', now: NOW });
    expect(withBoth).toContain('- Step: Review PR');
    expect(withBoth).toContain('- Location: 37.5, 127.02');
    const none = toMarkdown([entry({ id: 'a' })], { lang: 'en', now: NOW });
    expect(none).not.toContain('Step:');
    expect(none).not.toContain('Location:');
  });
  it('neutralizes headings and rules and keeps entries separated', () => {
    const e = entry({ id: 'a', text: '# fake heading\n---\nok "quoted" 한글', originalText: '# fake heading\n---\nok "quoted" 한글' });
    const md = toMarkdown([e, entry({ id: 'b', createdAt: at(2026, 11, 1, 1, 0) })], { lang: 'ko', now: NOW });
    expect(md).toContain('\\# fake heading');
    expect(md).toContain('\\---');
    expect(md).toContain('ok "quoted" 한글');
    expect(md.match(/^---$/gm)).toHaveLength(2);
  });
});

describe('toJson', () => {
  it('serializes version, count and all fields', () => {
    const e = entry({ id: 'a', text: 'say "hi"\nnew 한글', originalText: 'orig', location: { latitude: 1, longitude: 2, accuracyM: null }, taskLabel: 'S' });
    const j = JSON.parse(toJson([e], { now: NOW }));
    expect(j.version).toBe(1);
    expect(j.count).toBe(1);
    expect(j.exportedAt).toBe(new Date(NOW).toISOString());
    expect(j.entries[0].text).toBe('say "hi"\nnew 한글');
    expect(j.entries[0].originalText).toBe('orig');
    expect(j.entries[0].location).toEqual({ latitude: 1, longitude: 2, accuracyM: null });
    expect(j.entries[0].createdAtIso).toBe(new Date(e.createdAt).toISOString());
    expect(j.entries[0].takeId).toBeNull();
  });
  it('handles an empty list', () => {
    const j = JSON.parse(toJson([], { now: NOW }));
    expect(j.count).toBe(0);
    expect(j.entries).toEqual([]);
  });
});

describe('exportFileName', () => {
  it('uses the local date and extension', () => {
    expect(exportFileName('markdown', NOW)).toBe('vlc-journal-2026-11-03.md');
    expect(exportFileName('json', NOW)).toBe('vlc-journal-2026-11-03.json');
  });
});
