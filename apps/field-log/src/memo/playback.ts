import FlNative from '../native';
import { usePlayback, useRecorder } from '../state/recorder';

const toUri = (p: string) => (p.startsWith('file://') ? p : `file://${p}`);

/** Starts playback of one recording's segment files. User actions only. Refused while recording. */
export async function playRecording(recordingId: string, paths: string[], startMs = 0): Promise<void> {
  if (useRecorder.getState().recording) throw new Error('PLAY_WHILE_RECORDING');
  if (paths.length === 0) return;
  usePlayback.setState({ recordingId, error: null, positionMs: startMs });
  await FlNative.playFiles(paths.map(toUri), startMs);
}

export async function stopPlayback(): Promise<void> {
  await FlNative.stopPlayback();
  usePlayback.setState({ recordingId: null });
}

/** Play/pause for a recording: pauses if it is playing, resumes if paused, else starts at `cuedMs`. */
export async function togglePlayback(recordingId: string, paths: string[], cuedMs: number): Promise<void> {
  const p = usePlayback.getState();
  if (p.recordingId === recordingId && p.state === 'playing') return FlNative.pausePlayback();
  if (p.recordingId === recordingId && p.state === 'paused') return FlNative.resumePlayback();
  const from = p.recordingId === recordingId && p.state === 'ended' ? 0 : cuedMs;
  return playRecording(recordingId, paths, from);
}

/** Seek only moves the position; it never starts playback. Returns true when the player was moved. */
export async function seekIfLoaded(recordingId: string, ms: number): Promise<boolean> {
  const p = usePlayback.getState();
  if (p.recordingId !== recordingId || (p.state !== 'playing' && p.state !== 'paused')) return false;
  await FlNative.seekPlayback(ms);
  return true;
}
