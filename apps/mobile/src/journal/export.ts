/** Pure journal export helpers (no React Native imports, so they run under Vitest). */
import type { JournalEntry } from '../db/repos/journal';

export type ExportLang = 'ko' | 'en';
export type ExportFormat = 'markdown' | 'json';

const SOURCE_LABELS: Record<ExportLang, Record<string, string>> = {
  en: { user_note: 'User note', transcript: 'Transcript', generated_summary: 'Generated summary' },
  ko: { user_note: '직접 작성한 메모', transcript: '음성 기록', generated_summary: '자동 요약' },
};
const MODE_LABELS: Record<ExportLang, Record<string, string>> = {
  en: { work: 'Work Partner', travel: 'Travel Guide', coach: 'Voice Coach', general: 'General' },
  ko: { work: '업무 파트너', travel: '여행 가이드', coach: '보이스 코치', general: '일반' },
};
const WORDS = {
  en: { title: 'Voice Life Companion journal', exported: 'Exported', empty: 'No entries.', original: 'Original', step: 'Step', location: 'Location', entries: 'entries' },
  ko: { title: 'Voice Life Companion 저널', exported: '내보낸 시각', empty: '항목이 없습니다.', original: '원문', step: '단계', location: '위치', entries: '개 항목' },
} as const;

export function sourceLabel(source: string, lang: ExportLang): string {
  return SOURCE_LABELS[lang][source] ?? source;
}
export function modeLabel(mode: string, lang: ExportLang): string {
  return MODE_LABELS[lang][mode] ?? mode;
}

const pad = (n: number) => String(n).padStart(2, '0');
function localDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function localTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Prefixes every line with "> " so multi-line text stays inside one quote block. */
function quote(text: string): string {
  return text.replace(/\r\n?/g, '\n').split('\n').map((l) => (l ? `> ${l}` : '>')).join('\n');
}

/** Keeps user text from forming headings or rules: such lines get a leading backslash. */
function neutralize(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => (/^\s*(#|---|===|\*\*\*)/.test(l) ? `\\${l}` : l))
    .join('\n');
}

export function toMarkdown(entries: JournalEntry[], opts: { lang: ExportLang; now: number }): string {
  const { lang, now } = opts;
  const w = WORDS[lang];
  const lines: string[] = [`# ${w.title}`, '', `${w.exported}: ${localDate(now)} ${localTime(now)} (${entries.length} ${w.entries})`, ''];
  if (entries.length === 0) {
    lines.push(w.empty, '');
    return lines.join('\n');
  }
  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : -1));
  let day = '';
  for (const e of sorted) {
    const d = localDate(e.createdAt);
    if (d !== day) {
      day = d;
      lines.push(`## ${d}`, '');
    }
    const meta = [`${localTime(e.createdAt)}`, sourceLabel(e.source, lang), modeLabel(e.mode, lang)];
    lines.push(`### ${meta.join(' | ')}`, '');
    if (e.taskLabel) lines.push(`- ${w.step}: ${e.taskLabel.replace(/\s+/g, ' ')}`);
    if (e.location) lines.push(`- ${w.location}: ${e.location.latitude}, ${e.location.longitude}`);
    if (e.taskLabel || e.location) lines.push('');
    lines.push(neutralize(e.text), '');
    if (e.originalText !== e.text) lines.push(`${w.original}:`, quote(e.originalText), '');
    lines.push('---', '');
  }
  return lines.join('\n');
}

/**
 * JSON export. Keys: version, exportedAt (ISO), count, entries[]. Each entry has every JournalEntry field;
 * createdAt/updatedAt are epoch ms, createdAtIso/updatedAtIso are the same instants as ISO strings.
 */
export function toJson(entries: JournalEntry[], opts: { now: number }): string {
  const out = {
    version: 1,
    exportedAt: new Date(opts.now).toISOString(),
    count: entries.length,
    entries: entries.map((e) => ({
      id: e.id,
      sessionId: e.sessionId,
      mode: e.mode,
      source: e.source,
      originalText: e.originalText,
      text: e.text,
      taskId: e.taskId,
      taskLabel: e.taskLabel,
      takeId: e.takeId,
      placeId: e.placeId,
      location: e.location,
      createdAt: e.createdAt,
      createdAtIso: new Date(e.createdAt).toISOString(),
      updatedAt: e.updatedAt,
      updatedAtIso: new Date(e.updatedAt).toISOString(),
    })),
  };
  return JSON.stringify(out, null, 2);
}

export function exportFileName(format: ExportFormat, now: number): string {
  return `vlc-journal-${localDate(now)}.${format === 'markdown' ? 'md' : 'json'}`;
}

export function buildExport(entries: JournalEntry[], format: ExportFormat, opts: { lang: ExportLang; now: number }): { fileName: string; mimeType: string; content: string } {
  return format === 'markdown'
    ? { fileName: exportFileName(format, opts.now), mimeType: 'text/markdown', content: toMarkdown(entries, opts) }
    : { fileName: exportFileName(format, opts.now), mimeType: 'application/json', content: toJson(entries, opts) };
}
