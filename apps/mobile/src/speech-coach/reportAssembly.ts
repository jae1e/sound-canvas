import { buildSpeechReport, type SpeechPlan, type SpeechReport, type SpeechTakeAnalysis, type SpeechTranscript } from '@vlc/voice-analysis';

/** Build from the take's immutable plan snapshot, so later edits do not change historical results. */
export function assembleSpeechReport(input: { plan: SpeechPlan | null; targetMs: number; analysis: SpeechTakeAnalysis; transcript: SpeechTranscript | null; boundaries: number[]; previous: SpeechReport | null }): SpeechReport {
  const plan = input.plan ? { ...input.plan, targetMs: input.targetMs } : input.targetMs ? { id: '', title: '', kind: 'free' as const, lang: 'auto' as const, targetMs: input.targetMs, sections: [], script: null } : null;
  return buildSpeechReport(plan, input.analysis, input.transcript, input.boundaries, input.previous);
}
