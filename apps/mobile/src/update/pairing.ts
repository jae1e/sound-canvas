import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { shapePairingRequest } from './pairingRequest';

export { shapePairingRequest } from './pairingRequest';

export const DEFAULT_SERVER_URL = 'http://100.84.83.35:8787';

export async function getPairing(): Promise<{ url: string; token: string | null }> {
  const url = (await SecureStore.getItemAsync('vc.serverUrl')) ?? DEFAULT_SERVER_URL;
  const token = await SecureStore.getItemAsync('vc.serverToken');
  return { url, token };
}

export async function enroll(url: string, code: string): Promise<{ device_id: string; token: string }> {
  const serverUrl = url.trim();
  const installId =
    (await SecureStore.getItemAsync('vc.installId')) ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await SecureStore.setItemAsync('vc.installId', installId);

  const device = {
    model: 'Android device',
    manufacturer: 'Unknown',
    os_version: `${Platform.OS} ${String(Platform.Version)}`,
    app_version: Constants.expoConfig?.version ?? '0.2.0',
    install_id: installId,
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    response = await fetch(`${serverUrl.replace(/\/+$/, '')}/v1/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shapePairingRequest(code, device)),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const result = (await response.json()) as { device_id: string; token: string };
  await SecureStore.setItemAsync('vc.serverUrl', serverUrl);
  await SecureStore.setItemAsync('vc.serverToken', result.token);
  return result;
}
