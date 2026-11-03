import { getLocales } from 'expo-localization';
import { create } from 'zustand';

import { getDb } from '../db/client';
import { loadSettings, saveSettings } from '../db/repos/settings';
import { setUiLanguage } from '../i18n';
import { DEFAULT_SETTINGS, resolveLanguage, type AppSettings } from './schema';

interface SettingsState {
  settings: AppSettings;
  /** The concrete language (ko or en) after resolving `auto`. */
  language: 'ko' | 'en';
  loaded: boolean;
  load: () => void;
  update: (patch: Partial<AppSettings>) => void;
}

const deviceLocale = () => getLocales()[0]?.languageTag ?? 'en';

/** App settings (persisted in SQLite). `language` is the resolved UI/speech language. */
export const useSettings = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  language: resolveLanguage(DEFAULT_SETTINGS.language, undefined),
  loaded: false,
  load: () => {
    const settings = loadSettings(getDb());
    const language = resolveLanguage(settings.language, deviceLocale());
    setUiLanguage(language);
    set({ settings, language, loaded: true });
  },
  update: (patch) => {
    const settings = saveSettings(getDb(), patch, Date.now());
    const language = resolveLanguage(settings.language, deviceLocale());
    setUiLanguage(language);
    set({ settings, language });
  },
}));
