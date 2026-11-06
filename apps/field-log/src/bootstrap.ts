import { getDb } from './db/db';
import { ingestJournal } from './db/ingest';
import FlNative from './native';
import { applyCapture, applyLevel, applyLive, applyPlayback, applyWave, applyStatus, useRecorder } from './state/recorder';
import { applyInputs, refreshInputs } from './state/inputs';
import { loadSettings, useSettings } from './state/settings';
import { startSync, triggerSync } from './sync/engine';

/** One-time app start: database, settings, crash recovery, journal ingest, listeners, sync loop. */
export async function bootstrap(): Promise<() => void> {
  await getDb();
  await loadSettings();
  try {
    await FlNative.recoverInterrupted();
  } catch (e) {
    useRecorder.setState({ error: `Recovery failed: ${(e as Error).message}` });
  }
  await ingestJournal().catch((e) => useRecorder.setState({ error: `Journal: ${(e as Error).message}` }));
  applyStatus(await FlNative.getStatus());
  await FlNative.setInputPreference(useSettings.getState().inputPref).then(applyInputs, () => undefined);
  await refreshInputs().catch(() => undefined);

  const subs = [
    FlNative.addListener('onJournal', () => {
      void ingestJournal()
        .then(() => FlNative.getStatus())
        .then(applyStatus)
        .then(() => triggerSync())
        .catch((e) => useRecorder.setState({ error: (e as Error).message }));
    }),
    FlNative.addListener('onLevel', (e) => applyLevel(e.rmsDbfsX100)),
    FlNative.addListener('onLive', applyLive),
    FlNative.addListener('onWave', applyWave),
    FlNative.addListener('onCapture', (e) => applyCapture(e.silenced)),
    FlNative.addListener('onPlayback', applyPlayback),
    FlNative.addListener('onInputs', applyInputs),
  ];
  const stopSync = startSync();
  return () => {
    subs.forEach((s) => s.remove());
    stopSync();
  };
}
