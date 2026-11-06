export function formatTime(ms: number, lang: string, tz?: string): string {
  try {
    return new Date(ms).toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'medium', ...(tz ? { timeZone: tz } : {}) });
  } catch {
    return new Date(ms).toISOString();
  }
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
