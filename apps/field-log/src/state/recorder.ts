import { create } from 'zustand';
import type { LiveEvent, LiveState, RecorderStatus } from '../native';
import type { DraftUtt } from '../core';

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
  error: null,
}));

export function applyStatus(s: RecorderStatus): void {
  useRecorder.setState({
    recording: s.recording,
    recordingId: s.recordingId ?? null,
    memoId: s.memoId ?? null,
    anchorMs: s.recording ? Date.now() - s.elapsedMs : 0,
    liveState: s.recording ? s.liveState : 'off',
    ...(s.recording ? {} : { levelDbfsX100: -9600 }),
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
    return { drafts: { ...st.drafts, [rec]: list } };
  });
}
