import Constants from 'expo-constants';
import { AppState } from 'react-native';
import { create } from 'zustand';

import VcUpdate from '../../modules/vc-update/src/VcUpdateModule';
import { checkDue, initialState, reduceUpdate, type Event, type Build, type State } from './core';
import { getPairing } from './pairing';

const DOWNLOAD_ID = 'app-update';

type UpdaterState = State & {
  versionName: string;
  versionCode: number;
  gitSha: string;
  lastCheckMs: number | null;
};

export const useUpdater = create<UpdaterState>(() => ({
  ...initialState,
  versionName: '',
  versionCode: 0,
  gitSha: String(Constants.expoConfig?.extra?.gitSha ?? 'dev'),
  lastCheckMs: null,
}));

let takeRecording = false;

export function setUpdateRecording(recording: boolean): void {
  takeRecording = recording;
}

function dispatch(event: Event): void {
  useUpdater.setState((state) => reduceUpdate(state, event));
}

async function loadAppInfo(): Promise<void> {
  const info = await VcUpdate.getAppInfo();
  useUpdater.setState({ versionName: info.versionName, versionCode: info.versionCode });
}

async function fetchLatest(url: string, token: string, versionCode: number): Promise<Build | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${url.replace(/\/+$/, '')}/v1/app/latest?version_code=${versionCode}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as Build;
  } finally {
    clearTimeout(timeout);
  }
}

function errorCode(error: unknown): string {
  const value = error as { name?: string; message?: string };
  if (value?.name === 'AbortError') return 'TIMEOUT';
  if (value?.message?.startsWith('HTTP ')) return value.message;
  if (value?.message === 'Network request failed' || value?.name === 'TypeError') return 'NETWORK';
  return value?.message || 'UNKNOWN';
}

export async function checkForUpdate(silent = false): Promise<void> {
  if (useUpdater.getState().phase === 'checking') return;
  dispatch({ t: 'check' });
  if (useUpdater.getState().phase !== 'checking') return;
  try {
    const pairing = await getPairing();
    if (!pairing.token) {
      dispatch({ t: 'notPaired' });
      return;
    }
    if (useUpdater.getState().versionCode === 0) await loadAppInfo().catch(() => undefined);
    const build = await fetchLatest(pairing.url, pairing.token, useUpdater.getState().versionCode);
    useUpdater.setState({ lastCheckMs: Date.now() });
    dispatch({ t: 'checked', build });
  } catch (error) {
    const message = errorCode(error);
    if (message === 'HTTP 401' || message === 'HTTP 403') dispatch({ t: 'notPaired' });
    else dispatch({ t: 'checkFailed', silent, message });
  }
}

export function maybeAutoCheck(): void {
  if (checkDue(useUpdater.getState().lastCheckMs, Date.now())) void checkForUpdate(true);
}

async function downloadUpdate(build: Build): Promise<void> {
  const pairing = await getPairing().catch((error) => {
    dispatch({ t: 'fail', message: errorCode(error) });
    return null;
  });
  if (!pairing) return;
  if (!pairing.token) {
    dispatch({ t: 'notPaired' });
    return;
  }

  const subscription = VcUpdate.addListener('onDownload', (event) => {
    if (event.id === DOWNLOAD_ID && event.state === 'running') {
      dispatch({
        t: 'progress',
        bytes: event.bytes,
        totalBytes: event.totalBytes,
        atMs: Date.now(),
      });
    }
  });

  try {
    const path = await VcUpdate.downloadFile(
      DOWNLOAD_ID,
      `${pairing.url.replace(/\/+$/, '')}/v1/app/apk/${build.sha256}`,
      { Authorization: `Bearer ${pairing.token}` },
      `voice-coach-${build.version_code}.apk`,
      build.sha256,
    );
    dispatch({ t: 'downloaded', path });
    if (AppState.currentState === 'active') await openInstaller();
  } catch (error) {
    if (useUpdater.getState().phase !== 'available') {
      const message = errorCode(error);
      if (message === 'HTTP 401' || message === 'HTTP 403') dispatch({ t: 'notPaired' });
      else dispatch({ t: 'fail', message });
    }
  } finally {
    subscription.remove();
  }
}

/** Opens the system installer for the downloaded APK. Call only while the app is on screen. */
export async function openInstaller(): Promise<void> {
  dispatch({ t: 'openInstaller' });
  const { phase, apkPath } = useUpdater.getState();
  if (phase !== 'installing' || !apkPath) return;
  try {
    await VcUpdate.installApk(apkPath);
  } catch (error) {
    dispatch({ t: 'fail', message: errorCode(error) });
  }
}

export async function startUpdate(): Promise<void> {
  const current = useUpdater.getState();
  if (['preparing', 'downloading', 'installing'].includes(current.phase)) return;
  const build = current.build;
  if (!build?.newer) {
    dispatch({ t: 'fail', message: 'NO_BUILD' });
    return;
  }
  dispatch({ t: 'prepareInstall' });
  const pairing = await getPairing().catch((error) => {
    dispatch({ t: 'fail', message: errorCode(error) });
    return null;
  });
  if (!pairing) return;
  if (!pairing.token) {
    dispatch({ t: 'notPaired' });
    return;
  }
  const canInstall = await VcUpdate.canInstallPackages().catch(() => false);
  dispatch({ t: 'start', recording: takeRecording, canInstall });

  const phase = useUpdater.getState().phase;
  if (phase === 'needsPermission') {
    await VcUpdate.openInstallPermissionSettings().catch((error) => {
      dispatch({ t: 'fail', message: errorCode(error) });
    });
    return;
  }
  if (phase === 'downloading' && build) await downloadUpdate(build);
}

export async function cancelUpdate(): Promise<void> {
  dispatch({ t: 'cancel' });
  await VcUpdate.cancelDownload(DOWNLOAD_ID).catch(() => undefined);
  await VcUpdate.cleanupUpdates(true).catch(() => undefined);
}

async function onResume(): Promise<void> {
  dispatch({ t: 'resumed' });
  if (
    useUpdater.getState().phase === 'needsPermission' &&
    (await VcUpdate.canInstallPackages().catch(() => false))
  ) {
    dispatch({ t: 'permissionGranted' });
    await startUpdate();
  }
  maybeAutoCheck();
}

export function startUpdater(): () => void {
  void VcUpdate.cleanupUpdates(false).catch(() => undefined);
  void loadAppInfo()
    .then(maybeAutoCheck)
    .catch(() => undefined);
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') void onResume();
  });
  return () => subscription.remove();
}
