export const MAX_TITLE_CHARS = 120;
export const AUTO_TITLE_CHARS = 40;

/** Trims and caps a user title at 120 characters (code points). Empty means "no title". */
export function normaliseTitle(raw: string): string {
  return Array.from(raw.trim()).slice(0, MAX_TITLE_CHARS).join('');
}

export function titleChanged(current: string | null, raw: string): boolean {
  return normaliseTitle(raw) !== (current ?? '');
}

export function titlePayload(memoId: string, raw: string): { memo_id: string; title: string } {
  return { memo_id: memoId, title: normaliseTitle(raw) };
}

/** Latest memo_titled event by seq wins; an empty title clears it (null). */
export function projectTitle(events: { seq: number; title: string }[]): string | null {
  let best: { seq: number; title: string } | null = null;
  for (const e of events) if (!best || e.seq > best.seq) best = e;
  const t = best ? normaliseTitle(best.title) : '';
  return t === '' ? null : t;
}

export function truncate(text: string, max = AUTO_TITLE_CHARS): string {
  const one = text.replace(/\s+/g, ' ').trim();
  const chars = Array.from(one);
  return chars.length > max ? chars.slice(0, max).join('').trimEnd() + '…' : one;
}

/** Auto title: first final transcript text, else the newest live draft, else the kind fallback. */
export function autoTitle(args: {
  firstFinalText?: string | null;
  draftText?: string | null;
  kind: string;
  fallbacks: { voice: string; photo: string };
}): string {
  if (args.firstFinalText && args.firstFinalText.trim()) return truncate(args.firstFinalText);
  if (args.draftText && args.draftText.trim()) return truncate(args.draftText);
  return args.kind === 'voice' ? args.fallbacks.voice : args.fallbacks.photo;
}

/** The title shown on line 1: the user title, else the auto title. */
export function displayTitle(userTitle: string | null, auto: string): string {
  return userTitle && userTitle.trim() ? userTitle : auto;
}

/** Line 3 of a list row: the transcript, unless it only repeats line 1. */
export function previewLine(line1: string, transcript: string | null): string | null {
  const t = (transcript ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const stripped = line1.endsWith('…') ? line1.slice(0, -1) : line1;
  if (t === line1 || t === stripped) return null;
  return t;
}

const WEEKDAYS = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ko: ['일', '월', '화', '수', '목', '금', '토'],
};
const p2 = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const hm = (d: Date) => `${p2(d.getHours())}:${p2(d.getMinutes())}`;
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Today 18:43", "Yesterday 09:10", otherwise "2026-11-06" (device local time). */
export function dateLabel(ms: number, nowMs: number, lang: 'en' | 'ko'): string {
  const d = new Date(ms);
  const days = Math.round((dayStart(new Date(nowMs)) - dayStart(d)) / 86400000);
  if (days === 0) return `${lang === 'ko' ? '오늘' : 'Today'} ${hm(d)}`;
  if (days === 1) return `${lang === 'ko' ? '어제' : 'Yesterday'} ${hm(d)}`;
  return ymd(d);
}

/** "2026-11-06 (Fri) 18:43" / "2026-11-06 (금) 18:43" in device local time. */
export function stampLabel(ms: number, lang: 'en' | 'ko'): string {
  const d = new Date(ms);
  return `${ymd(d)} (${WEEKDAYS[lang][d.getDay()]}) ${hm(d)}`;
}

/** m:ss, or h:mm:ss from one hour. */
export function durationLabel(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${p2(m)}:${p2(s)}` : `${m}:${p2(s)}`;
}
