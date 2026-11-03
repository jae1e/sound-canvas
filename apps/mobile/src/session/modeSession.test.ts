import type { Session } from '@vlc/session-engine';
import { describe, expect, it } from 'vitest';

import { ModeSessionManager, type ModeHandler, type ModeNativePort } from './modeSession';

function setup(opts: { workActive?: boolean; failStart?: boolean } = {}) {
  const spoken: string[] = [];
  const holds: boolean[] = [];
  const events: { kind: string; payload: any }[] = [];
  const saved: Session[] = [];
  let running = false;
  const native: ModeNativePort = {
    start: async () => {
      if (opts.failStart) throw new Error('mic denied');
      running = true;
    },
    stop: async () => {
      running = false;
    },
    isRunning: () => running,
    speak: (t) => void spoken.push(t),
    holdStt: (h) => void holds.push(h),
  };
  let n = 0;
  let clock = 1_000_000;
  const mgr = new ModeSessionManager(
    native,
    { saveSession: (s) => void saved.push(s), appendEvent: (kind, payload) => void events.push({ kind, payload }) },
    { now: () => clock, newId: () => `id${++n}` },
    () => opts.workActive ?? false,
  );
  const notes: string[] = [];
  const ended: string[] = [];
  const handler: ModeHandler = {
    handle: (h) => h[0] === 'handled',
    saveNote: (text) => {
      notes.push(text);
      return 'noted';
    },
    onEnded: (i) => void ended.push(i.mode),
  };
  mgr.register('travel', handler);
  mgr.register('coach', handler);
  return { mgr, spoken, holds, events, saved, notes, ended, advance: (ms: number) => (clock += ms) };
}

describe('ModeSessionManager', () => {
  it('starts a mode session and persists an engine session of the matching mode', async () => {
    const { mgr, saved } = setup();
    expect(await mgr.start('travel', 'en')).toEqual({ ok: true });
    expect(mgr.getState()).toMatchObject({ mode: 'travel', status: 'running', lang: 'en' });
    expect(saved[0]?.mode).toBe('walk');
    await mgr.end();
    expect(mgr.getState().status).toBe('idle');
    expect(saved.at(-1)?.status).toBe('ended');
  });

  it('allows only one mode session at a time', async () => {
    const { mgr } = setup();
    await mgr.start('travel', 'ko');
    expect(await mgr.start('coach', 'ko')).toEqual({ ok: false, reason: 'other_mode_active', other: 'travel' });
    await mgr.end();
    expect(await mgr.start('coach', 'ko')).toEqual({ ok: true });
    await mgr.end();
  });

  it('refuses to start while Work Partner is active', async () => {
    const { mgr } = setup({ workActive: true });
    expect(await mgr.start('coach', 'en')).toEqual({ ok: false, reason: 'other_mode_active', other: 'work' });
  });

  it('reports a native start failure and stays idle', async () => {
    const { mgr } = setup({ failStart: true });
    const r = await mgr.start('travel', 'en');
    expect(r).toMatchObject({ ok: false, reason: 'native_failed' });
    expect(mgr.getState()).toMatchObject({ mode: null, status: 'idle', error: 'mic denied' });
  });

  it('routes finals to the mode handler first, then to the shared engine', async () => {
    const { mgr, spoken, notes } = setup();
    await mgr.start('travel', 'en');
    expect(await mgr.onFinal('handled', undefined, 'en')).toBe(true);
    expect(spoken).toEqual([]);
    expect(await mgr.onFinal('note: come back here', undefined, 'en')).toBe(true);
    expect(notes).toEqual(['come back here']);
    expect(spoken).toEqual(['noted']);
    await mgr.onFinal('set a timer for 5 minutes', undefined, 'en');
    expect(Object.keys(mgr.getSession()!.timers)).toHaveLength(1);
    await mgr.end();
  });

  it('ignores finals without a session', async () => {
    const { mgr } = setup();
    expect(await mgr.onFinal('handled', undefined, 'en')).toBe(false);
  });

  it('pauses session STT while any recorder holds the mic and resumes once, logging both', async () => {
    const { mgr, holds, events } = setup();
    await mgr.start('coach', 'ko');
    mgr.holdMic('monitor');
    mgr.holdMic('take');
    mgr.releaseMic('monitor');
    expect(holds).toEqual([true]);
    mgr.releaseMic('take');
    expect(holds).toEqual([true, false]);
    const kinds = events.filter((e) => e.kind === 'session').map((e) => e.payload.event);
    expect(kinds).toContain('stt_paused_for_take');
    expect(kinds).toContain('stt_resumed');
    await mgr.end();
  });

  it('calls the end hook when the native service stops by itself', async () => {
    const { mgr, ended } = setup();
    await mgr.start('travel', 'en');
    mgr.onNativeStopped();
    expect(ended).toEqual(['travel']);
    expect(mgr.getState().status).toBe('idle');
  });
});
