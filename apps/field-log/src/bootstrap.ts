import { getDb } from './db/db';
import { ingestJournal } from './db/ingest';
import FlNative from './native';
import { applyCapture, applyLevel, applyLive, applyPlayback, applyWave, applyStatus, useRecorder } from './state/recorder';
import { applyInputs, refreshInputs } from './state/inputs';
import { AppState } from 'react-native';
import { loadSettings, pushAutoStop, useSettings } from './state/settings';
import { startUpdater } from './update/updater';
import { reconcile } from './sync/reconcile';
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
  await reconcile().catch(() => undefined);
  await FlNative.setInputPreference(useSettings.getState().inputPref).then(applyInputs, () => undefined);
  await refreshInputs().catch(() => undefined);
  await pushAutoStop().catch(() => undefined);

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
  // Native decides when to stop on leaving the app; JS only resyncs its view when it comes back.
  const appSub = AppState.addEventListener('change', (st) => {
    if (st !== 'active') return;
    void reconcile().catch(() => undefined);
  });
  const stopUpdater = startUpdater();
  const stopSync = startSync();
  return () => {
    subs.forEach((s) => s.remove());
    appSub.remove();
    stopUpdater();
    stopSync();
  };
}
