import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { kvGet, kvSet } from '../db/kv';
import { newId } from '../db/events';
import type { AudioSourceName, LiveLanguage } from '../native';

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
  language: LiveLanguage;
  inputId: number | null;
  source: SourceChoice;
  locationEnabled: boolean;
  uiLang: UiLang;
}

export const useSettings = create<SettingsState>(() => ({
  loaded: false,
  serverUrl: DEFAULT_SERVER_URL,
  deviceId: null,
  token: null,
  installId: '',
  liveEnabled: true,
  language: 'auto',
  inputId: null,
  source: 'AUTO',
  locationEnabled: true,
  uiLang: 'auto',
}));

export async function loadSettings(): Promise<void> {
  const g = kvGet;
  let installId = await g('install_id');
  if (!installId) {
    installId = newId();
    await kvSet('install_id', installId);
  }
  const inputId = await g('input_id');
  useSettings.setState({
    loaded: true,
    serverUrl: (await g('server_url')) ?? DEFAULT_SERVER_URL,
    deviceId: await g('device_id'),
    token: await SecureStore.getItemAsync(TOKEN_KEY),
    installId,
    liveEnabled: ((await g('live_enabled')) ?? '1') === '1',
    language: ((await g('language')) as LiveLanguage | null) ?? 'auto',
    inputId: inputId === null || inputId === '' ? null : Number(inputId),
    source: ((await g('source')) as SourceChoice | null) ?? 'AUTO',
    locationEnabled: ((await g('location_enabled')) ?? '1') === '1',
    uiLang: ((await g('ui_lang')) as UiLang | null) ?? 'auto',
  });
}

const KEYS: Record<string, string> = {
  serverUrl: 'server_url',
  liveEnabled: 'live_enabled',
  language: 'language',
  inputId: 'input_id',
  source: 'source',
  locationEnabled: 'location_enabled',
  uiLang: 'ui_lang',
};

export async function updateSetting<K extends keyof typeof KEYS>(key: K, value: SettingsState[K & keyof SettingsState]): Promise<void> {
  useSettings.setState({ [key]: value } as Partial<SettingsState>);
  const stored = typeof value === 'boolean' ? (value ? '1' : '0') : value === null ? '' : String(value);
  await kvSet(KEYS[key], stored);
}

export async function saveEnrolment(deviceId: string, token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await kvSet('device_id', deviceId);
  useSettings.setState({ deviceId, token });
}
