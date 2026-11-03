/** Locale-aware date/time for journal rows. */
export function formatDateTime(ms: number, lang: 'ko' | 'en'): string {
  return new Date(ms).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' });
}
