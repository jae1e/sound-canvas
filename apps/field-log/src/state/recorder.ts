import { create } from 'zustand';
import type { PlaybackEvent, WaveEvent, LiveEvent, LiveState, RecorderStatus, Route } from '../native';
import { initialLevelMonitor, pushWave, stepLevelMonitor, type DraftUtt, type LevelMonitorState } from '../core';

export interface RecorderState {
  recording: boolean;
  recordingId: string | null;
  memoId: string | null;
  /** Date.now() minus elapsed at the last status sync; elapsed = Date.now() - anchor. */
  anchorMs: number;
  levelDbfsX100: number;
  liveState: LiveState;
  /** Draft utterances by recording id. */
  drafts: Record<string, DraftUtt[]>;
  /** Date.now() when the last draft text (partial or final) arrived; 0 = none this session. */
  lastDraftAtMs: number;
  /** The input actually routed for the current recording. */
  route: Route | null;
  paused: boolean;
  /** Android muted our capture because another app holds the microphone. */
  silenced: boolean;
  /** Scrolling live waveform (dBFS x 100 per 40 ms). */
  wave: number[];
  /** Recorded milliseconds, pauses excluded. */
  recordedMs: number;
  monitor: LevelMonitorState;
  error: string | null;
}

export const useRecorder = create<RecorderState>(() => ({
  recording: false,
  recordingId: null,
  memoId: null,
  anchorMs: 0,
  levelDbfsX100: -9600,
  liveState: 'off',
  drafts: {},
  lastDraftAtMs: 0,
  route: null,
  paused: false,
  silenced: false,
  wave: [],
  recordedMs: 0,
  monitor: initialLevelMonitor(),
  error: null,
}));

export function applyStatus(s: RecorderStatus): void {
  useRecorder.setState({
    recording: s.recording,
    recordingId: s.recordingId ?? null,
    memoId: s.memoId ?? null,
    anchorMs: s.recording ? Date.now() - s.elapsedMs : 0,
    ...(s.recording && s.recordingId === useRecorder.getState().recordingId ? {} : { lastDraftAtMs: 0 }),
    liveState: s.recording ? s.liveState : 'off',
    paused: s.recording && s.paused,
    silenced: s.recording && s.silenced,
    ...(s.recording && s.recordingId !== useRecorder.getState().recordingId ? { wave: [], recordedMs: s.elapsedMs } : {}),
    ...(s.recording ? {} : { wave: [], recordedMs: 0 }),
    ...(s.recording ? {} : { levelDbfsX100: -9600, route: null, monitor: initialLevelMonitor() }),
  });
}

export function applyLive(e: LiveEvent): void {
  useRecorder.setState((st) => {
    if (e.type === 'state') return { liveState: e.state };
    const rec = st.recordingId;
    if (!rec) return {};
    const list = (st.drafts[rec] ?? []).filter((d) => d.utterance !== e.utterance);
    if (e.type === 'partial') list.push({ utterance: e.utterance, text: e.text, partial: true });
    else list.push({ utterance: e.utterance, text: e.text, startMs: e.startMs, endMs: e.endMs, partial: false });
    return { drafts: { ...st.drafts, [rec]: list }, lastDraftAtMs: Date.now() };
  });
}

export function applyLevel(dbX100: number): void {
  useRecorder.setState((st) => ({
    levelDbfsX100: dbX100,
    monitor: st.recording ? stepLevelMonitor(st.monitor, Date.now(), dbX100) : st.monitor,
  }));
}

export function setRoute(route: Route): void {
  useRecorder.setState({ route });
}

export function applyWave(e: WaveEvent): void {
  useRecorder.setState((st) => (st.paused ? {} : { wave: pushWave(st.wave, e.peaksDbfsX100), recordedMs: e.recordedMs }));
}

export function applyCapture(silenced: boolean): void {
  useRecorder.setState({ silenced });
}

export interface PlaybackState {
  /** Recording whose files are loaded in the player; null when idle. */
  recordingId: string | null;
  state: PlaybackEvent['state'];
  positionMs: number;
  durationMs: number;
  error: string | null;
}

export const usePlayback = create<PlaybackState>(() => ({
  recordingId: null,
  state: 'idle',
  positionMs: 0,
  durationMs: 0,
  error: null,
}));

export function applyPlayback(e: PlaybackEvent): void {
  usePlayback.setState((st) => ({
    state: e.state,
    positionMs: e.positionMs,
    durationMs: e.durationMs,
    error: e.error ?? null,
    recordingId: e.state === 'idle' ? null : st.recordingId,
  }));
}
