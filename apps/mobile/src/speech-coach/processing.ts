import { desc, eq } from 'drizzle-orm';
import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import type { SpeechPlan, SpeechReport, SpeechTakeAnalysis, SpeechTranscript } from '@vlc/voice-analysis';
import VcAudio from '../../modules/vc-audio/src/VcAudioModule';
import { getDb } from '../db/client';
import { takes } from '../db/schema';
import { loadSettings } from '../db/repos/settings';
import { speechBaseline } from './baseline';
import { listPendingTranscripts, updateSpeechTake } from '../db/repos/speech';
import { persistAnalysis } from '../recorder/takePersistence';
import { getPairing } from '../update/pairing';
import { advanceTranscript, type TranscriptJob, type TranscriptResult, type TranscriptState, type TranscriptTransport } from './transcriptQueue';
import { assembleSpeechReport } from './reportAssembly';

type Row = typeof takes.$inferSelect;
function parse<T>(raw: string | null, fallback: T): T { try { return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; } }
function snapshot(row: Row): { speechPlan: SpeechPlan | null; targetMs: number } {
  return parse(row.beatJson, { speechPlan: null, targetMs: 0 });
}
export function rebuildSpeechReport(row: Row): void {
  if (!row.analysisJson) return;
  const db = getDb();
  const previous = db.select().from(takes).where(eq(takes.kind, 'speech')).orderBy(desc(takes.createdAt)).all()
    .find((other) => other.planId === row.planId && other.id !== row.id && other.createdAt < row.createdAt && other.reportJson);
  const saved = snapshot(row);
  const result = parse<TranscriptResult | null>(row.transcriptJson, null);
  const transcript: SpeechTranscript | null = result?.state === 'done' ? { text: result.text ?? '', words: result.words, language: result.language ?? undefined } : null;
  const language = saved.speechPlan?.lang === 'en' ? 'en' : saved.speechPlan?.lang === 'ko' ? 'ko' : (transcript?.language ?? 'ko');
  const baseline = loadSettings(db).learnSpeechBaseline ? speechBaseline(db.select().from(takes).all(), language, row.createdAt) : null;
  const report = assembleSpeechReport({ plan: saved.speechPlan, targetMs: saved.targetMs ?? saved.speechPlan?.targetMs ?? 0,
    analysis: parse<SpeechTakeAnalysis>(row.analysisJson, { durationMs: 0, syllableTimesMs: [], pauses: [], pitchSpreadSemitones: null, rmsDb: [] }),
    transcript, boundaries: parse<number[]>(row.boundariesJson, []), previous: parse<SpeechReport | null>(previous?.reportJson ?? null, null), settings: baseline ? { paceBands: { [language]: baseline } } : undefined });
  updateSpeechTake(db, row.id, { reportJson: JSON.stringify(report) });
}

function transport(url: string, token: string): TranscriptTransport {
  const base = url.replace(/\/+$/, '');
  const headers = { Authorization: `Bearer ${token}` };
  return {
    async upload(job: TranscriptJob) {
      const response = await fetch(`${base}/v1/coach/transcribe?lang=${job.language}&take_id=${encodeURIComponent(job.takeId)}`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'audio/wav' }, body: new File(job.path.startsWith('/') ? `file://${job.path}` : job.path),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json() as { job_id: string; state: 'queued' };
    },
    async poll(jobId) {
      const response = await fetch(`${base}/v1/coach/transcripts/${encodeURIComponent(jobId)}`, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json() as TranscriptResult;
    },
  };
}
let inFlight: Promise<void> | null = null;
/** Recover local analysis and advance each persisted job once. Network failures stay retryable. */
export function processSpeechQueue(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const db = getDb();
    for (const row of db.select().from(takes).where(eq(takes.kind, 'speech')).all()) {
      if (!row.durationMs || !row.asrPath) continue;
      try {
        if (!row.analysisJson) persistAnalysis(db, row.id, await VcAudio.analyzeTake(row.fileUri));
        const current = db.select().from(takes).where(eq(takes.id, row.id)).get();
        if (current && !current.reportJson) rebuildSpeechReport(current);
      } catch { /* Retried on resume. */ }
    }
    const pairing = await getPairing();
    if (!pairing.token) return;
    const client = transport(pairing.url, pairing.token);
    for (const row of listPendingTranscripts(db)) {
      try {
        const plan = snapshot(row).speechPlan;
        const result = await advanceTranscript({ takeId: row.id, path: row.asrPath!, language: plan?.lang ?? 'auto', jobId: row.transcriptJobId, state: row.transcriptState as TranscriptState }, client);
        updateSpeechTake(db, row.id, { transcriptState: result.state, transcriptJobId: result.jobId, ...(result.result ? { transcriptJson: JSON.stringify(result.result) } : {}) });
        const current = db.select().from(takes).where(eq(takes.id, row.id)).get();
        if (current && result.result) rebuildSpeechReport(current);
      } catch { /* Offline and transport errors are retried at the next opportunity. */ }
    }
  })().finally(() => { inFlight = null; });
  return inFlight;
}
