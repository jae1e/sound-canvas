import { describe, expect, it, vi } from 'vitest';
import { advanceTranscript, type TranscriptJob, type TranscriptTransport } from './transcriptQueue';

const job: TranscriptJob = {
  takeId: 'take',
  path: '/asr.wav',
  language: 'auto',
  jobId: null,
  state: 'pending',
};

describe('transcription queue step', () => {
  it('uploads once and polls the persisted job on the next step', async () => {
    const transport: TranscriptTransport = {
      upload: vi.fn().mockResolvedValue({ job_id: 'job', state: 'queued' }),
      poll: vi
        .fn()
        .mockResolvedValue({
          job_id: 'job',
          take_id: 'take',
          state: 'done',
          language: 'ko',
          text: '안녕',
          words: [],
          duration_ms: 1000,
          error: null,
        }),
    };
    const uploaded = await advanceTranscript(job, transport);
    expect(uploaded).toEqual({ state: 'queued', jobId: 'job' });
    const completed = await advanceTranscript({ ...job, ...uploaded }, transport);
    expect(completed.result?.text).toBe('안녕');
    expect(transport.upload).toHaveBeenCalledTimes(1);
  });
  it('leaves a network failure retryable and rejects mismatched jobs', async () => {
    const transport: TranscriptTransport = {
      upload: vi.fn().mockRejectedValue(new Error('offline')),
      poll: vi.fn().mockResolvedValue({ job_id: 'other', take_id: 'take', state: 'done' }),
    };
    await expect(advanceTranscript(job, transport)).rejects.toThrow('offline');
    expect(job.state).toBe('pending');
    await expect(advanceTranscript({ ...job, jobId: 'job', state: 'queued' }, transport)).rejects.toThrow(
      'Invalid',
    );
  });
  it('rejects incomplete completed transcripts without committing a terminal state', async () => {
    const transport: TranscriptTransport = {
      upload: vi.fn(),
      poll: vi.fn().mockResolvedValue({ job_id: 'job', take_id: 'take', state: 'done', words: null }),
    };
    const queued: TranscriptJob = { ...job, jobId: 'job', state: 'running' };
    await expect(advanceTranscript(queued, transport)).rejects.toThrow('Invalid');
    expect(queued.state).toBe('running');
  });
  it('does not retry terminal jobs', async () => {
    const transport: TranscriptTransport = { upload: vi.fn(), poll: vi.fn() };
    expect(await advanceTranscript({ ...job, state: 'failed', jobId: 'job' }, transport)).toEqual({
      state: 'failed',
      jobId: 'job',
    });
    expect(transport.poll).not.toHaveBeenCalled();
  });
});
