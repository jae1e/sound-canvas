import { AppState, type AppStateStatus } from 'react-native';
import {
  backoffMs,
  clockExchangeDue,
  computeClock,
  interpretResults,
  selectBatch,
} from '../core';
import { ingestJournal } from '../db/ingest';
import { appendEvent } from '../db/events';
import { writeTx } from '../db/db';
import { kvGet, kvGetJson, kvSet } from '../db/kv';
import { ackEvents, hasPendingTranscripts, markUploaded, outboxCounts, pendingEvents, pendingObjects, setObjectError, unackFrom } from '../db/outbox';
import { applyTranscripts } from '../db/transcripts';
import FlNative from '../native';
import { useSettings } from '../state/settings';
import { setSyncStatus, useSyncStatus } from '../state/syncStatus';
import {
  apiClock,
  apiHasObject,
  apiHealth,
  apiPostEvents,
  apiTranscriptsSince,
  HttpError,
  objectUrl,
  type ServerConfig,
} from './api';

const TICK_MS = 5000;
const LONG_POLL_S = 20;
const TRANSCRIPT_OVERLAP_MS = 5000;
const LONG_POLL_OVERLAP_MS = 1000;

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let started = false;
let failures = 0;
let rerun = false;
let appState: AppStateStatus = (AppState.currentState as AppStateStatus) ?? 'active';
let lastClockAtMs: number | null = null;

function config(): (ServerConfig & { token: string }) | null {
  const s = useSettings.getState();
  if (!s.token || !s.deviceId) return null;
  return { baseUrl: s.serverUrl, token: s.token };
}

async function refreshCounts(): Promise<void> {
  const c = await outboxCounts();
  setSyncStatus({ pendingEvents: c.events, pendingObjects: c.objects, objectErrors: c.objectErrors });
}

async function clockExchange(cfg: ServerConfig): Promise<void> {
  const send = FlNative.clock();
  const res = await apiClock(cfg, send.wallMs, send.elapsedUs);
  const recv = FlNative.clock();
  const r = computeClock({
    sendWallMs: send.wallMs,
    sendElapsedUs: send.elapsedUs,
    recvWallMs: recv.wallMs,
    recvElapsedUs: recv.elapsedUs,
    serverRecvMs: res.server_recv_ms,
    serverSendMs: res.server_send_ms,
  });
  await writeTx((q) =>
    appendEvent(q, {
      type: 'clock_sync',
      payload: { offset_ms: r.offsetMs, rtt_ms: r.rttMs, server_ms: r.serverMs },
      wallMs: recv.wallMs,
      elapsedUs: recv.elapsedUs,
      bootCount: recv.bootCount,
    }),
  );
  lastClockAtMs = Date.now();
  const clock = { offsetMs: r.offsetMs, rttMs: r.rttMs, atMs: lastClockAtMs };
  setSyncStatus({ clock });
  await kvSet('last_clock', JSON.stringify(clock));
}

async function uploadObjects(cfg: ServerConfig & { token: string }): Promise<void> {
  for (;;) {
    const objs = await pendingObjects(20);
    if (objs.length === 0) return;
    let progressed = false;
    for (const o of objs) {
      try {
        if (!(await apiHasObject(cfg, o.sha256))) {
          const res = await FlNative.uploadFile(objectUrl(cfg, o.sha256), o.path, o.mime, {
            Authorization: `Bearer ${cfg.token}`,
          });
          if (res.status === 422) {
            await setObjectError(o.sha256, 'Server reports a hash mismatch (422)');
            continue;
          }
          if (res.status !== 200 && res.status !== 201) throw new HttpError(res.status, `PUT object: HTTP ${res.status}`);
        }
        await markUploaded(o.sha256);
        progressed = true;
        void longPollLoop();
      } catch (e) {
        if (e instanceof HttpError && e.status >= 400 && e.status < 500 && e.status !== 401) {
          await setObjectError(o.sha256, e.message);
          continue;
        }
        if (/ENOENT|No such file|FileNotFound/i.test(String((e as Error).message))) {
          await setObjectError(o.sha256, 'Local file is missing');
          continue;
        }
        throw e;
      }
    }
    await refreshCounts();
    if (!progressed) return; // everything left is in an error state; do not spin
  }
}

async function postEvents(cfg: ServerConfig): Promise<void> {
  for (let guard = 0; guard < 1000; guard++) {
    const batch = selectBatch(await pendingEvents(200));
    if (batch.length === 0) return;
    const res = await apiPostEvents(cfg, batch.map((b) => b.envelope));
    const outcome = interpretResults(batch, res);
    await ackEvents(outcome.ack);
    await refreshCounts();
    if (outcome.stuck) {
      setSyncStatus({ stuck: `Event ${outcome.stuck.eventId} rejected: ${outcome.stuck.reason}` });
      return;
    }
    if (outcome.resendFromSeq !== undefined) {
      if (outcome.resendFromSeq >= batch[0].seq) throw new Error('Server reports a gap it cannot resolve');
      await unackFrom(outcome.resendFromSeq);
      continue;
    }
    if (outcome.ack.length === 0) throw new Error('Server returned no usable results');
  }
}

async function pollTranscripts(cfg: ServerConfig, waitS?: number): Promise<void> {
  const since = Number((await kvGet('transcripts_since_server_ms')) ?? '0');
  const res = await apiTranscriptsSince(cfg, since, waitS);
  await applyTranscripts(res.segments);
  // Two loops share the cursor; it only moves forward. The server returns rows with
  // updated_server_ms >= since, so a large overlap would make every long poll return at once and
  // spin; the long poll keeps a 1 s overlap for rows committed just after the server's clock read.
  const overlap = waitS ? LONG_POLL_OVERLAP_MS : TRANSCRIPT_OVERLAP_MS;
  const next = Math.max(0, res.now_server_ms - overlap);
  const current = Number((await kvGet('transcripts_since_server_ms')) ?? '0');
  if (next > current) await kvSet('transcripts_since_server_ms', String(next));
}

// Separate long-poll loop: runs while any segment waits for its final text, so it can never
// delay uploads or event posting (those stay in the 5 s tick).
let longPolling = false;

async function longPollLoop(): Promise<void> {
  if (longPolling) return;
  longPolling = true;
  try {
    let errors = 0;
    while (started && appState === 'active') {
      const cfg = config();
      if (!cfg || useSyncStatus.getState().connection !== 'online') break;
      if (!(await hasPendingTranscripts())) break;
      try {
        await pollTranscripts(cfg, LONG_POLL_S);
        errors = 0;
      } catch {
        errors += 1;
        if (errors >= 3) break; // the main tick reports the problem and restarts us
        await new Promise((r) => setTimeout(r, backoffMs(errors)));
      }
    }
  } finally {
    longPolling = false;
  }
}

async function runOnce(): Promise<void> {
  const cfg = config();
  if (!cfg) {
    setSyncStatus({ connection: 'unenrolled', syncing: false });
    return;
  }
  setSyncStatus({ syncing: true });
  try {
    await ingestJournal();
    const health = await apiHealth(cfg);
    setSyncStatus({
      connection: 'online',
      streamingAvailable: health.streaming_available,
      serverVersion: health.version,
      error: null,
    });
    if (clockExchangeDue(lastClockAtMs, Date.now())) await clockExchange(cfg);
    await uploadObjects(cfg);
    if (!useSyncStatus.getState().stuck) await postEvents(cfg);
    if (!longPolling) await pollTranscripts(cfg);
    failures = 0;
    setSyncStatus({ lastSyncMs: Date.now(), error: null });
  } catch (e) {
    failures += 1;
    const err = e instanceof HttpError ? e : null;
    if (err?.status === 401) {
      setSyncStatus({ connection: 'error', error: 'The server rejected the device token (401). Enrol again.' });
    } else if (err && err.status === 0) {
      setSyncStatus({ connection: 'offline', error: err.message });
    } else {
      setSyncStatus({ connection: 'error', error: (e as Error).message });
    }
  } finally {
    await refreshCounts().catch(() => undefined);
    setSyncStatus({ syncing: false });
    void longPollLoop();
  }
}

function schedule(delayMs: number): void {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!started || appState !== 'active') return;
  timer = setTimeout(tick, delayMs);
}

async function tick(): Promise<void> {
  timer = null;
  if (running) {
    rerun = true;
    return;
  }
  running = true;
  try {
    do {
      rerun = false;
      await runOnce();
    } while (rerun);
  } finally {
    running = false;
  }
  schedule(Math.max(TICK_MS, backoffMs(failures)));
}

/** Runs a sync pass soon (after new events, or the "Sync now" button). */
export function triggerSync(clearStuck = false): void {
  if (clearStuck) setSyncStatus({ stuck: null });
  if (running) {
    rerun = true;
    return;
  }
  schedule(0);
}

export function startSync(): () => void {
  started = true;
  failures = 0;
  void kvGetJson<{ offsetMs: number; rttMs: number; atMs: number }>('last_clock').then((c) => c && setSyncStatus({ clock: c }));
  const sub = AppState.addEventListener('change', (s) => {
    appState = s;
    if (s === 'active') triggerSync();
    else if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  });
  schedule(0);
  return () => {
    started = false;
    sub.remove();
    if (timer) clearTimeout(timer);
  };
}
