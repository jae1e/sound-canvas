import { getDb } from './db/db';
import { ingestJournal } from './db/ingest';
import FlNative from './native';
import { applyLive, applyStatus, useRecorder } from './state/recorder';
import { loadSettings } from './state/settings';
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

  const subs = [
    FlNative.addListener('onJournal', () => {
      void ingestJournal()
        .then(() => FlNative.getStatus())
        .then(applyStatus)
        .then(() => triggerSync())
        .catch((e) => useRecorder.setState({ error: (e as Error).message }));
    }),
    FlNative.addListener('onLevel', (e) => useRecorder.setState({ levelDbfsX100: e.rmsDbfsX100 })),
    FlNative.addListener('onLive', applyLive),
  ];
  const stopSync = startSync();
  return () => {
    subs.forEach((s) => s.remove());
    stopSync();
  };
}
