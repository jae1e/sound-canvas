import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common';
import enHome from './locales/en/home';
import enJournal from './locales/en/journal';
import enPlaceholder from './locales/en/placeholder';
import enSettings from './locales/en/settings';
import enWork from './locales/en/work';
import koCommon from './locales/ko/common';
import koHome from './locales/ko/home';
import koJournal from './locales/ko/journal';
import koPlaceholder from './locales/ko/placeholder';
import koSettings from './locales/ko/settings';
import koWork from './locales/ko/work';

/**
 * UI strings, one file per feature and language under `locales/<lang>/`. Keys are flat and namespaced by file
 * (`t('home.title')`): the file name is the key prefix, so features never collide.
 */
const prefixed = (ns: string, dict: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(dict).map(([k, v]) => [`${ns}.${k}`, v]));

const build = (parts: [string, Record<string, string>][]): Record<string, string> =>
  Object.assign({}, ...parts.map(([ns, d]) => prefixed(ns, d)));

export const resources = {
  en: {
    translation: build([
      ['common', enCommon],
      ['home', enHome],
      ['settings', enSettings],
      ['journal', enJournal],
      ['work', enWork],
      ['placeholder', enPlaceholder],
    ]),
  },
  ko: {
    translation: build([
      ['common', koCommon],
      ['home', koHome],
      ['settings', koSettings],
      ['journal', koJournal],
      ['work', koWork],
      ['placeholder', koPlaceholder],
    ]),
  },
} as const;

export type UiLang = 'ko' | 'en';

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  // Flat keys contain dots; they are not nested paths.
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function setUiLanguage(lang: UiLang): void {
  if (i18n.language !== lang) void i18n.changeLanguage(lang);
}

export { i18n };
export { useTranslation } from 'react-i18next';
