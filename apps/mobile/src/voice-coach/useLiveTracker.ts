import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import type { Frame } from '@vlc/voice-analysis';
import VlcVoiceCoach, { type CaptureInfo, type FrameEvent, type StartedTake, type TakeInfo } from '../../modules/vlc-voice-coach';

const WINDOW_S = 8;

export async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const p = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
  if (await PermissionsAndroid.check(p)) return true;
  return (await PermissionsAndroid.request(p)) === PermissionsAndroid.RESULTS.GRANTED;
}

export interface LiveState {
  monitoring: boolean;
  recording: boolean;
  info: CaptureInfo | null;
  last: FrameEvent | null;
  /** Rolling window of the last ~8 s of frames (t is capture time). */
  frames: Frame[];
  error: string | null;
}

/**
 * Subscribes to native `frame` events (about 40 Hz) and republishes a snapshot at ~10 Hz so React does not
 * re-render on every frame. Also owns start/stop of the monitor and of take recording.
 */
export function useLiveTracker() {
  const [state, setState] = useState<LiveState>({ monitoring: false, recording: false, info: null, last: null, frames: [], error: null });
  const buf = useRef<Frame[]>([]);
  const last = useRef<FrameEvent | null>(null);
  const flags = useRef({ monitoring: false, recording: false });
  const takeFrames = useRef<Frame[]>([]);

  useEffect(() => {
    const sub = VlcVoiceCoach.addListener('frame', (e) => {
      last.current = e;
      const fr: Frame = { t: e.t, f0: e.f0, voicing: e.voicing, rmsDb: e.rmsDb, centroid: e.centroid, hnrDb: e.hnrDb };
      buf.current.push(fr);
      if (flags.current.recording) takeFrames.current.push(fr);
      const cutoff = e.t - WINDOW_S;
      while (buf.current.length && buf.current[0]!.t < cutoff) buf.current.shift();
    });
    const errSub = VlcVoiceCoach.addListener('captureError', (e) => setState((s) => ({ ...s, error: e.message, monitoring: false, recording: false })));
    const timer = setInterval(() => {
      if (!flags.current.monitoring && !flags.current.recording) return;
      setState((s) => ({ ...s, last: last.current, frames: buf.current.slice() }));
    }, 100);
    return () => {
      sub.remove();
      errSub.remove();
      clearInterval(timer);
      void VlcVoiceCoach.stopMonitor().catch(() => undefined);
    };
  }, []);

  const startMonitor = useCallback(async (): Promise<boolean> => {
    if (!(await ensureMicPermission())) {
      setState((s) => ({ ...s, error: 'PERMISSION_RECORD_AUDIO' }));
      return false;
    }
    try {
      const info = await VlcVoiceCoach.startMonitor();
      buf.current = [];
      flags.current.monitoring = true;
      setState((s) => ({ ...s, monitoring: true, info, error: null }));
      return true;
    } catch (e) {
      setState((s) => ({ ...s, error: String((e as Error).message ?? e) }));
      return false;
    }
  }, []);

  const stopMonitor = useCallback(async () => {
    flags.current.monitoring = false;
    await VlcVoiceCoach.stopMonitor().catch(() => undefined);
    setState((s) => ({ ...s, monitoring: false, last: flags.current.recording ? s.last : null }));
  }, []);

  const startTake = useCallback(async (): Promise<StartedTake | null> => {
    if (!(await ensureMicPermission())) {
      setState((s) => ({ ...s, error: 'PERMISSION_RECORD_AUDIO' }));
      return null;
    }
    try {
      takeFrames.current = [];
      const t = await VlcVoiceCoach.startTake();
      flags.current.recording = true;
      setState((s) => ({ ...s, recording: true, info: { sampleRate: t.sampleRate, source: t.source }, error: null }));
      return t;
    } catch (e) {
      setState((s) => ({ ...s, error: String((e as Error).message ?? e) }));
      return null;
    }
  }, []);

  const stopTake = useCallback(async (): Promise<{ take: TakeInfo; liveFrames: Frame[] } | null> => {
    flags.current.recording = false;
    try {
      const take = await VlcVoiceCoach.stopTake();
      setState((s) => ({ ...s, recording: false }));
      return { take, liveFrames: takeFrames.current };
    } catch (e) {
      setState((s) => ({ ...s, recording: false, error: String((e as Error).message ?? e) }));
      return null;
    }
  }, []);

  return { state, startMonitor, stopMonitor, startTake, stopTake };
}
