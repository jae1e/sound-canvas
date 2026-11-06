import Constants from 'expo-constants';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { checkDue, initialUpdateState, updateReducer, type LatestBuild, type UpdateEvent, type UpdateState } from '../core';
import FlNative from '../native';
import { useRecorder } from '../state/recorder';
import { useSettings } from '../state/settings';
import { HttpError, normaliseBaseUrl, type ServerConfig } from '../sync/api';

const DOWNLOAD_ID = 'app-update';

export interface UpdaterStore extends UpdateState {
  versionName: string;
  versionCode: number;
  gitSha: string;
  lastCheckMs: number | null;
}

export const useUpdater = create<UpdaterStore>(() => ({
  ...initialUpdateState,
  versionName: '',
  versionCode: 0,
  gitSha: (Constants.expoConfig?.extra?.gitSha as string | undefined) ?? 'dev',
  lastCheckMs: null,
}));

function dispatch(e: UpdateEvent): void {
  useUpdater.setState((s) => updateReducer(s, e));
}

function cfg(): ServerConfig | null {
  const s = useSettings.getState();
  return s.token ? { baseUrl: s.serverUrl, token: s.token } : null;
}

export async function loadAppInfo(): Promise<void> {
  const info = await FlNative.getAppInfo();
  useUpdater.setState({ versionName: info.versionName, versionCode: info.versionCode });
}

async function fetchLatest(c: ServerConfig, versionCode: number): Promise<LatestBuild | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(`${normaliseBaseUrl(c.baseUrl)}/v1/app/latest?version_code=${versionCode}`, {
      headers: { Authorization: `Bearer ${c.token}` },
      signal: ctl.signal,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new HttpError(res.status, `HTTP ${res.status}`);
    return (await res.json()) as LatestBuild;
  } finally {
    clearTimeout(timer);
  }
}

/** Checks the server for a newer build. `silent` swallows errors (automatic checks). */
export async function checkForUpdate(silent: boolean): Promise<void> {
  const c = cfg();
  if (!c) return;
  if (useUpdater.getState().versionCode === 0) await loadAppInfo().catch(() => undefined);
  dispatch({ t: 'check' });
  if (useUpdater.getState().phase !== 'checking') return;
  try {
    const build = await fetchLatest(c, useUpdater.getState().versionCode);
    useUpdater.setState({ lastCheckMs: Date.now() });
    dispatch({ t: 'checked', build });
  } catch (e) {
    dispatch({ t: 'checkFailed', silent, message: (e as Error).message });
  }
}

/** Automatic check at start and on resume, at most once an hour. */
export function maybeAutoCheck(): void {
  if (checkDue(useUpdater.getState().lastCheckMs, Date.now())) void checkForUpdate(true);
}

async function download(): Promise<void> {
  const c = cfg();
  const build = useUpdater.getState().build;
  if (!c || !build) return;
  const sub = FlNative.addListener('onDownload', (e) => {
    if (e.id === DOWNLOAD_ID && e.state === 'running') dispatch({ t: 'progress', bytes: e.bytes, totalBytes: e.totalBytes, atMs: Date.now() });
  });
  try {
    const path = await FlNative.downloadFile(
      DOWNLOAD_ID,
      `${normaliseBaseUrl(c.baseUrl)}/v1/app/apk/${build.sha256}`,
      { Authorization: `Bearer ${c.token}` },
      `fvl-${build.version_code}.apk`,
      build.sha256,
    );
    dispatch({ t: 'downloaded' });
    await FlNative.installApk(path);
  } catch (e) {
    if (useUpdater.getState().phase === 'available') return; // cancelled
    dispatch({ t: 'fail', message: (e as Error).message });
  } finally {
    sub.remove();
  }
}

/** Starts (or retries; the native download resumes) the update. Refused while recording. */
export async function startUpdate(): Promise<void> {
  const canInstall = await FlNative.canInstallPackages().catch(() => false);
  dispatch({ t: 'start', recording: useRecorder.getState().recording, canInstall });
  const phase = useUpdater.getState().phase;
  if (phase === 'needsPermission') {
    await FlNative.openInstallPermissionSettings().catch(() => undefined);
  } else if (phase === 'downloading') {
    await download();
  }
}

export async function cancelUpdate(): Promise<void> {
  dispatch({ t: 'cancel' });
  await FlNative.cancelDownload(DOWNLOAD_ID).catch(() => undefined);
  await FlNative.cleanupUpdates(true).catch(() => undefined);
}

/** When the user comes back from the install-permission screen, continue automatically. */
async function onResume(): Promise<void> {
  if (useUpdater.getState().phase === 'needsPermission' && (await FlNative.canInstallPackages().catch(() => false))) {
    dispatch({ t: 'permissionGranted' });
    await download();
  }
  maybeAutoCheck();
}

/** App start: clean old APKs, read the version, check, and re-check on resume. */
export function startUpdater(): () => void {
  void FlNative.cleanupUpdates(false).catch(() => undefined);
  void loadAppInfo().then(() => maybeAutoCheck()).catch(() => undefined);
  const sub = AppState.addEventListener('change', (st) => {
    if (st === 'active') void onResume();
  });
  return () => sub.remove();
}
