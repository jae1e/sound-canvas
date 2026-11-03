import type { Lang } from '@vlc/session-engine';
import { create } from 'zustand';

import type { AppSettings } from '../settings/schema';
import { useSettings } from '../settings/store';

/** The language of the latest recognised utterance (in memory only; a restart falls back to the device language). */
export const useLastUsedLang = create<{ last: Lang | null }>(() => ({ last: null }));

export function noteUsedLanguage(lang: Lang | undefined): void {
  if (lang && useLastUsedLang.getState().last !== lang) useLastUsedLang.setState({ last: lang });
}

/**
 * The language for UI and speech in the mode screens. An explicit setting wins. In Auto mode the last language the
 * recognizer detected wins, then the device-derived default.
 */
export function pickLanguage(setting: AppSettings['language'], deviceDefault: Lang, lastUsed: Lang | null): Lang {
  if (setting === 'ko' || setting === 'en') return setting;
  return lastUsed ?? deviceDefault;
}

export function getEffectiveLang(): Lang {
  const s = useSettings.getState();
  return pickLanguage(s.settings.language, s.language, useLastUsedLang.getState().last);
}

export function useEffectiveLang(): Lang {
  const setting = useSettings((s) => s.settings.language);
  const device = useSettings((s) => s.language);
  const last = useLastUsedLang((s) => s.last);
  return pickLanguage(setting, device, last);
}
