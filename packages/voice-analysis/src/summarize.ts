import { analyzeFrames, silenceThresholdDb, type TakeMetrics } from './analysis';
import { noteName } from './notes';
import { countFillers, rateFromEnergy, rateFromWords, type FillerCount, type SpeakingRate } from './speech';
import type { Frame, Lang, TakeMode, TargetSpec, TimedWord } from './types';

export interface TakeInput {
  mode: TakeMode;
  frames: Frame[];
  target?: TargetSpec | null;
  /** Transcript from the app's STT (speech mode). */
  transcript?: string;
  /** Word timestamps from the app's STT; preferred over energy peaks when present. */
  words?: TimedWord[];
  /** Language of the transcript and of the speaking-rate unit. */
  speechLang?: Lang;
}

export interface SpeechMetrics {
  rate: SpeakingRate | null;
  fillers: FillerCount | null;
}

export interface TakeSummary {
  mode: TakeMode;
  metrics: TakeMetrics;
  speech: SpeechMetrics | null;
  /** Short, objective sentences in each language, without medical claims. */
  lines: Record<Lang, string[]>;
  /** The lines joined for display or for the app's TTS. */
  text: Record<Lang, string>;
}

const f0 = (n: number) => Math.round(n).toString();
const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

function targetLabel(t: TargetSpec): { single: string | null } {
  return { single: t.notes.length === 1 ? noteName(t.notes[0]!.midi) : null };
}

/**
 * Builds metrics and short spoken feedback for one take. `previous` (metrics of the prior take of the same
 * kind) enables trend sentences. Tone values (brightness, breathiness) are heuristic and are only ever reported as
 * relative changes between takes.
 */
export function summarizeTake(input: TakeInput, previous?: TakeMetrics | null): TakeSummary {
  const metrics = analyzeFrames(input.frames, input.target);
  const lines: Record<Lang, string[]> = { ko: [], en: [] };
  let speech: SpeechMetrics | null = null;
  const push = (ko: string, en: string) => {
    lines.ko.push(ko);
    lines.en.push(en);
  };

  if (metrics.voicedRatio < 0.05 && metrics.durationS > 0 && input.mode === 'practice') {
    push('소리가 거의 감지되지 않았어요. 마이크와 음량을 확인해 주세요.', 'I barely detected any voiced sound. Check the microphone and your volume.');
  } else if (input.mode === 'practice') {
    practiceLines(input, metrics, previous ?? null, push);
  } else {
    speech = speechLines(input, metrics, previous ?? null, push);
  }
  return { mode: input.mode, metrics, speech, lines, text: { ko: lines.ko.join(' '), en: lines.en.join(' ') } };
}

function practiceLines(input: TakeInput, m: TakeMetrics, prev: TakeMetrics | null, push: (ko: string, en: string) => void): void {
  const sd = m.stability.sdCents;
  if (input.target && m.target) {
    const { single } = targetLabel(input.target);
    const p25 = f0(m.target.within25Pct);
    if (single) {
      push(`목표 음 ${single}: 시간의 ${p25}% 동안 ±25센트 이내로 유지했어요.`, `Your ${single} held within ±25 cents for ${p25}% of the time.`);
    } else {
      push(`목표 음 순서에서 ±25센트 이내가 ${p25}%, ±50센트 이내가 ${f0(m.target.within50Pct)}%였어요.`, `You were within ±25 cents of the target sequence for ${p25}% of the time, and within ±50 cents for ${f0(m.target.within50Pct)}%.`);
    }
    const bias = m.target.meanSignedCents;
    if (bias !== null && Math.abs(bias) >= 15) {
      push(bias > 0 ? `평균적으로 목표보다 약 ${f0(bias)}센트 높았어요.` : `평균적으로 목표보다 약 ${f0(-bias)}센트 낮았어요.`, bias > 0 ? `On average you were about ${f0(bias)} cents above the target.` : `On average you were about ${f0(-bias)} cents below the target.`);
    }
  } else if (sd !== null) {
    push(`길게 낸 음의 음정 흔들림은 평균 ${f0(sd)}센트였어요.`, `Held notes varied by about ${f0(sd)} cents (SD) on average.`);
  }
  if (m.range) {
    push(`안정적으로 낸 음역은 ${m.range.low}부터 ${m.range.high}까지예요.`, `Your stable range was ${m.range.low} to ${m.range.high}.`);
  }
  if (prev) {
    if (m.target && prev.target && Math.abs(m.target.within25Pct - prev.target.within25Pct) >= 5) {
      const d = m.target.within25Pct - prev.target.within25Pct;
      push(d > 0 ? `목표 적중률이 지난 테이크보다 ${f0(d)}%p 올랐어요.` : `목표 적중률이 지난 테이크보다 ${f0(-d)}%p 낮아졌어요.`, d > 0 ? `Target accuracy is up ${f0(d)} points from the last take.` : `Target accuracy is down ${f0(-d)} points from the last take.`);
    } else if (sd !== null && prev.stability.sdCents !== null && Math.abs(sd - prev.stability.sdCents) >= Math.max(1, 0.1 * prev.stability.sdCents)) {
      const better = sd < prev.stability.sdCents;
      push(better ? '지난 테이크보다 음정이 더 안정적이에요.' : '지난 테이크보다 음정 흔들림이 조금 커졌어요.', better ? 'Stability improved since the last take.' : 'Stability was a bit lower than in the last take.');
    }
    toneTrend(m, prev, push);
  }
}

function toneTrend(m: TakeMetrics, prev: TakeMetrics, push: (ko: string, en: string) => void): void {
  if (m.brightnessHz !== null && prev.brightnessHz !== null && prev.brightnessHz > 0) {
    const r = m.brightnessHz / prev.brightnessHz;
    if (r >= 1.15) push('음색은 지난 테이크보다 밝은 편이에요(추정치).', 'Tone is brighter than the last take (heuristic).');
    else if (r <= 0.87) push('음색은 지난 테이크보다 어두운 편이에요(추정치).', 'Tone is darker than the last take (heuristic).');
  }
  if (m.hnrDb !== null && prev.hnrDb !== null && Math.abs(m.hnrDb - prev.hnrDb) >= 3) {
    push(m.hnrDb > prev.hnrDb ? '소리가 지난 테이크보다 더 맑은 편이에요(추정치).' : '소리에 바람 섞인 느낌이 지난 테이크보다 더 많아요(추정치).', m.hnrDb > prev.hnrDb ? 'The sound is cleaner than the last take (heuristic).' : 'The sound is breathier than the last take (heuristic).');
  }
}

function speechLines(input: TakeInput, m: TakeMetrics, prev: TakeMetrics | null, push: (ko: string, en: string) => void): SpeechMetrics {
  const lang: Lang = input.speechLang ?? 'ko';
  const rate = input.words && input.words.length >= 2 ? rateFromWords(input.words, lang) : rateFromEnergy(input.frames, lang, silenceThresholdDb(input.frames));
  const fillers = input.transcript !== undefined ? countFillers(input.transcript, lang) : null;
  if (rate) {
    const v = rate.unit === 'wpm' ? f0(rate.value) : f1(rate.value);
    const unitKo = rate.unit === 'wpm' ? '단어' : '음절';
    const approx = rate.estimated;
    if (rate.unit === 'wpm') {
      push(`말하기 속도는 분당 ${approx ? '약 ' : ''}${v}단어예요.`, `Your speaking rate was ${approx ? 'about ' : ''}${v} words per minute.`);
    } else {
      push(`말하기 속도는 초당 ${approx ? '약 ' : ''}${v}${unitKo}예요.`, `Your speaking rate was ${approx ? 'about ' : ''}${v} syllables per second.`);
    }
  }
  if (m.pauses.count > 0) {
    push(`쉬는 구간이 ${m.pauses.count}번, 합쳐서 ${f1(m.pauses.totalS)}초였어요.`, `You paused ${m.pauses.count} time${m.pauses.count === 1 ? '' : 's'}, ${f1(m.pauses.totalS)} seconds in total.`);
  } else {
    push('눈에 띄는 쉼 없이 이어서 말했어요.', 'You spoke without noticeable pauses.');
  }
  if (fillers) {
    push(fillers.total > 0 ? `군말은 ${fillers.total}번 감지됐어요.` : '군말은 감지되지 않았어요.', fillers.total > 0 ? `I counted ${fillers.total} filler word${fillers.total === 1 ? '' : 's'}.` : 'I counted no filler words.');
  }
  if (m.loudness.meanDb !== null && m.loudness.sdDb !== null) {
    push(`평균 음량은 ${f0(m.loudness.meanDb)} dBFS, 변동은 ${f1(m.loudness.sdDb)} dB예요.`, `Loudness averaged ${f0(m.loudness.meanDb)} dBFS with a spread of ${f1(m.loudness.sdDb)} dB.`);
  }
  if (prev) toneTrend(m, prev, push);
  return { rate, fillers };
}
