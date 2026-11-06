import { getDb, writeTx } from '../db/db';
import { ingestJournal } from '../db/ingest';
import FlNative from '../native';
import { applyStatus } from '../state/recorder';
import { refreshInputs } from '../state/inputs';

let running: Promise<void> | null = null;

/**
 * Brings the UI caches in line with the sources of truth: ingest the native journal, read the
 * native status, close local recordings that native no longer has open, then let queries refresh.
 */
export function reconcile(): Promise<void> {
  running ??= (async () => {
    try {
      await ingestJournal();
      const status = await FlNative.getStatus();
      applyStatus(status);
      if (!status.recording) {
        // A recording row with no stop while native is idle (crash, or a stop not yet journaled).
        const cutoff = Date.now() - 5000;
        await getDb();
        await writeTx((q) =>
          q.runAsync("UPDATE recordings SET stopped = 1, stop_reason = COALESCE(stop_reason, 'interrupted') WHERE stopped = 0 AND start_wall_ms < ?", cutoff),
        );
      }
      await refreshInputs().catch(() => undefined);
    } finally {
      running = null;
    }
  })();
  return running;
}
