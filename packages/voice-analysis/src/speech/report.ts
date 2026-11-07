import type {
  SpeechPlan,
  SpeechReport,
  SpeechSettings,
  SpeechTakeAnalysis,
  SpeechTranscript,
  SpeechMetricTile,
} from './types';
import {
  classifyIntonation,
  classifyPace,
  countTranscriptFillers,
  DEFAULT_PACE_BANDS,
  estimateAudioFillers,
  longPauses,
  paceBand,
  resolveSpeechLanguage,
  transcriptRates,
} from './metrics';
import { analyzeSections } from './sections';
import { alignScript } from './alignment';

/** Localizable one-action templates; params are populated by buildSpeechReport. */
export const NEXT_ACTION_TEMPLATES = {
  ko: {
    'section-over': '{section} 섹션이 계획보다 {overMs}ms 길었어요. 핵심을 줄여보세요.',
    pace: '말하기 속도가 목표 범위를 벗어났어요. 한 구절씩 천천히 연습해 보세요.',
    fillers: '군말이 {count}회 있었어요. 군말 대신 짧게 멈춰 보세요.',
    pauses: '긴 멈춤이 {count}회 있었어요. 다음 문장을 미리 생각해 보세요.',
    intonation: '음높이 변화가 적어요. 핵심 단어를 강조해 보세요.',
    'key-points': '빠진 핵심 포인트가 있어요. 다음에는 메모를 확인해 보세요.',
    'keep-going': '좋은 흐름이에요. 같은 방식으로 한 번 더 연습해 보세요.',
  },
  en: {
    'section-over': 'The {section} section ran {overMs}ms over its budget. Try shortening its key points.',
    pace: 'Your speaking pace was outside the target band. Practise one phrase at a time.',
    fillers: 'You used {count} fillers. Try a short pause instead.',
    pauses: 'There were {count} long pauses. Preview your next sentence.',
    intonation: 'Your pitch variation was low. Emphasize a few key words.',
    'key-points': 'Some key points were missed. Check your notes next time.',
    'keep-going': 'Good flow. Practise it once more the same way.',
  },
} as const;
/** Previous report may be retained by the app between takes. */
export type PreviousSpeechReport = Pick<SpeechReport, 'tiles'>;
/** Build a deterministic speech-coach report. With no transcript, text-derived fields stay empty and can be recomputed when the transcript arrives. */
export function buildSpeechReport(
  plan: SpeechPlan | null,
  analysis: SpeechTakeAnalysis,
  transcript: SpeechTranscript | null,
  boundariesMs: number[],
  previousReport: PreviousSpeechReport | null,
  settings: SpeechSettings = {},
): SpeechReport {
  const targetMs = plan?.targetMs ?? 0,
    lang = resolveSpeechLanguage(plan?.lang ?? 'auto', transcript),
    words = transcript?.words ?? [],
    rates = transcript ? transcriptRates(words, lang, analysis.durationMs) : null;
  const estimatedPace =
    analysis.durationMs > 0 ? analysis.syllableTimesMs.length / (analysis.durationMs / 1000) : null;
  const pace = transcript
    ? (rates?.speakingRate ?? null)
    : lang === 'ko'
      ? estimatedPace
      : estimatedPace === null
        ? null
        : (estimatedPace * 60) / (settings.syllablesPerEnglishWord ?? 1.5);
  const band = paceBand(lang, settings),
    paceStatus = pace === null ? null : classifyPace(pace, band),
    textFillers = transcript ? countTranscriptFillers(words, lang, settings.fillers?.[lang]).total : null,
    audioFillers = estimateAudioFillers(analysis, transcript),
    fillers = textFillers === null ? (transcript ? audioFillers : null) : textFillers + audioFillers,
    pauses = longPauses(words, analysis.pauses),
    intonation = classifyIntonation(analysis.pitchSpreadSemitones);
  const tile = (
    value: number | null,
    unit: string,
    good: boolean | null,
    old: number | null | undefined,
  ): SpeechMetricTile => ({
    value,
    unit,
    status: good === false ? 'caution' : 'good',
    deltaVsPrevious: value === null || old == null ? null : value - old,
  });
  const tiles = {
    pace: tile(
      pace,
      rates?.unit ?? (lang === 'ko' ? 'syl/s' : 'wpm'),
      paceStatus === 'good',
      previousReport?.tiles.pace.value,
    ),
    fillers: tile(
      fillers,
      'count',
      fillers !== null && fillers <= Math.max(2, Math.ceil((words.length || 1) * 0.03)),
      previousReport?.tiles.fillers.value,
    ),
    pauses: tile(pauses.length, 'pauses', pauses.length === 0, previousReport?.tiles.pauses.value),
    intonation: tile(
      analysis.pitchSpreadSemitones,
      'semitones',
      intonation === 'good' || intonation === 'unknown',
      previousReport?.tiles.intonation.value,
    ),
  };
  const sections = plan
    ? analyzeSections(plan, analysis.durationMs, transcript, boundariesMs, lang, settings.keyPointThreshold)
    : [];
  const durationMs = Math.max(0, analysis.durationMs),
    timeVerdict =
      targetMs <= 0 ? 'ok' : durationMs < targetMs * 0.9 ? 'under' : durationMs > targetMs ? 'over' : 'ok';
  let action: { code: string; params: Record<string, string | number> } = { code: 'keep-going', params: {} };
  const over = sections.find((s) => s.budgetMs !== null && s.actualMs > s.budgetMs);
  if (over)
    action = { code: 'section-over', params: { section: over.name, overMs: over.actualMs - over.budgetMs! } };
  else if (paceStatus && paceStatus !== 'good')
    action = { code: 'pace', params: { pace: pace!, unit: tiles.pace.unit } };
  else if (fillers !== null && fillers > Math.max(2, Math.ceil((words.length || 1) * 0.03)))
    action = { code: 'fillers', params: { count: fillers } };
  else if (pauses.length) action = { code: 'pauses', params: { count: pauses.length } };
  else if (intonation === 'monotone')
    action = { code: 'intonation', params: { semitones: analysis.pitchSpreadSemitones ?? 0 } };
  else if (sections.some((s) => s.missed.length))
    action = { code: 'key-points', params: { count: sections.reduce((n, s) => n + s.missed.length, 0) } };
  const transcriptMarks = transcript
    ? [
        ...countTranscriptFillers(words, lang, settings.fillers?.[lang]).indices.map((wordIndex) => ({
          type: 'filler' as const,
          wordIndex,
        })),
        ...pauses.map((p) => ({ type: 'pause' as const, durationMs: p.durationMs })),
      ]
    : [];
  // Script alignment is exposed as a helper; the report contract has no alignment field in this revision.
  if (plan?.script && transcript) alignScript(plan.script, transcript.text);
  return {
    durationMs,
    targetMs,
    timeVerdict,
    tiles,
    sections,
    nextAction: action,
    transcriptMarks,
    transcriptAvailable: transcript !== null,
  };
}

/** Public defaults as immutable-shaped reference for consumers that want to render the bands. */
export const SPEECH_DEFAULT_BANDS = DEFAULT_PACE_BANDS;
