/** Ordered language priority list: ISO 639-1 codes, first = highest priority. Only enabled languages are stored. */
export const KNOWN_LANGUAGES: { code: string; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
];

export const DEFAULT_LANGUAGES = ['ko', 'en'];

export function normaliseLanguages(input: unknown): string[] {
  const out: string[] = [];
  if (Array.isArray(input)) {
    for (const c of input) {
      if (typeof c === 'string' && /^[a-z]{2}$/.test(c) && !out.includes(c)) out.push(c);
    }
  }
  return out.length > 0 ? out : [...DEFAULT_LANGUAGES];
}

/** Migrates the old auto/ko/en setting: the chosen language first, the other one after it. */
export function migrateLegacyLanguage(old: string | null): string[] {
  if (old === 'en') return ['en', 'ko'];
  return [...DEFAULT_LANGUAGES];
}

/** Turns a language on (appended last) or off. The last enabled language cannot be switched off. */
export function toggleLanguage(list: string[], code: string): string[] {
  if (list.includes(code)) return list.length > 1 ? list.filter((c) => c !== code) : list;
  return [...list, code];
}

export function moveLanguage(list: string[], code: string, delta: -1 | 1): string[] {
  const i = list.indexOf(code);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
