/** The persisted job state is the source of truth. Uploads are idempotent by take ID. */
export type TranscriptState = 'pending' | 'queued' | 'running' | 'done' | 'no_speech' | 'failed';
export interface TranscriptJob {
  takeId: string;
  path: string;
  language: 'ko' | 'en' | 'auto';
  jobId: string | null;
  state: TranscriptState;
}
export interface TranscriptResult {
  job_id: string;
  take_id: string;
  state: Exclude<TranscriptState, 'pending'>;
  language: 'ko' | 'en' | null;
  text: string | null;
  words: { w: string; start_ms: number; end_ms: number }[];
  duration_ms: number | null;
  error: string | null;
}
export interface TranscriptTransport {
  upload(job: TranscriptJob): Promise<{ job_id: string; state: 'queued' }>;
  poll(jobId: string): Promise<TranscriptResult>;
}
export type QueueUpdate = { state: TranscriptState; jobId: string | null; result?: TranscriptResult };

/** One step only: failures leave the persisted state untouched and can be retried on resume. */
export async function advanceTranscript(job: TranscriptJob, transport: TranscriptTransport): Promise<QueueUpdate> {
  if (job.state === 'done' || job.state === 'no_speech' || job.state === 'failed')
    return { state: job.state, jobId: job.jobId };
  if (!job.jobId) {
    const response = await transport.upload(job);
    if (!response.job_id || response.state !== 'queued') throw new Error('Invalid transcription response');
    return { state: 'queued', jobId: response.job_id };
  }
  const result = await transport.poll(job.jobId);
  if (result.job_id !== job.jobId || result.take_id !== job.takeId ||
      !['queued', 'running', 'done', 'no_speech', 'failed'].includes(result.state))
    throw new Error('Invalid transcription result');
  return { state: result.state, jobId: job.jobId, result };
}
