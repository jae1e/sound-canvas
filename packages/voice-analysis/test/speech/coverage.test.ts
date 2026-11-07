import { describe, expect, it, vi } from 'vitest';
import {
  alignScript,
  analyzeSections,
  autoSplitBudgets,
  buildSpeechReport,
  classifyIntonation,
  classifyPace,
  countSectionPauses,
  countKoreanSpeechSyllables,
  countTranscriptFillers,
  DEFAULT_PACE_BANDS,
  estimateAudioFillers,
  estimateEnglishSyllables,
  IMPROMPTU_TOPICS,
  INTERVIEW_QUESTIONS,
  keyPointCovered,
  learnBaseline,
  longPauses,
  normalizeKeyPointToken,
  pickRandom,
  rollingEnglishWpm,
  rollingPace,
  repeatedWordIndices,
  resolveSpeechLanguage,
  paceBand,
  transcriptRates,
} from '../../src';
import type { SpeechPlan, SpeechTakeAnalysis, SpeechTranscript, SpeechWord } from '../../src/speech/types';

function makePlan(overrides: Partial<SpeechPlan> = {}): SpeechPlan {
  return {
    id: 'plan',
    title: 'Practice',
    targetMs: 60_000,
    lang: 'en',
    kind: 'plan',
    script: null,
    sections: [{ id: 'one', name: 'One', keyPoints: ['main idea'], budgetMs: null }],
    ...overrides,
  };
}

function makeAnalysis(overrides: Partial<SpeechTakeAnalysis> = {}): SpeechTakeAnalysis {
  return {
    durationMs: 60_000,
    syllableTimesMs: [],
    pauses: [],
    pitchSpreadSemitones: 6,
    rmsDb: [],
    tMs: [],
    midi: [],
    ...overrides,
  };
}

function word(w: string, start_ms: number, end_ms: number): SpeechWord {
  return { w, start_ms, end_ms };
}

function makeEnglishTranscript(words: string[], durationMs: number): SpeechTranscript {
  const step = durationMs / words.length;
  return {
    text: words.join(' '),
    language: 'en',
    words: words.map((w, index) => word(w, index * step, (index + 1) * step - 5)),
  };
}

describe('autoSplitBudgets edge cases', () => {
  it('splits proportionally by key-point count', () => {
    const plan = makePlan({
      sections: [
        { id: 'a', name: 'A', keyPoints: ['one'], budgetMs: null },
        { id: 'b', name: 'B', keyPoints: ['one', 'two', 'three'], budgetMs: null },
      ],
    });
    const split = autoSplitBudgets(plan);
    expect(split.sections.map((section) => section.budgetMs)).toEqual([15_000, 45_000]);
  });

  it('applies the 15-second minimum when the target permits it', () => {
    const plan = makePlan({
      targetMs: 60_000,
      sections: Array.from({ length: 4 }, (_, index) => ({
        id: String(index),
        name: String(index),
        keyPoints: index === 0 ? ['a', 'b', 'c', 'd'] : [],
        budgetMs: null,
      })),
    });
    expect(autoSplitBudgets(plan).sections.every((section) => section.budgetMs! >= 15_000)).toBe(true);
  });

  it('rounds proportional sections to five-second units when no remainder is needed', () => {
    const plan = makePlan({
      targetMs: 90_000,
      sections: [
        { id: 'a', name: 'A', keyPoints: ['a'], budgetMs: null },
        { id: 'b', name: 'B', keyPoints: ['b', 'c'], budgetMs: null },
      ],
    });
    expect(autoSplitBudgets(plan).sections.map((section) => section.budgetMs)).toEqual([30_000, 60_000]);
  });

  it('makes the section budgets sum exactly to the plan target', () => {
    const split = autoSplitBudgets(makePlan({ targetMs: 125_000 }));
    expect(split.sections.reduce((sum, section) => sum + section.budgetMs!, 0)).toBe(125_000);
  });

  it('preserves fixed budgets and allocates the remainder to null budgets', () => {
    const plan = makePlan({
      sections: [
        { id: 'a', name: 'A', keyPoints: ['a'], budgetMs: 20_000 },
        { id: 'b', name: 'B', keyPoints: ['b'], budgetMs: null },
      ],
    });
    expect(autoSplitBudgets(plan).sections.map((section) => section.budgetMs)).toEqual([20_000, 40_000]);
  });

  it('returns an independent copy when every section has a fixed budget', () => {
    const plan = makePlan({ sections: [{ id: 'a', name: 'A', keyPoints: [], budgetMs: 60_000 }] });
    const split = autoSplitBudgets(plan);
    expect(split).not.toBe(plan);
    expect(split.sections[0]).not.toBe(plan.sections[0]);
    expect(split.sections[0]!.budgetMs).toBe(60_000);
  });

  it('gives zero-key-point sections equal fallback weight', () => {
    const plan = makePlan({
      sections: [
        { id: 'a', name: 'A', keyPoints: [], budgetMs: null },
        { id: 'b', name: 'B', keyPoints: [], budgetMs: null },
      ],
    });
    expect(autoSplitBudgets(plan).sections.map((section) => section.budgetMs)).toEqual([30_000, 30_000]);
  });
});

describe('speech unit estimates and bands', () => {
  it.each([
    ['안녕', 2],
    ['2026', 4],
    ['AI', 1],
    ['안녕, AI!', 3],
    ['123abc', 4],
    ['!!!', 0],
  ])('counts Korean-style units in %s', (text, expected) => {
    expect(countKoreanSpeechSyllables(text)).toBe(expected);
  });

  it.each([
    ['hello', 2],
    ['world', 1],
    ['beautiful', 3],
    ['rhythm', 1],
    ['make', 1],
    ['table', 2],
    ['123', 0],
  ])('estimates English syllables in %s', (text, expected) => {
    expect(estimateEnglishSyllables(text)).toBe(expected);
  });

  it.each([
    [3.99, 'slow'],
    [4, 'good'],
    [5.5, 'good'],
    [5.51, 'fast'],
  ] as const)('classifies Korean pace %s at the band edge', (value, expected) => {
    expect(classifyPace(value, DEFAULT_PACE_BANDS.ko)).toBe(expected);
  });

  it('returns null for a baseline with fewer than three takes', () => {
    expect(learnBaseline([], 'ko')).toBeNull();
    expect(learnBaseline([4, 5], 'en')).toBeNull();
  });

  it('clamps learned pace bands to broad limits', () => {
    expect(learnBaseline([0, 0, 0], 'ko')).toEqual({ slowBelow: 2, fastAbove: 2 });
    expect(learnBaseline([500, 500, 500], 'en')).toEqual({ slowBelow: 240, fastAbove: 240 });
  });

  it('uses the minimum spread floor when takes are identical', () => {
    expect(learnBaseline([5, 5, 5], 'ko')).toEqual({ slowBelow: 4.5, fastAbove: 5.5 });
    expect(learnBaseline([140, 140, 140], 'en')).toEqual({ slowBelow: 125, fastAbove: 155 });
  });

  it('includes both rolling-window edges and excludes values outside the window', () => {
    expect(rollingPace([0, 1_000, 9_000, 10_000, 10_001], 10_000, 10_000)).toBe(0.4);
    expect(rollingPace([2_000], 1_000, 10_000)).toBe(0);
    expect(rollingPace([1], 1, 0)).toBe(0);
  });

  it('converts rolling syllable pace to estimated English WPM', () => {
    expect(rollingEnglishWpm(3)).toBe(120);
    expect(rollingEnglishWpm(3, 2)).toBe(90);
    expect(rollingEnglishWpm(3, 0)).toBe(0);
  });

  it('resolves explicit and automatic transcript languages', () => {
    expect(resolveSpeechLanguage('ko', { text: '', words: [], language: 'en' })).toBe('ko');
    expect(resolveSpeechLanguage('auto', { text: '', words: [], language: 'en' })).toBe('en');
    expect(resolveSpeechLanguage('auto', null)).toBe('ko');
  });

  it('uses per-language pace band overrides when present', () => {
    expect(paceBand('ko')).toEqual(DEFAULT_PACE_BANDS.ko);
    expect(paceBand('en', { paceBands: { en: { slowBelow: 100, fastAbove: 150 } } })).toEqual({
      slowBelow: 100,
      fastAbove: 150,
    });
  });

  it('separates transcript speaking and articulation rates using inter-word gaps', () => {
    const words = [word('one', 0, 500), word('two', 2_000, 2_500)];
    const rates = transcriptRates(words, 'en', 3_000);
    expect(rates.speakingRate).toBe(40);
    expect(rates.articulationRate).toBe(80);
    expect(rates.unit).toBe('wpm');
  });

  it('returns null transcript rates for an empty word list', () => {
    expect(transcriptRates([], 'ko')).toEqual({ speakingRate: null, articulationRate: null, unit: 'syl/s' });
  });
});

describe('filler, pause, repeat and intonation edge cases', () => {
  it.each([
    ['음', true],
    ['어', true],
    ['그', true],
    ['그는', false],
    ['저는', false],
    ['이제는', false],
    ['약간은', false],
    ['음음', true],
    ['어어', true],
    ['그으', true],
    ['어음', true],
    ['그것', false],
    ['그래서', false],
    ['그런데', false],
    ['저희', false],
    ['어제', false],
  ])('applies the Korean filler boundary to %s', (token, expected) => {
    const result = countTranscriptFillers([word(token, 0, 100)], 'ko');
    expect(result.total > 0).toBe(expected);
  });

  it('counts English multi-token fillers with case and punctuation normalization', () => {
    const words = [
      word('YOU', 0, 100),
      word('know,', 101, 200),
      word('I', 201, 300),
      word('mean.', 301, 400),
    ];
    const result = countTranscriptFillers(words, 'en');
    expect(result.total).toBe(2);
    expect(result.byFiller).toMatchObject({ 'you know': 1, 'I mean': 1 });
    expect(result.indices).toEqual([0, 2]);
  });

  it('does not match English filler substrings inside another word', () => {
    expect(countTranscriptFillers([word('someone', 0, 100)], 'en', ['one']).total).toBe(0);
  });

  it('deduplicates the same native and transcript pause', () => {
    const result = longPauses([word('a', 0, 500), word('b', 2_000, 2_500)], [{ startMs: 500, endMs: 2_000 }]);
    expect(result).toHaveLength(1);
    expect(result[0]!.durationMs).toBe(1_500);
  });

  it('finds transcript-only long gaps at the inclusive threshold', () => {
    expect(longPauses([word('a', 0, 100), word('b', 1_600, 1_700)])).toEqual([
      { startMs: 100, endMs: 1_600, durationMs: 1_500 },
    ]);
  });

  it('does not report pauses shorter than the threshold', () => {
    expect(longPauses([word('a', 0, 100), word('b', 1_599, 1_700)])).toEqual([]);
  });

  it('counts section pauses intersecting the section window', () => {
    expect(
      countSectionPauses(1_000, 5_000, [
        { startMs: 0, endMs: 1_000 },
        { startMs: 2_000, endMs: 3_500 },
        { startMs: 4_900, endMs: 5_100 },
        { startMs: 6_000, endMs: 8_000 },
      ]),
    ).toBe(1);
  });

  it('returns repeated word indices after punctuation normalization', () => {
    expect(repeatedWordIndices([word('Yes,', 0, 1), word('yes!', 1, 2), word('no', 2, 3)])).toEqual([0, 1]);
  });

  it('returns no repeated indices for empty or single-word lists', () => {
    expect(repeatedWordIndices([])).toEqual([]);
    expect(repeatedWordIndices([word('one', 0, 1)])).toEqual([]);
  });

  it('counts a flat short voiced segment in a word gap', () => {
    const analysis = makeAnalysis({
      tMs: [0, 100, 200, 300, 400],
      rmsDb: [-60, -20, -20, -20, -60],
      midi: [null, 60, 60.2, 60.1, null],
    });
    const transcript: SpeechTranscript = {
      text: 'a b',
      words: [word('a', 0, 50), word('b', 450, 500)],
    };
    expect(estimateAudioFillers(analysis, transcript)).toBe(1);
  });

  it('rejects a short voiced segment with moving pitch', () => {
    const analysis = makeAnalysis({
      tMs: [0, 100, 200, 300, 400],
      rmsDb: [-60, -20, -20, -20, -60],
      midi: [null, 60, 63, 60, null],
    });
    const transcript: SpeechTranscript = {
      text: 'a b',
      words: [word('a', 0, 50), word('b', 450, 500)],
    };
    expect(estimateAudioFillers(analysis, transcript)).toBe(0);
  });

  it('returns no audio filler estimate when contour is missing', () => {
    const analysis = makeAnalysis({ tMs: [0, 100], rmsDb: [-20, -20] });
    expect(
      estimateAudioFillers(analysis, { text: 'a b', words: [word('a', 0, 10), word('b', 300, 310)] }),
    ).toBe(0);
  });

  it.each([
    [null, 'unknown'],
    [0, 'monotone'],
    [3.99, 'monotone'],
    [4, 'good'],
  ] as const)('classifies intonation spread %s', (value, expected) => {
    expect(classifyIntonation(value)).toBe(expected);
  });
});

describe('coverage matching and section boundaries', () => {
  it('strips common Korean particles from key-point tokens', () => {
    expect(normalizeKeyPointToken('목표는', 'ko')).toBe('목표');
    expect(normalizeKeyPointToken('문제를', 'ko')).toBe('문제');
  });

  it('matches Korean key points with attached particles and changed word order', () => {
    expect(keyPointCovered('고객 문제', '문제는 고객에게 중요합니다', 'ko')).toBe(true);
    expect(keyPointCovered('오늘 목표', '오늘은 목표를 소개합니다', 'ko')).toBe(true);
  });

  it('rejects unrelated Korean transcript content', () => {
    expect(keyPointCovered('고객 문제', '날씨가 맑아서 산책했습니다', 'ko')).toBe(false);
  });

  it('stems common English inflections and rejects unrelated content', () => {
    expect(normalizeKeyPointToken('problems', 'en')).toBe('problem');
    expect(keyPointCovered('solve problem', 'we solved problems today', 'en')).toBe(true);
    expect(keyPointCovered('solve problem', 'we discussed lunch', 'en')).toBe(false);
  });

  it('maps boundary taps to section durations and transcript coverage', () => {
    const plan = makePlan({
      lang: 'ko',
      sections: [
        { id: 'a', name: 'A', keyPoints: ['고객 문제'], budgetMs: 5_000 },
        { id: 'b', name: 'B', keyPoints: ['해결 방법'], budgetMs: 5_000 },
      ],
    });
    const transcript: SpeechTranscript = {
      text: '고객 문제가 중요합니다 해결 방법을 소개합니다',
      language: 'ko',
      words: [
        word('고객', 0, 500),
        word('문제가', 500, 1_000),
        word('해결', 5_000, 5_500),
        word('방법을', 5_500, 6_000),
      ],
    };
    const result = analyzeSections(plan, 10_000, transcript, [5_000], 'ko');
    expect(result.map((section) => section.actualMs)).toEqual([5_000, 5_000]);
    expect(result[0]!.covered).toEqual(['고객 문제']);
    expect(result[1]!.covered).toEqual(['해결 방법']);
  });

  it('leaves coverage unknown when the transcript is missing', () => {
    const result = analyzeSections(makePlan(), 10_000, null, [], 'auto');
    expect(result[0]!.covered).toEqual([]);
    expect(result[0]!.missed).toEqual([]);
  });

  it('uses the first boundary when extra taps are supplied for a single section', () => {
    const result = analyzeSections(makePlan(), 10_000, null, [2_000, 4_000, 6_000], 'en');
    expect(result).toHaveLength(1);
    expect(result[0]!.actualMs).toBe(2_000);
  });
});

describe('script alignment', () => {
  it('reports skipped script words', () => {
    expect(alignScript('one two three', 'one three').skipped).toMatchObject([{ index: 1, word: 'two' }]);
  });

  it('reports added transcript words', () => {
    expect(alignScript('one three', 'one extra three').added).toMatchObject([{ index: 1, word: 'extra' }]);
  });

  it('reports substituted words', () => {
    expect(alignScript('one two', 'one too').substituted).toEqual([
      { scriptIndex: 1, transcriptIndex: 1, expected: 'two', actual: 'too' },
    ]);
  });

  it('aligns Korean words and punctuation as tokens', () => {
    expect(alignScript('안녕하세요 여러분', '안녕하세요 모두')).toMatchObject({
      substituted: [{ scriptIndex: 1, transcriptIndex: 1, expected: '여러분', actual: '모두' }],
    });
  });
});

describe('prompts and random selection', () => {
  it.each([
    ['impromptu Korean', IMPROMPTU_TOPICS, 'ko'],
    ['impromptu English', IMPROMPTU_TOPICS, 'en'],
    ['interview Korean', INTERVIEW_QUESTIONS, 'ko'],
    ['interview English', INTERVIEW_QUESTIONS, 'en'],
  ] as const)('has at least 30 complete prompts for %s', (_label, prompts, lang) => {
    const localized = prompts.filter((prompt) => prompt.lang === lang);
    expect(localized.length).toBeGreaterThanOrEqual(30);
    expect(localized.every((prompt) => prompt.title.trim() && prompt.text.trim())).toBe(true);
  });

  it('keeps prompt IDs globally unique', () => {
    const ids = [...IMPROMPTU_TOPICS, ...INTERVIEW_QUESTIONS].map((prompt) => prompt.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('excludes requested prompt IDs when any alternatives remain', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(pickRandom([{ id: 'a' }, { id: 'b' }], ['a'])?.id).toBe('b');
    vi.restoreAllMocks();
  });

  it('falls back to the full list if every prompt is excluded', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(pickRandom([{ id: 'a' }], ['a'])?.id).toBe('a');
    expect(pickRandom([], [])).toBeNull();
    vi.restoreAllMocks();
  });
});

describe('speech report thresholds and action priority', () => {
  it.each([
    [53_999, 'under'],
    [54_000, 'ok'],
    [60_000, 'ok'],
    [60_001, 'over'],
  ] as const)('classifies duration %s against target time', (durationMs, verdict) => {
    expect(buildSpeechReport(makePlan(), makeAnalysis({ durationMs }), null, [], null).timeVerdict).toBe(
      verdict,
    );
  });

  it('shows transcript-derived metrics after an audio-only report', () => {
    const analysis = makeAnalysis({ durationMs: 10_000 });
    const pending = buildSpeechReport(makePlan({ lang: 'en' }), analysis, null, [], null);
    const arrived = buildSpeechReport(
      makePlan({ lang: 'en' }),
      analysis,
      { text: 'one two', language: 'en', words: [word('one', 0, 500), word('two', 500, 1_000)] },
      [],
      pending,
    );
    expect(pending.transcriptAvailable).toBe(false);
    expect(arrived.transcriptAvailable).toBe(true);
    expect(arrived.tiles.pace.value).toBe(12);
    expect(arrived.tiles.pace.deltaVsPrevious).not.toBeNull();
  });

  it('prioritizes an over-budget section over all other issues', () => {
    const plan = makePlan({
      targetMs: 60_000,
      sections: [{ id: 's', name: 'Opening', keyPoints: ['important point'], budgetMs: 5_000 }],
    });
    const transcript = makeEnglishTranscript(['um', 'uh', 'so', 'unrelated'], 10_000);
    const report = buildSpeechReport(
      plan,
      makeAnalysis({ durationMs: 10_000, pitchSpreadSemitones: 1, pauses: [{ startMs: 1, endMs: 2_000 }] }),
      transcript,
      [],
      null,
    );
    expect(report.nextAction.code).toBe('section-over');
  });

  it('chooses pace when it is the only report issue', () => {
    const report = buildSpeechReport(
      makePlan({ lang: 'en', sections: [] }),
      makeAnalysis({ durationMs: 10_000 }),
      makeEnglishTranscript(['one'], 10_000),
      [],
      null,
    );
    expect(report.nextAction.code).toBe('pace');
  });

  it('chooses filler rate after pace when fillers are the next issue', () => {
    const words = Array.from({ length: 60 }, (_, index) => (index < 3 ? ['um', 'uh', 'so'][index]! : 'word'));
    const report = buildSpeechReport(
      makePlan({ lang: 'en', sections: [] }),
      makeAnalysis({ durationMs: 24_000 }),
      makeEnglishTranscript(words, 24_000),
      [],
      null,
    );
    expect(report.tiles.pace.status).toBe('good');
    expect(report.nextAction.code).toBe('fillers');
  });

  it('chooses long pauses when pace and fillers are acceptable', () => {
    const words = Array.from({ length: 60 }, (_, index) => `word${index}`);
    const report = buildSpeechReport(
      makePlan({ lang: 'en', sections: [] }),
      makeAnalysis({ durationMs: 24_000, pauses: [{ startMs: 1_000, endMs: 3_000 }] }),
      makeEnglishTranscript(words, 24_000),
      [],
      null,
    );
    expect(report.tiles.pace.status).toBe('good');
    expect(report.nextAction.code).toBe('pauses');
  });

  it('chooses monotone intonation after pace, fillers, and pauses', () => {
    const report = buildSpeechReport(
      makePlan({ lang: 'en', sections: [] }),
      makeAnalysis({ durationMs: 24_000, pitchSpreadSemitones: 3 }),
      makeEnglishTranscript(
        Array.from({ length: 60 }, (_, index) => `word${index}`),
        24_000,
      ),
      [],
      null,
    );
    expect(report.nextAction.code).toBe('intonation');
  });

  it('chooses missed key points after higher-priority conditions', () => {
    const report = buildSpeechReport(
      makePlan({
        lang: 'en',
        sections: [{ id: 's', name: 'S', keyPoints: ['important point'], budgetMs: 60_000 }],
      }),
      makeAnalysis({ durationMs: 24_000 }),
      makeEnglishTranscript(
        Array.from({ length: 60 }, (_, index) => `word${index}`),
        24_000,
      ),
      [],
      null,
    );
    expect(report.nextAction.code).toBe('key-points');
  });

  it('keeps going when none of the next-action rules apply', () => {
    const report = buildSpeechReport(
      makePlan({ lang: 'en', sections: [] }),
      makeAnalysis({ durationMs: 24_000 }),
      makeEnglishTranscript(
        Array.from({ length: 60 }, (_, index) => `word${index}`),
        24_000,
      ),
      [],
      null,
    );
    expect(report.nextAction.code).toBe('keep-going');
  });

  it('prioritizes pace over fillers when both are out of range', () => {
    const report = buildSpeechReport(
      makePlan({ lang: 'en', sections: [] }),
      makeAnalysis({ durationMs: 10_000 }),
      makeEnglishTranscript(['um', 'uh', 'so'], 10_000),
      [],
      null,
    );
    expect(report.nextAction.code).toBe('pace');
  });

  it('prioritizes fillers over pauses when both need attention', () => {
    const report = buildSpeechReport(
      makePlan({ lang: 'en', sections: [] }),
      makeAnalysis({ durationMs: 24_000, pauses: [{ startMs: 1_000, endMs: 3_000 }] }),
      makeEnglishTranscript(
        ['um', 'uh', 'so', ...Array.from({ length: 57 }, (_, index) => `word${index}`)],
        24_000,
      ),
      [],
      null,
    );
    expect(report.nextAction.code).toBe('fillers');
  });

  it('prioritizes pauses over monotone intonation', () => {
    const report = buildSpeechReport(
      makePlan({ lang: 'en', sections: [] }),
      makeAnalysis({
        durationMs: 24_000,
        pauses: [{ startMs: 1_000, endMs: 3_000 }],
        pitchSpreadSemitones: 1,
      }),
      makeEnglishTranscript(
        Array.from({ length: 60 }, (_, index) => `word${index}`),
        24_000,
      ),
      [],
      null,
    );
    expect(report.nextAction.code).toBe('pauses');
  });

  it('prioritizes monotone intonation over missed key points', () => {
    const report = buildSpeechReport(
      makePlan({
        lang: 'en',
        sections: [{ id: 's', name: 'S', keyPoints: ['important point'], budgetMs: 60_000 }],
      }),
      makeAnalysis({ durationMs: 24_000, pitchSpreadSemitones: 1 }),
      makeEnglishTranscript(
        Array.from({ length: 60 }, (_, index) => `word${index}`),
        24_000,
      ),
      [],
      null,
    );
    expect(report.nextAction.code).toBe('intonation');
  });

  it('resolves earlier priority over pace, fillers, pauses, monotone, and missed points', () => {
    const plan = makePlan({
      lang: 'en',
      sections: [{ id: 's', name: 'S', keyPoints: ['important point'], budgetMs: 5_000 }],
    });
    const report = buildSpeechReport(
      plan,
      makeAnalysis({ durationMs: 10_000, pitchSpreadSemitones: 1, pauses: [{ startMs: 0, endMs: 2_000 }] }),
      makeEnglishTranscript(['um', 'uh', 'so', 'fast'], 10_000),
      [],
      null,
    );
    expect(report.nextAction.code).toBe('section-over');
  });

  it('computes tile deltas against a previous report', () => {
    const first = buildSpeechReport(
      makePlan({ lang: 'en' }),
      makeAnalysis({ durationMs: 60_000 }),
      makeEnglishTranscript(Array(140).fill('word'), 60_000),
      [],
      null,
    );
    const second = buildSpeechReport(
      makePlan({ lang: 'en' }),
      makeAnalysis({ durationMs: 60_000 }),
      makeEnglishTranscript(Array(150).fill('word'), 60_000),
      [],
      first,
    );
    expect(second.tiles.pace.deltaVsPrevious).toBeGreaterThan(0);
    expect(second.tiles.fillers.deltaVsPrevious).toBe(0);
  });
});
