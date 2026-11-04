import { describe, expect, it } from 'vitest';
import {
  attachCorrection,
  builtinRoutines,
  correctionSummaryLine,
  detectCorrectionNote,
  extractCue,
  makeCorrection,
  pickCorrectionToFix,
} from '../src';

const items = (lang: 'ko' | 'en') => builtinRoutines(lang).find((r) => r.id === 'routine-taegeuk-1')!.items;
const mixed = (lang: 'ko' | 'en') => [...builtinRoutines(lang).find((r) => r.id === 'routine-bodyweight')!.items, ...items(lang)];

describe('detectCorrectionNote', () => {
  it('reads explicit prefixes', () => {
    expect(detectCorrectionNote('문제: 오른손이 늦어요')).toEqual({ body: '오른손이 늦어요', explicit: true });
    expect(detectCorrectionNote('고칠 점 왼발이 먼저 나가요')).toEqual({ body: '왼발이 먼저 나가요', explicit: true });
    expect(detectCorrectionNote('note: I keep leading with my left hand')).toEqual({ body: 'i keep leading with my left hand', explicit: true });
  });

  it('recognizes the plain sentence from the user', () => {
    const n = detectCorrectionNote('오른손 먼저 나가야되는데 자꾸 왼손이 나가요');
    expect(n).toEqual({ body: '오른손 먼저 나가야되는데 자꾸 왼손이 나가요', explicit: false });
    expect(detectCorrectionNote('I keep leading with my left hand')?.explicit).toBe(false);
  });

  it('does not hijack ordinary speech or commands', () => {
    expect(detectCorrectionNote('다음 운동')).toBeNull();
    expect(detectCorrectionNote('skip this one')).toBeNull();
    expect(detectCorrectionNote('오늘 날씨 좋다')).toBeNull();
    expect(detectCorrectionNote('왼손 아프다')).toBeNull();
  });
});

describe('extractCue', () => {
  it('turns the user example into a short cue', () => {
    expect(extractCue('오른손 먼저 나가야되는데 자꾸 왼손이 나가요', 'ko')).toEqual({ cue: '오른손 먼저!', side: 'right', part: '손' });
  });
  it('picks the token before 먼저 and falls back to modifiers', () => {
    expect(extractCue('왼손이 자꾸 나가는데 오른발 먼저 해야 해요', 'ko').cue).toBe('오른발 먼저!');
    expect(extractCue('왼팔을 더 높이 올려야 해요', 'ko').cue).toBe('왼팔 높이!');
    expect(extractCue('몸통이 자꾸 숙여져요', 'ko').cue).toBe('몸통!');
  });
  it('works in English', () => {
    expect(extractCue('the right hand should go first but I keep leading with my left', 'en')).toEqual({ cue: 'right hand first!', side: 'right', part: 'hand' });
    expect(extractCue('I keep dropping my left elbow, keep it higher', 'en').cue).toBe('left elbow higher!');
    expect(extractCue('I keep rushing', 'en').cue).toBe('rushing!');
  });
  it('keeps cues short', () => {
    expect(extractCue('발 방향이 자꾸 틀려서 다음에는 꼭 확인하고 움직여야 해요', 'ko').cue.length).toBeLessThanOrEqual(16);
  });
});

describe('attachCorrection', () => {
  const t = 'I keep leading with my left hand';
  it('attaches to the current movement mid-practice', () => {
    const a = attachCorrection(t, items('en'), 'en', { itemId: 'p1', movementId: 't1-7', previousMovementId: 't1-6' });
    expect(a).toEqual({ target: { kind: 'movement', itemId: 'p1', movementId: 't1-7', no: 7 }, reason: 'current' });
  });
  it('attaches to the previous movement when one just finished', () => {
    const a = attachCorrection(t, items('en'), 'en', { itemId: 'p1', movementId: 't1-7', previousMovementId: 't1-6', justFinished: true });
    expect(a).toMatchObject({ target: { movementId: 't1-6', no: 6 }, reason: 'previous' });
  });
  it('a named movement beats the practice position', () => {
    expect(attachCorrection('5번 동작 오른손이 늦어요', items('ko'), 'ko', { itemId: 'p1', movementId: 't1-9' })).toMatchObject({ target: { no: 5 }, reason: 'named' });
    expect(attachCorrection('movement 12: keep the hip low', items('en'), 'en')).toMatchObject({ target: { no: 12 }, reason: 'named' });
  });
  it('a unique technique name picks that movement', () => {
    expect(attachCorrection('몸통안막기 할 때 팔이 낮아요', items('ko'), 'ko')).toMatchObject({ reason: 'ambiguous' });
    expect(attachCorrection('얼굴막기 할 때 왼손이 낮아요', items('ko'), 'ko', { itemId: 'p1', movementId: 't1-13' })).toMatchObject({ target: { no: 13 }, reason: 'named' });
  });
  it('an ambiguous technique goes to the picker with candidates', () => {
    const a = attachCorrection('아래막기 할 때 왼손이 나가요', items('ko'), 'ko');
    expect(a.reason).toBe('ambiguous');
    expect(a.target).toBeNull();
    if (a.target === null) expect(a.candidates.map((c) => (c.kind === 'movement' ? c.no : 0))).toEqual([1, 3, 5, 11, 17]);
  });
  it('a practiced exercise gets an item note, otherwise the whole routine', () => {
    expect(attachCorrection('I keep leaning forward', mixed('en'), 'en', { itemId: 'b1' })).toEqual({ target: { kind: 'item', itemId: 'b1' }, reason: 'item' });
    expect(attachCorrection('squats: I keep my knees in', mixed('en'), 'en')).toEqual({ target: { kind: 'item', itemId: 'b1' }, reason: 'named' });
    expect(attachCorrection(t, items('en'), 'en')).toEqual({ target: { kind: 'routine' }, reason: 'routine' });
  });
});

describe('makeCorrection and summary', () => {
  it('builds a stored correction with links', () => {
    const c = makeCorrection({ id: 'c1', templateId: 'tpl', text: '오른손 먼저 나가야되는데 자꾸 왼손이 나가요', lang: 'ko', target: { kind: 'movement', itemId: 'p1', movementId: 't1-5', no: 5 }, now: 7 });
    expect(c).toMatchObject({ cue: '오른손 먼저!', side: 'right', movementId: 't1-5', itemId: 'p1', movementNo: 5, fixed: false, shown: 0 });
  });

  it('summarizes the cues that played, in both languages', () => {
    const c = makeCorrection({ id: 'c1', templateId: 'tpl', text: '오른손 먼저 나가야되는데 자꾸 왼손이 나가요', lang: 'ko', target: { kind: 'movement', itemId: 'p1', movementId: 't1-5', no: 5 }, now: 7 });
    expect(correctionSummaryLine(new Map([['c1', 3]]), [c], 'ko')).toBe('오늘 5번 동작 오른손 먼저 큐 3번 나왔어요');
    const e = makeCorrection({ id: 'c2', templateId: 'tpl', text: 'right hand should go first, I keep leading with my left', lang: 'en', target: { kind: 'movement', itemId: 'p1', movementId: 't1-5', no: 5 }, now: 7 });
    expect(correctionSummaryLine(new Map([['c2', 1]]), [e], 'en')).toBe('Today: movement 5 "right hand first" cue 1 time');
    expect(correctionSummaryLine(new Map(), [c], 'ko')).toBeNull();
  });

  it('picks the correction to mark fixed', () => {
    const a = makeCorrection({ id: 'a', templateId: 't', text: '오른손 먼저 자꾸', lang: 'ko', target: { kind: 'movement', itemId: 'p1', movementId: 't1-5', no: 5 }, now: 1 });
    const b = makeCorrection({ id: 'b', templateId: 't', text: '왼발 먼저 자꾸', lang: 'ko', target: { kind: 'movement', itemId: 'p1', movementId: 't1-9', no: 9 }, now: 1 });
    expect(pickCorrectionToFix([a, b], { lastPlayedId: 'b' })?.id).toBe('b');
    expect(pickCorrectionToFix([a, b], { movementId: 't1-5' })?.id).toBe('a');
    expect(pickCorrectionToFix([a, b], {})).toBeUndefined();
    expect(pickCorrectionToFix([{ ...a, fixed: true }, b], {})?.id).toBe('b');
  });
});
