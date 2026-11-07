export const VERSION_EPOCH_MS = Date.UTC(2026, 0, 1);

export function versionCodeFromMs(now: number): number {
  return Math.floor((now - VERSION_EPOCH_MS) / 60_000);
}

export function resolveVersionCode(env: string | undefined, now: number): number {
  const value = Number(env);
  return Number.isInteger(value) && value > 0 ? value : versionCodeFromMs(now);
}

export const CHECK_INTERVAL_MS = 3_600_000;

export function checkDue(last: number | null, now: number): boolean {
  return last === null || now - last >= CHECK_INTERVAL_MS || now < last;
}

export type Build = {
  version_code: number;
  version_name: string;
  git_sha: string;
  sha256: string;
  bytes: number;
  built_ms: number;
  notes: string;
  newer: boolean;
};

export type Phase =
  | 'idle'
  | 'unpaired'
  | 'checking'
  | 'upToDate'
  | 'available'
  | 'preparing'
  | 'needsPermission'
  | 'downloading'
  | 'readyToInstall'
  | 'installing'
  | 'error';

export type State = {
  phase: Phase;
  build: Build | null;
  bytes: number;
  totalBytes: number;
  speedBps: number;
  lastSampleMs: number | null;
  error: string | null;
  /** Verified APK waiting for the installer (phase readyToInstall or installing). */
  apkPath: string | null;
};

export const initialState: State = {
  phase: 'idle',
  build: null,
  bytes: 0,
  totalBytes: 0,
  speedBps: 0,
  lastSampleMs: null,
  error: null,
  apkPath: null,
};

export type Event =
  | { t: 'check' }
  | { t: 'notPaired' }
  | { t: 'prepareInstall' }
  | { t: 'checked'; build: Build | null }
  | { t: 'checkFailed'; silent: boolean; message: string }
  | { t: 'start'; recording: boolean; canInstall: boolean }
  | { t: 'permissionGranted' }
  | { t: 'progress'; bytes: number; totalBytes: number; atMs: number }
  | { t: 'downloaded'; path: string }
  | { t: 'openInstaller' }
  | { t: 'resumed' }
  | { t: 'fail'; message: string }
  | { t: 'cancel' };

const busyPhases: Phase[] = ['checking', 'preparing', 'downloading', 'installing'];

export function reduceUpdate(state: State, event: Event): State {
  switch (event.t) {
    case 'check':
      return busyPhases.includes(state.phase) ? state : { ...state, phase: 'checking', error: null };
    case 'notPaired':
      return { ...state, phase: 'unpaired', error: null };
    case 'prepareInstall':
      return ['available', 'error', 'needsPermission', 'readyToInstall'].includes(state.phase)
        ? { ...state, phase: 'preparing', error: null }
        : state;
    case 'checked':
      if (state.phase !== 'checking') return state;
      return event.build?.newer
        ? { ...state, phase: 'available', build: event.build }
        : { ...state, phase: 'upToDate', build: event.build };
    case 'checkFailed':
      if (state.phase !== 'checking') return state;
      return event.silent
        ? { ...state, phase: state.build?.newer ? 'available' : 'idle' }
        : { ...state, phase: 'error', error: event.message };
    case 'start': {
      if (
        !state.build?.newer ||
        !(['available', 'error', 'needsPermission', 'preparing', 'readyToInstall'] as Phase[]).includes(
          state.phase,
        )
      ) {
        return state;
      }
      if (event.recording) return { ...state, phase: 'error', error: 'RECORDING' };
      if (!event.canInstall) return { ...state, phase: 'needsPermission', error: null };
      return {
        ...state,
        phase: 'downloading',
        error: null,
        bytes: 0,
        totalBytes: state.build.bytes,
        speedBps: 0,
        lastSampleMs: null,
      };
    }
    case 'permissionGranted':
      return state.phase === 'needsPermission' && state.build
        ? {
            ...state,
            phase: 'downloading',
            error: null,
            bytes: 0,
            totalBytes: state.build.bytes,
            speedBps: 0,
            lastSampleMs: null,
          }
        : state;
    case 'progress': {
      if (state.phase !== 'downloading') return state;
      const instantSpeed =
        state.lastSampleMs !== null && event.atMs > state.lastSampleMs && event.bytes >= state.bytes
          ? ((event.bytes - state.bytes) * 1000) / (event.atMs - state.lastSampleMs)
          : 0;
      const speedBps = instantSpeed
        ? state.speedBps
          ? state.speedBps * 0.7 + instantSpeed * 0.3
          : instantSpeed
        : state.speedBps;
      return {
        ...state,
        bytes: event.bytes,
        totalBytes: event.totalBytes || state.totalBytes,
        speedBps,
        lastSampleMs: event.atMs,
      };
    }
    case 'downloaded':
      // Android blocks activity starts from the background, so the installer opens only from the screen
      // (VC-11): the APK waits in readyToInstall until the app is in the foreground or the user taps 설치.
      return state.phase === 'downloading'
        ? { ...state, phase: 'readyToInstall', apkPath: event.path }
        : state;
    case 'openInstaller':
      return state.phase === 'readyToInstall' && state.apkPath ? { ...state, phase: 'installing' } : state;
    case 'resumed':
      // Back in the app while "installing": the installer was dismissed, failed, or never appeared.
      // A successful install restarts the app, so it never comes back here.
      return state.phase === 'installing' ? { ...state, phase: 'readyToInstall' } : state;
    case 'fail':
      return { ...state, phase: 'error', error: event.message };
    case 'cancel':
      return ['downloading', 'needsPermission', 'readyToInstall'].includes(state.phase)
        ? { ...state, phase: 'available', error: null, apkPath: null }
        : state;
  }
}

export function formatMb(bytes: number): string {
  return (bytes / 1_000_000).toFixed(1);
}

export function downloadPercent(bytes: number, total: number): number {
  return total > 0 ? Math.min(100, Math.floor((bytes / total) * 100)) : 0;
}
