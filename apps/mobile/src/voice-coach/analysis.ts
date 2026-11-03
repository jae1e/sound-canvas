import { summarizeTake, type Frame, type Lang, type TakeMode, type TakeSummary, type TargetSpec, type TimedWord } from '@vlc/voice-analysis';
import type { NativeContour } from '../../modules/vlc-voice-coach';

/** Columnar native contour -> Frame[] (unvoiced f0 stays null). */
export function contourToFrames(c: NativeContour): Frame[] {
  const out: Frame[] = [];
  for (let i = 0; i < c.t.length; i++) {
    out.push({ t: c.t[i]!, f0: c.f0[i] ?? null, voicing: c.voicing[i] ?? 0, rmsDb: c.rmsDb[i] ?? -120, centroid: c.centroid[i] ?? 0, hnrDb: c.hnrDb[i] ?? null });
  }
  return out;
}

export interface SummaryContext {
  mode: TakeMode;
  target: TargetSpec | null;
  transcript?: string;
  words?: TimedWord[];
  /** Language of the speech being practised (rate unit and filler list). */
  speechLang: Lang;
}

/** Summary for one take; `previous` is the previous take's summary for trend sentences. */
export function summarize(frames: Frame[], ctx: SummaryContext, previous?: TakeSummary | null): TakeSummary {
  return summarizeTake(
    { mode: ctx.mode, frames, target: ctx.target, transcript: ctx.transcript, words: ctx.words, speechLang: ctx.speechLang },
    previous?.metrics ?? null,
  );
}
