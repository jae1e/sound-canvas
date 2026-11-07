import { describe, expect, it } from 'vitest';
import { initialState, reduceUpdate, resolveVersionCode, versionCodeFromMs, type Build } from './core';

const build: Build = {
  version_code: 4,
  version_name: '0.2.1',
  git_sha: 'abc',
  sha256: 'd'.repeat(64),
  bytes: 2_000_000,
  built_ms: 1,
  notes: '',
  newer: true,
};
describe('update logic', () => {
  it('derives minute version codes and accepts explicit positive codes', () => {
    const ms = Date.UTC(2026, 0, 1) + 120_000;
    expect(versionCodeFromMs(ms)).toBe(2);
    expect(resolveVersionCode('9', ms)).toBe(9);
    expect(resolveVersionCode('0', ms)).toBe(2);
  });
  it('checks, gates recording, tracks download speed, cancels and installs', () => {
    let s = reduceUpdate(initialState, { t: 'check' });
    s = reduceUpdate(s, { t: 'checked', build });
    s = reduceUpdate(s, { t: 'start', recording: true, canInstall: true });
    expect(s.error).toBe('RECORDING');
    s = reduceUpdate({ ...s, phase: 'available' }, { t: 'start', recording: false, canInstall: true });
    s = reduceUpdate(s, { t: 'progress', bytes: 1_000_000, totalBytes: 2_000_000, atMs: 1000 });
    s = reduceUpdate(s, { t: 'progress', bytes: 2_000_000, totalBytes: 2_000_000, atMs: 2000 });
    expect(s.speedBps).toBeGreaterThan(0);
    s = reduceUpdate(s, { t: 'downloaded', path: '/x.apk' });
    expect(s.phase).toBe('readyToInstall');
    s = reduceUpdate(s, { t: 'openInstaller' });
    expect(s.phase).toBe('installing');
  });
  it('shows the unpaired state instead of leaving an update check idle', () => {
    let s = reduceUpdate(initialState, { t: 'check' });
    s = reduceUpdate(s, { t: 'notPaired' });
    expect(s.phase).toBe('unpaired');
    expect(s.error).toBeNull();
  });
  it('exposes update check errors, including HTTP and timeout failures', () => {
    for (const message of ['HTTP 503', 'TIMEOUT', 'NETWORK']) {
      let s = reduceUpdate(initialState, { t: 'check' });
      s = reduceUpdate(s, { t: 'checkFailed', silent: false, message });
      expect(s.phase).toBe('error');
      expect(s.error).toBe(message);
    }
  });
});

describe('installer hand-off (VC-11)', () => {
  const ready = {
    ...initialState,
    phase: 'downloading' as const,
    build: {
      version_code: 2,
      version_name: '0.2.0',
      git_sha: 'x',
      sha256: 'a',
      bytes: 1,
      built_ms: 0,
      notes: '',
      newer: true,
    },
  };

  it('waits in readyToInstall after the download and opens the installer only on request', () => {
    const s = reduceUpdate(ready, { t: 'downloaded', path: '/cache/updates/a.apk' });
    expect(s.phase).toBe('readyToInstall');
    expect(s.apkPath).toBe('/cache/updates/a.apk');
    expect(reduceUpdate(s, { t: 'openInstaller' }).phase).toBe('installing');
  });

  it('returns to readyToInstall when the app resumes while the installer was expected', () => {
    let s = reduceUpdate(ready, { t: 'downloaded', path: '/a.apk' });
    s = reduceUpdate(s, { t: 'openInstaller' });
    s = reduceUpdate(s, { t: 'resumed' });
    expect(s.phase).toBe('readyToInstall');
    expect(reduceUpdate(s, { t: 'resumed' }).phase).toBe('readyToInstall');
  });

  it('ignores openInstaller without a downloaded APK', () => {
    expect(reduceUpdate({ ...initialState, phase: 'available' }, { t: 'openInstaller' }).phase).toBe(
      'available',
    );
  });
});
