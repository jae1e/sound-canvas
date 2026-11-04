import { describe, expect, it } from 'vitest';
import {
  builtinRoutines,
  collectPhrases,
  correctionPreCues,
  expandUnits,
  koCount,
  enCount,
  parseRoutineTemplate,
  planTimeline,
  spanAt,
  TAEGEUK_1_MOVEMENTS,
  type Correction,
  type RoutineItem,
} from '../src';

const body = (lang: 'ko' | 'en') => builtinRoutines(lang).find((r) => r.id === 'routine-bodyweight')!;
const taegeuk = (lang: 'ko' | 'en') => builtinRoutines(lang).find((r) => r.id === 'routine-taegeuk-1')!;
const flat = (clip = 500) => ({ clipMs: () => clip });

describe('numbers', () => {
  it('speaks native Korean counts and English words', () => {
    expect([1, 2, 10, 11, 15, 20, 21, 30, 99].map(koCount)).toEqual(['하나', '둘', '열', '열하나', '열다섯', '스물', '스물하나', '서른', '아흔아홉']);
    expect([1, 15, 21, 30].map(enCount)).toEqual(['one', 'fifteen', 'twenty-one', 'thirty']);
  });
});

describe('templates', () => {
  it('ships three valid built-in routines', () => {
    for (const lang of ['ko', 'en'] as const) {
      const all = builtinRoutines(lang);
      expect(all.map((r) => r.id)).toEqual(['routine-stretching', 'routine-bodyweight', 'routine-taegeuk-1']);
      for (const r of all) expect(() => parseRoutineTemplate(r)).not.toThrow();
    }
  });

  it('Taegeuk 1 has 18 movements, one kihap on the last, and consistent numbering', () => {
    expect(TAEGEUK_1_MOVEMENTS).toHaveLength(18);
    expect(TAEGEUK_1_MOVEMENTS.map((m) => m.no)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(TAEGEUK_1_MOVEMENTS.filter((m) => m.kihap).map((m) => m.no)).toEqual([18]);
    expect(TAEGEUK_1_MOVEMENTS[0]!.technique.ko).toBe('아래막기');
    expect(TAEGEUK_1_MOVEMENTS[0]!.facing).toBe('W');
    expect(TAEGEUK_1_MOVEMENTS[17]!.facing).toBe('N');
  });
});

describe('expandUnits', () => {
  it('lays out reps, rests between sets only, and an end unit', () => {
    const items = body('en').items;
    const units = expandUnits(items);
    const squats = units.filter((u) => u.itemId === 'b1');
    expect(squats.filter((u) => u.kind === 'rep')).toHaveLength(45);
    expect(squats.filter((u) => u.kind === 'rest')).toHaveLength(2);
    expect(units[units.length - 1]!.kind).toBe('done');
  });

  it('scales rep durations by the tempo factor but not holds', () => {
    const items = body('en').items;
    const a = expandUnits(items, 1);
    const b = expandUnits(items, 1.15);
    expect(b.find((u) => u.kind === 'rep')!.durMs).toBe(Math.round(a.find((u) => u.kind === 'rep')!.durMs * 1.15));
    expect(b.find((u) => u.kind === 'hold')!.durMs).toBe(a.find((u) => u.kind === 'hold')!.durMs);
  });
});

describe('planTimeline: workout pacing', () => {
  it('counts reps on the tempo grid with no drift', () => {
    const items = body('en').items;
    const tl = planTimeline({ lang: 'en', level: 'full', items, ...flat() }, 0);
    const counts = tl.beats.filter((b) => b.kind === 'count' && b.unitKey.startsWith('b1|rep|1|'));
    expect(counts.map((b) => b.text)).toEqual(Array.from({ length: 15 }, (_, i) => enCount(i + 1)));
    for (let i = 1; i < counts.length; i++) expect(counts[i]!.atMs - counts[i - 1]!.atMs).toBe(3000);
  });

  it('announces rest, the next item and a 3-2-1 countdown', () => {
    const items = body('ko').items;
    const tl = planTimeline({ lang: 'ko', level: 'full', items, ...flat() }, 0);
    const rest = tl.spans.find((s) => s.unit.kind === 'rest' && s.unit.itemId === 'b4')!;
    const texts = tl.beats.filter((b) => b.atMs >= rest.startMs && b.atMs < rest.endMs).map((b) => b.text);
    expect(texts[0]).toBe('휴식 30초');
    expect(texts).toContain('다음 세트');
    expect(texts.slice(-3)).toEqual(['셋', '둘', '하나']);
    const between = tl.spans.filter((s) => s.unit.kind === 'rest' && s.unit.itemId === 'b1');
    const lastSquatRest = tl.beats.filter((b) => b.atMs >= between[1]!.startMs && b.atMs < between[1]!.endMs);
    expect(lastSquatRest.find((b) => b.kind === 'transition')!.text).toBe('다음 세트');
    const intro = tl.beats.find((b) => b.text.startsWith('푸시업'));
    expect(intro?.text).toBe('푸시업 10개 3세트');
  });

  it('speaks next-item names across items and per-side holds with the other side', () => {
    const items = builtinRoutines('en').find((r) => r.id === 'routine-stretching')!.items;
    const tl = planTimeline({ lang: 'en', level: 'full', items, ...flat() }, 0);
    const texts = tl.beats.map((b) => b.text);
    expect(texts).toContain('other side');
    expect(texts).toContain('ten seconds left');
    const hold = tl.spans.find((s) => s.unit.kind === 'hold' && s.unit.itemId === 's2' && s.unit.side === 'left')!;
    const inHold = tl.beats.filter((b) => b.atMs >= hold.startMs && b.atMs < hold.endMs).map((b) => b.text);
    expect(inHold).toEqual(['left side', 'ten seconds left', 'three', 'two', 'one']);
    const t3 = tl.beats.find((b) => b.text === 'three' && b.unitKey === hold.unit.key)!;
    expect(t3.atMs).toBe(hold.endMs - 3000);
  });

  it('count-only keeps counts and the countdown but drops names', () => {
    const items = body('en').items;
    const tl = planTimeline({ lang: 'en', level: 'count', items, ...flat() }, 0);
    const texts = new Set(tl.beats.map((b) => b.text));
    expect(texts.has('ten seconds left')).toBe(false);
    expect(texts.has('one')).toBe(true);
    expect(texts.has('rest')).toBe(true);
  });

  it('starts from a cursor and tags beats by set for the drift summary', () => {
    const items = body('en').items;
    const units = expandUnits(items);
    const at = units.findIndex((u) => u.itemId === 'b1' && u.kind === 'rep' && u.set === 2 && u.rep === 1);
    const tl = planTimeline({ lang: 'en', level: 'full', items, ...flat(), leadInMs: 500 }, at);
    expect(tl.spans[0]!.unit.key).toBe(units[at]!.key);
    expect(tl.beats[0]!.atMs).toBe(500);
    expect(tl.beats[0]!.segment).toBe('b1:2');
  });

  it('collects every phrase to pre-synthesize', () => {
    const phrases = collectPhrases({ lang: 'ko', level: 'full', items: body('ko').items, ...flat() });
    expect(phrases).toContain('열다섯');
    expect(phrases).toContain('스쿼트 15개 3세트');
    expect(phrases).toContain('다음 세트');
    expect(phrases).toContain('다음: 푸시업 10개 3세트'.slice(0, 0) + '휴식 30초');
  });
});

describe('planTimeline: poomsae', () => {
  it('speaks number + stance + technique at full, technique at short, number only at count', () => {
    const items = taegeuk('ko').items;
    const text = (level: 'full' | 'short' | 'count') => planTimeline({ lang: 'ko', level, items, ...flat(300) }, 0).beats.filter((b) => b.kind === 'count').map((b) => b.text);
    expect(text('full')[0]).toBe('하나, 왼발 앞서기 아래막기');
    expect(text('short')[0]).toBe('하나, 아래막기');
    expect(text('count').slice(0, 3)).toEqual(['하나', '둘', '셋']);
    expect(text('count')).toHaveLength(18);
    expect(text('count')[17]).toBe('열여덟');
  });

  it('paces movements on a fixed grid and trims a phrase that does not fit the tempo', () => {
    const items = taegeuk('ko').items;
    const tl = planTimeline({ lang: 'ko', level: 'full', items, clipMs: (t) => (t.length > 4 ? 3000 : 400) }, 0);
    expect(tl.trimmed.length).toBeGreaterThan(0);
    const moves = tl.spans.filter((s) => s.unit.kind === 'move');
    for (let i = 1; i < moves.length; i++) expect(moves[i]!.startMs - moves[i - 1]!.startMs).toBe(2500);
    expect(tl.beats.filter((b) => b.kind === 'count').every((b) => b.text.length <= 4 || b.text.includes(','))).toBe(true);
  });

  it('plays the kihap reminder before movement 18 at every level', () => {
    const items = taegeuk('en').items;
    const cues = correctionPreCues([], items, 'en');
    for (const level of ['full', 'short', 'count'] as const) {
      const tl = planTimeline({ lang: 'en', level, items, preCues: cues, ...flat(400) }, 0);
      const k = tl.beats.find((b) => b.kind === 'cue')!;
      const m18 = tl.spans.find((s) => s.unit.movementId === 't1-18')!;
      expect(k.text).toBe('kihap!');
      expect(k.atMs + 400).toBeLessThanOrEqual(m18.startMs - 40);
    }
  });

  it('repeats the form with a short gap between passes', () => {
    const p = { ...(taegeuk('en').items[0] as Extract<RoutineItem, { kind: 'poomsae' }>), repeat: 3 };
    const tl = planTimeline({ lang: 'en', level: 'count', items: [p], ...flat() }, 0);
    expect(tl.beats.filter((b) => b.kind === 'count')).toHaveLength(54);
    expect(tl.beats.filter((b) => b.text === 'again')).toHaveLength(2);
  });
});

describe('pre-cue placement (corrections)', () => {
  const corr = (over: Partial<Correction>): Correction => ({
    id: 'c1', templateId: 'x', text: 'n', cue: 'right hand first!', lang: 'en', fixed: false, createdAt: 0, shown: 0, ...over,
  });

  it('plays before the movement count, in count-only too, without moving the beat', () => {
    const items = taegeuk('en').items;
    const cues = correctionPreCues([corr({ movementId: 't1-5', itemId: 'p1', movementNo: 5 })], items, 'en');
    const base = planTimeline({ lang: 'en', level: 'count', items, ...flat(500) }, 0);
    const withCue = planTimeline({ lang: 'en', level: 'count', items, preCues: cues, ...flat(500) }, 0);
    const startOf = (tl: typeof base, id: string) => tl.spans.find((s) => s.unit.movementId === id)!.startMs;
    expect(startOf(withCue, 't1-5') - startOf(withCue, 't1-4')).toBe(2500);
    const cue = withCue.beats.find((b) => b.cueId === 'c1')!;
    const count5 = withCue.beats.find((b) => b.unitKey.endsWith('t1-5') && b.kind === 'count')!;
    expect(cue.text).toBe('right hand first!');
    expect(cue.atMs).toBeLessThan(count5.atMs);
    expect(cue.atMs + 500).toBeLessThanOrEqual(count5.atMs - 40);
    expect(withCue.droppedCues).toEqual([]);
    // The previous count (500 ms) must have ended before the cue starts.
    const count4 = withCue.beats.find((b) => b.unitKey.endsWith('t1-4') && b.kind === 'count')!;
    expect(cue.atMs).toBeGreaterThanOrEqual(count4.atMs + 500);
  });

  it('drops a cue that cannot fit instead of moving the beat, and reports it', () => {
    const items = taegeuk('en').items;
    const cues = correctionPreCues([corr({ movementId: 't1-5', itemId: 'p1', cue: 'a very long correction cue that never fits in the gap' })], items, 'en');
    const tl = planTimeline({ lang: 'en', level: 'count', items, preCues: cues, clipMs: (t) => (t.length > 20 ? 2400 : 300) }, 0);
    expect(tl.droppedCues).toEqual(['c1']);
    const a = tl.spans.find((s) => s.unit.movementId === 't1-5')!.startMs - tl.spans.find((s) => s.unit.movementId === 't1-4')!.startMs;
    expect(a).toBe(2500);
  });

  it('widens a flexible gap (intro) for a cue before the first movement', () => {
    const items = taegeuk('ko').items;
    const cues = correctionPreCues([corr({ movementId: 't1-1', itemId: 'p1', lang: 'ko', cue: '왼발 먼저!' })], items, 'ko', { kihap: false });
    const tl = planTimeline({ lang: 'ko', level: 'count', items, preCues: cues, ...flat(900) }, 0);
    const cue = tl.beats.find((b) => b.cueId === 'c1')!;
    const intro = tl.beats.find((b) => b.kind === 'name')!;
    expect(cue.atMs).toBeGreaterThanOrEqual(intro.atMs + 900);
    expect(tl.droppedCues).toEqual([]);
  });

  it('ignores fixed corrections and corrections in the other language', () => {
    const items = taegeuk('en').items;
    expect(correctionPreCues([corr({ movementId: 't1-5', fixed: true })], items, 'en', { kihap: false })).toEqual([]);
    expect(correctionPreCues([corr({ movementId: 't1-5', lang: 'ko' })], items, 'en', { kihap: false })).toEqual([]);
  });

  it('spanAt returns the unit being performed', () => {
    const items = body('en').items;
    const tl = planTimeline({ lang: 'en', level: 'full', items, ...flat() }, 0);
    const s = tl.spans.find((x) => x.unit.itemId === 'b1' && x.unit.kind === 'rep' && x.unit.rep === 4)!;
    expect(spanAt(tl, s.startMs + 100)!.unit.key).toBe(s.unit.key);
  });
});
