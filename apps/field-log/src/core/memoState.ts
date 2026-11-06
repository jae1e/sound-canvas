export interface MemoFacts {
  isRecording: boolean;
  segmentCount: number;
  /** Segments with a terminal transcript (done, including no speech). */
  segmentsDone: number;
  segmentsFailed: number;
  pendingEvents: number;
  pendingObjects: number;
}

export interface MemoTrust {
  recording: boolean;
  /** Everything is stored on the phone (nothing is being written). */
  savedOnPhone: boolean;
  /** The server has every event and every object (it verified the hashes). */
  synced: boolean;
  /** Every segment has a final transcript. */
  transcribed: boolean;
  failed: boolean;
  /** The highest state reached. */
  current: 'recording' | 'saved' | 'synced' | 'transcribed';
}

export function deriveMemoState(f: MemoFacts): MemoTrust {
  const savedOnPhone = !f.isRecording;
  const synced = savedOnPhone && f.pendingEvents === 0 && f.pendingObjects === 0;
  const transcribed = synced && f.segmentCount > 0 && f.segmentsDone === f.segmentCount;
  const current = f.isRecording ? 'recording' : transcribed ? 'transcribed' : synced ? 'synced' : 'saved';
  return { recording: f.isRecording, savedOnPhone, synced, transcribed, failed: f.segmentsFailed > 0, current };
}
