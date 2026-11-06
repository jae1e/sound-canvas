export type SegmentStatus = 'queued' | 'running' | 'done' | 'failed';

export interface FinalSeg {
  segmentId: string;
  index: number;
  /** Start relative to the recording start. */
  startMs: number;
  durationMs: number;
  status: SegmentStatus;
  text: string;
  noSpeech: boolean;
}

export interface DraftUtt {
  utterance: number;
  text: string;
  /** Only finalised utterances have times (relative to the recording start). */
  startMs?: number;
  endMs?: number;
  partial: boolean;
}

export type MergedItem = { kind: 'final'; seg: FinalSeg } | { kind: 'draft'; utt: DraftUtt };

export function hasFinalText(seg: FinalSeg): boolean {
  return seg.status === 'done' && !seg.noSpeech && seg.text.trim().length > 0;
}

/** Segment k starts at start_elapsed_us - recording start, or else at the sum of earlier durations. */
export function segmentStartsMs(
  segs: { index: number; durationMs: number; startElapsedUs?: number }[],
  recordingStartElapsedUs?: number,
): number[] {
  const order = segs.map((s, i) => i).sort((a, b) => segs[a].index - segs[b].index);
  const starts = new Array<number>(segs.length).fill(0);
  let acc = 0;
  for (const i of order) {
    const s = segs[i];
    starts[i] =
      recordingStartElapsedUs !== undefined && s.startElapsedUs !== undefined
        ? Math.max(0, Math.round((s.startElapsedUs - recordingStartElapsedUs) / 1000))
        : acc;
    acc += s.durationMs;
  }
  return starts;
}

/**
 * Final segments plus the draft utterances not yet replaced. A finalised draft is hidden when a
 * final segment with text covers its midpoint. Partials have no times: they are the live tail and
 * are shown only while the recording is active.
 */
export function mergeTranscript(segs: FinalSeg[], drafts: DraftUtt[], recordingActive: boolean): MergedItem[] {
  const covered = (mid: number) =>
    segs.some((s) => hasFinalText(s) && mid >= s.startMs && mid < s.startMs + s.durationMs);
  const items: { key: number; order: number; item: MergedItem }[] = [];
  for (const seg of [...segs].sort((a, b) => a.index - b.index)) {
    items.push({ key: seg.startMs, order: 0, item: { kind: 'final', seg } });
  }
  let tail = Number.MAX_SAFE_INTEGER;
  for (const utt of [...drafts].sort((a, b) => a.utterance - b.utterance)) {
    if (utt.text.trim().length === 0) continue;
    if (utt.partial || utt.startMs === undefined || utt.endMs === undefined) {
      if (recordingActive) items.push({ key: tail++, order: 1, item: { kind: 'draft', utt } });
      continue;
    }
    if (covered((utt.startMs + utt.endMs) / 2)) continue;
    items.push({ key: utt.startMs, order: 1, item: { kind: 'draft', utt } });
  }
  return items.sort((a, b) => a.key - b.key || a.order - b.order).map((x) => x.item);
}
