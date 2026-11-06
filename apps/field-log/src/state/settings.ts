import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { kvGet, kvSet } from '../db/kv';
import { newId } from '../db/events';
import { autoStopPayload, parseSwitch, AUTO_PREF, parseInputPref, type InputPref, DEFAULT_LANGUAGES, migrateLegacyLanguage, normaliseLanguages } from '../core';
import FlNative, { type AudioSourceName } from '../native';

export const DEFAULT_SERVER_URL = 'http://100.84.83.35:8787';
const TOKEN_KEY = 'fvl_device_token';

export type UiLang = 'auto' | 'ko' | 'en';
export type SourceChoice = 'AUTO' | AudioSourceName;

export interface SettingsState {
  loaded: boolean;
  serverUrl: string;
  deviceId: string | null;
  token: string | null;
  installId: string;
  liveEnabled: boolean;
  /** Ordered ISO 639-1 codes, first = highest priority. */
  languages: string[];
  /** Which microphone to use; persisted natively as well. */
  inputPref: InputPref;
  source: SourceChoice;
  locationEnabled: boolean;
  stopOnLeaveApp: boolean;
  keepWhenScreenOff: boolean;
  uiLang: UiLang;
}

export const useSettings = create<SettingsState>(() => ({
  loaded: false,
  serverUrl: DEFAULT_SERVER_URL,
  deviceId: null,
  token: null,
  installId: '',
  liveEnabled: true,
  languages: [...DEFAULT_LANGUAGES],
  inputPref: AUTO_PREF,
  source: 'AUTO',
  locationEnabled: true,
  stopOnLeaveApp: true,
  keepWhenScreenOff: true,
  uiLang: 'auto',
}));

export async function loadSettings(): Promise<void> {
  const g = kvGet;
  let installId = await g('install_id');
  if (!installId) {
    installId = newId();
    await kvSet('install_id', installId);
  }
  // The old numeric input_id changed on every reconnect: drop it and use auto.
  const legacyInputId = await g('input_id');
  if (legacyInputId !== null && (await g('input_pref')) === null) await kvSet('input_pref', JSON.stringify(AUTO_PREF));
  const storedLanguages = await g('languages');
  let languages: string[];
  if (storedLanguages) {
    try {
      languages = normaliseLanguages(JSON.parse(storedLanguages));
    } catch {
      languages = [...DEFAULT_LANGUAGES];
    }
  } else {
    languages = migrateLegacyLanguage(await g('language'));
    await kvSet('languages', JSON.stringify(languages));
  }
  useSettings.setState({
    loaded: true,
    serverUrl: (await g('server_url')) ?? DEFAULT_SERVER_URL,
    deviceId: await g('device_id'),
    token: await SecureStore.getItemAsync(TOKEN_KEY),
    installId,
    liveEnabled: ((await g('live_enabled')) ?? '1') === '1',
    languages,
    inputPref: parseInputPref(await g('input_pref')),
    source: ((await g('source')) as SourceChoice | null) ?? 'AUTO',
    locationEnabled: ((await g('location_enabled')) ?? '1') === '1',
    stopOnLeaveApp: parseSwitch(await g('stop_on_leave_app'), true),
    keepWhenScreenOff: parseSwitch(await g('keep_when_screen_off'), true),
    uiLang: ((await g('ui_lang')) as UiLang | null) ?? 'auto',
  });
}

const KEYS: Record<string, string> = {
  serverUrl: 'server_url',
  liveEnabled: 'live_enabled',
  languages: 'languages',
  inputPref: 'input_pref',
  source: 'source',
  locationEnabled: 'location_enabled',
  stopOnLeaveApp: 'stop_on_leave_app',
  keepWhenScreenOff: 'keep_when_screen_off',
  uiLang: 'ui_lang',
};

export async function updateSetting<K extends keyof typeof KEYS>(key: K, value: SettingsState[K & keyof SettingsState]): Promise<void> {
  useSettings.setState({ [key]: value } as Partial<SettingsState>);
  const stored = Array.isArray(value) || (typeof value === 'object' && value !== null)
    ? JSON.stringify(value)
    : typeof value === 'boolean' ? (value ? '1' : '0') : value === null ? '' : String(value);
  await kvSet(KEYS[key], stored);
}

export async function saveEnrolment(deviceId: string, token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await kvSet('device_id', deviceId);
  useSettings.setState({ deviceId, token });
}

/** Pushes the two auto-stop switches to the native recorder. */
export async function pushAutoStop(): Promise<void> {
  await FlNative.setAutoStop(autoStopPayload(useSettings.getState()));
}

export async function setAutoStopSetting(key: 'stopOnLeaveApp' | 'keepWhenScreenOff', value: boolean): Promise<void> {
  await updateSetting(key, value);
  await pushAutoStop();
}
