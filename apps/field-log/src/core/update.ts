/** Minutes since 2026-01-01T00:00Z: a strictly increasing Android versionCode. */
export const VERSION_EPOCH_MS = Date.UTC(2026, 0, 1);

export function versionCodeFromMs(nowMs: number): number {
  return Math.floor((nowMs - VERSION_EPOCH_MS) / 60000);
}

/** FVL_VERSION_CODE when it is a positive integer, else minutes since the epoch. */
export function resolveVersionCode(env: string | undefined, nowMs: number): number {
  const n = env ? Number(env) : NaN;
  return Number.isInteger(n) && n > 0 ? n : versionCodeFromMs(nowMs);
}

export const CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function checkDue(lastCheckMs: number | null, nowMs: number, intervalMs = CHECK_INTERVAL_MS): boolean {
  return lastCheckMs === null || nowMs - lastCheckMs >= intervalMs || nowMs < lastCheckMs;
}

export interface LatestBuild {
  version_code: number;
  version_name: string;
  git_sha: string;
  sha256: string;
  bytes: number;
  built_ms: number;
  notes: string;
  newer: boolean;
}

export type UpdatePhase = 'idle' | 'checking' | 'upToDate' | 'available' | 'needsPermission' | 'downloading' | 'installing' | 'error';

export interface UpdateState {
  phase: UpdatePhase;
  build: LatestBuild | null;
  bytes: number;
  totalBytes: number;
  /** Smoothed download speed in bytes per second. */
  speedBps: number;
  lastSampleMs: number | null;
  error: string | null;
}

export const initialUpdateState: UpdateState = {
  phase: 'idle',
  build: null,
  bytes: 0,
  totalBytes: 0,
  speedBps: 0,
  lastSampleMs: null,
  error: null,
};

export type UpdateEvent =
  | { t: 'check' }
  | { t: 'checked'; build: LatestBuild | null }
  | { t: 'checkFailed'; silent: boolean; message: string }
  | { t: 'start'; recording: boolean; canInstall: boolean }
  | { t: 'permissionGranted' }
  | { t: 'progress'; bytes: number; totalBytes: number; atMs: number }
  | { t: 'downloaded' }
  | { t: 'fail'; message: string }
  | { t: 'cancel' };

const BUSY: UpdatePhase[] = ['checking', 'downloading', 'installing'];

export function updateReducer(s: UpdateState, e: UpdateEvent): UpdateState {
  switch (e.t) {
    case 'check':
      return BUSY.includes(s.phase) ? s : { ...s, phase: 'checking', error: null };
    case 'checked':
      if (s.phase !== 'checking') return s;
      return e.build && e.build.newer ? { ...s, phase: 'available', build: e.build } : { ...s, phase: 'upToDate', build: e.build };
    case 'checkFailed':
      if (s.phase !== 'checking') return s;
      return e.silent ? { ...s, phase: s.build?.newer ? 'available' : 'idle' } : { ...s, phase: 'error', error: e.message };
    case 'start':
      if (!s.build || !s.build.newer || !(['available', 'error', 'needsPermission'] as UpdatePhase[]).includes(s.phase)) return s;
      if (e.recording) return { ...s, phase: 'error', error: 'RECORDING' };
      if (!e.canInstall) return { ...s, phase: 'needsPermission', error: null };
      return { ...s, phase: 'downloading', error: null, bytes: 0, totalBytes: s.build.bytes, speedBps: 0, lastSampleMs: null };
    case 'permissionGranted':
      return s.phase === 'needsPermission' && s.build
        ? { ...s, phase: 'downloading', error: null, bytes: 0, totalBytes: s.build.bytes, speedBps: 0, lastSampleMs: null }
        : s;
    case 'progress': {
      if (s.phase !== 'downloading') return s;
      let speed = s.speedBps;
      if (s.lastSampleMs !== null && e.atMs > s.lastSampleMs && e.bytes >= s.bytes) {
        const inst = ((e.bytes - s.bytes) * 1000) / (e.atMs - s.lastSampleMs);
        speed = s.speedBps === 0 ? inst : s.speedBps * 0.7 + inst * 0.3;
      }
      return { ...s, bytes: e.bytes, totalBytes: e.totalBytes || s.totalBytes, speedBps: speed, lastSampleMs: e.atMs };
    }
    case 'downloaded':
      return s.phase === 'downloading' ? { ...s, phase: 'installing' } : s;
    case 'fail':
      return { ...s, phase: 'error', error: e.message };
    case 'cancel':
      return s.phase === 'downloading' || s.phase === 'needsPermission' ? { ...s, phase: 'available', error: null } : s;
  }
}

export function formatMb(bytes: number): string {
  return (bytes / 1_000_000).toFixed(1);
}

export function downloadPercent(bytes: number, total: number): number {
  return total > 0 ? Math.min(100, Math.floor((bytes / total) * 100)) : 0;
}

export function versionLabel(name: string, code: number, sha: string): string {
  return `${name} (build ${code}, ${sha})`;
}
