import { desc, eq } from 'drizzle-orm';
import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import type { SpeechPlan, SpeechReport, SpeechTakeAnalysis, SpeechTranscript } from '@vlc/voice-analysis';
import VcAudio from '../../modules/vc-audio/src/VcAudioModule';
import { getDb } from '../db/client';
import { takes } from '../db/schema';
import { loadSettings } from '../db/repos/settings';
import { speechBaseline } from './baseline';
import { updateSpeechTake } from '../db/repos/speech';
import { persistAnalysis } from '../recorder/takePersistence';
import { getPairing } from '../update/pairing';
import {
  advanceTranscript,
  type TranscriptJob,
  type TranscriptResult,
  type TranscriptState,
  type TranscriptTransport,
} from './transcriptQueue';
import { assembleSpeechReport } from './reportAssembly';

type Row = typeof takes.$inferSelect;
function parse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function snapshot(row: Row): { speechPlan: SpeechPlan | null; targetMs: number } {
  return parse(row.beatJson, { speechPlan: null, targetMs: 0 });
}
export function rebuildSpeechReport(row: Row): void {
  if (!row.analysisJson) return;
  const db = getDb();
  const previous = db
    .select()
    .from(takes)
    .where(eq(takes.kind, 'speech'))
    .orderBy(desc(takes.createdAt))
    .all()
    .find(
      (other) =>
        other.planId === row.planId &&
        other.id !== row.id &&
        other.createdAt < row.createdAt &&
        other.reportJson,
    );
  const saved = snapshot(row);
  const result = parse<TranscriptResult | null>(row.transcriptJson, null);
  const transcript: SpeechTranscript | null =
    result?.state === 'done'
      ? { text: result.text ?? '', words: result.words, language: result.language ?? undefined }
      : null;
  const language =
    saved.speechPlan?.lang === 'en'
      ? 'en'
      : saved.speechPlan?.lang === 'ko'
        ? 'ko'
        : (transcript?.language ?? 'ko');
  const baseline = loadSettings(db).learnSpeechBaseline
    ? speechBaseline(db.select().from(takes).all(), language, row.createdAt)
    : null;
  const report = assembleSpeechReport({
    plan: saved.speechPlan,
    targetMs: saved.targetMs ?? saved.speechPlan?.targetMs ?? 0,
    analysis: parse<SpeechTakeAnalysis>(row.analysisJson, {
      durationMs: 0,
      syllableTimesMs: [],
      pauses: [],
      pitchSpreadSemitones: null,
      rmsDb: [],
    }),
    transcript,
    boundaries: parse<number[]>(row.boundariesJson, []),
    previous: parse<SpeechReport | null>(previous?.reportJson ?? null, null),
    settings: baseline ? { paceBands: { [language]: baseline } } : undefined,
  });
  updateSpeechTake(db, row.id, { reportJson: JSON.stringify(report) });
}

async function request(url: string, init: Parameters<typeof fetch>[1], timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

class PermanentTranscriptError extends Error {}

function transport(url: string, token: string): TranscriptTransport {
  const base = url.replace(/\/+$/, '');
  const headers = { Authorization: `Bearer ${token}` };
  return {
    async upload(job: TranscriptJob) {
      const response = await request(
        `${base}/v1/coach/transcribe?lang=${job.language}&take_id=${encodeURIComponent(job.takeId)}`,
        {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'audio/wav' },
          body: new File(job.path.startsWith('/') ? `file://${job.path}` : job.path),
        },
        180000,
      );
      if (response.status === 413 || response.status === 415)
        throw new PermanentTranscriptError(`HTTP ${response.status}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as { job_id: string; state: 'queued' };
    },
    async poll(jobId) {
      const response = await request(`${base}/v1/coach/transcripts/${encodeURIComponent(jobId)}`, {
        headers,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as TranscriptResult;
    },
  };
}
const analysisInFlight = new Map<string, Promise<void>>();
/** Share native analysis between the stop handler and lifecycle recovery. */
export async function ensureSpeechAnalysis(id: string): Promise<void> {
  const existing = analysisInFlight.get(id);
  if (existing) return existing;
  const run = (async () => {
    const db = getDb();
    let row = db.select().from(takes).where(eq(takes.id, id)).get();
    if (!row || row.kind !== 'speech' || !row.durationMs) return;
    if (!row.analysisJson) {
      persistAnalysis(db, id, await VcAudio.analyzeTake(row.fileUri));
      row = db.select().from(takes).where(eq(takes.id, id)).get();
      if (!row) return;
    }
    if (!row.reportJson) rebuildSpeechReport(row);
  })();
  analysisInFlight.set(id, run);
  try {
    await run;
  } finally {
    analysisInFlight.delete(id);
  }
}

const inFlight = new Map<string, Promise<void>>();
/** Serialize each take while allowing the open report to poll independently of older jobs. */
async function processTake(id: string): Promise<void> {
  const existing = inFlight.get(id);
  if (existing) return existing;
  const run = (async () => {
    const db = getDb();
    try {
      await ensureSpeechAnalysis(id);
    } catch {
      /* Analysis is retried on resume. */
    }
    let row = db.select().from(takes).where(eq(takes.id, id)).get();
    if (!row || row.kind !== 'speech') return;
    if (row.asrPath && !row.transcriptState) {
      updateSpeechTake(db, id, { transcriptState: 'pending' });
      row = db.select().from(takes).where(eq(takes.id, id)).get();
      if (!row) return;
    }
    if (!['pending', 'queued', 'running'].includes(row.transcriptState ?? '')) return;
    const pairing = await getPairing();
    if (!pairing.token || !row.asrPath) return;
    try {
      const plan = snapshot(row).speechPlan;
      const result = await advanceTranscript(
        {
          takeId: row.id,
          path: row.asrPath,
          language: plan?.lang ?? 'auto',
          jobId: row.transcriptJobId,
          state: row.transcriptState as TranscriptState,
        },
        transport(pairing.url, pairing.token),
      );
      updateSpeechTake(db, row.id, {
        transcriptState: result.state,
        transcriptJobId: result.jobId,
        ...(result.result ? { transcriptJson: JSON.stringify(result.result) } : {}),
      });
      const current = db.select().from(takes).where(eq(takes.id, row.id)).get();
      if (current && result.result) {
        rebuildSpeechReport(current);
        const later = db
          .select()
          .from(takes)
          .where(eq(takes.kind, 'speech'))
          .all()
          .filter((r) => r.planId === current.planId && r.createdAt > current.createdAt && r.analysisJson)
          .sort((a, b) => a.createdAt - b.createdAt);
        for (const take of later) rebuildSpeechReport(take);
      }
    } catch (error) {
      if (error instanceof PermanentTranscriptError) updateSpeechTake(db, id, { transcriptState: 'failed' });
      /* Other transport errors are retried at the next opportunity. */
    }
  })();
  inFlight.set(id, run);
  try {
    await run;
  } finally {
    inFlight.delete(id);
  }
}

/** Recover local analysis and advance persisted jobs; a report can request its own take. */
export async function processSpeechQueue(takeId?: string): Promise<void> {
  if (takeId) return processTake(takeId);
  const db = getDb();
  const rows = db.select().from(takes).where(eq(takes.kind, 'speech')).all();
  for (const row of rows) await processTake(row.id);
}
