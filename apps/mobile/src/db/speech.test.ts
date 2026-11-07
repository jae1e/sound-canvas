import { describe, expect, it } from 'vitest';
import { createTestDb } from './testDb';
import { takes } from './schema';
import {
  incrementSpeechPractice,
  listPendingTranscripts,
  listSpeechPlans,
  saveSpeechPlan,
  updateSpeechTake,
} from './repos/speech';

describe('speech store', () => {
  it('persists plans and keeps practice counts when edited', async () => {
    const db = await createTestDb();
    const plan = {
      id: 'p',
      title: 'Talk',
      kind: 'plan' as const,
      lang: 'ko' as const,
      targetMs: 60000,
      sections: [],
      script: null,
      promptId: null,
      createdAt: 1,
      updatedAt: 1,
      practiceCount: 0,
    };
    saveSpeechPlan(db, plan);
    incrementSpeechPractice(db, 'p');
    saveSpeechPlan(db, { ...plan, title: 'Edited', updatedAt: 2 });
    expect(listSpeechPlans(db)[0]).toMatchObject({ title: 'Edited', practiceCount: 1 });
  });
  it('persists pending transcript state across queries', async () => {
    const db = await createTestDb();
    db.insert(takes)
      .values({ id: 't', kind: 'speech', fileUri: '/t.wav', asrPath: '/asr.wav', createdAt: 1 })
      .run();
    updateSpeechTake(db, 't', { transcriptState: 'pending', planId: 'p' });
    expect(listPendingTranscripts(db)).toHaveLength(1);
    updateSpeechTake(db, 't', { transcriptState: 'done', transcriptJson: '{}' });
    expect(listPendingTranscripts(db)).toHaveLength(0);
  });
});
