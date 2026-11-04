import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  beginRun,
  builtinRoutines,
  currentIndex,
  hasSavableChanges,
  itemsForSave,
  startRun,
  summarizeRun,
  templateWithChanges,
  unitsOf,
  withCursor,
  type PoomsaeItem,
  type RoutineCommand,
  type RunState,
} from '../src';

const tpl = (id: string, lang: 'ko' | 'en') => builtinRoutines(lang).find((r) => r.id === id)!;
const run = (id: string, lang: 'ko' | 'en' = 'en') => beginRun(startRun(tpl(id, lang), 'full'));
const at = (s: RunState, pred: (u: ReturnType<typeof unitsOf>[number]) => boolean) => withCursor(s, unitsOf(s).find(pred)!.key);
const cmd = (s: RunState, c: RoutineCommand) => applyCommand(s, c, 1000);

describe('template stays separate from the session copy', () => {
  it('commands change the copy, never the template', () => {
    const s0 = run('routine-bodyweight');
    const before = JSON.stringify(s0.template);
    let s = at(s0, (u) => u.itemId === 'b1' && u.kind === 'rep' && u.set === 1 && u.rep === 3);
    s = cmd(s, { kind: 'more_reps', n: 5 }).state;
    s = cmd(s, { kind: 'rest', sec: 20 }).state;
    s = cmd(s, { kind: 'tempo', dir: 'slower' }).state;
    expect(JSON.stringify(s.template)).toBe(before);
    expect(s.items[0]).toMatchObject({ reps: 20, restSec: 20 });
    expect(hasSavableChanges(s)).toBe(true);
    const saved = templateWithChanges(s, 'mine');
    expect(saved.id).toBe('mine');
    expect(saved.builtin).toBeUndefined();
    expect(saved.items[0]).toMatchObject({ reps: 20, secPerRep: 3.5 });
    expect(s.deviations.map((d) => d.kind)).toEqual(['more_reps', 'rest', 'tempo']);
  });

  it('transient moves do not count as savable changes', () => {
    let s = run('routine-bodyweight');
    s = cmd(s, { kind: 'skip' }).state;
    s = cmd(s, { kind: 'pause' }).state;
    s = cmd(s, { kind: 'resume' }).state;
    expect(hasSavableChanges(s)).toBe(false);
    expect(itemsForSave(s)).toEqual(s.template.items);
  });
});

describe('live commands', () => {
  it('skip jumps to the next item and says what it is (ko and en)', () => {
    const s = at(run('routine-bodyweight', 'ko'), (u) => u.itemId === 'b1' && u.kind === 'rep' && u.rep === 2);
    const r = cmd(s, { kind: 'skip' });
    expect(unitsOf(r.state)[currentIndex(r.state)]!.itemId).toBe('b2');
    expect(r.reply).toContain('푸시업');
    const e = cmd(at(run('routine-bodyweight'), (u) => u.itemId === 'b1' && u.kind === 'rep'), { kind: 'skip' });
    expect(e.reply).toBe('Skipping. Next: Push-ups 10 reps, 3 sets.');
  });

  it('skipping a rest only skips the rest', () => {
    const s = at(run('routine-bodyweight'), (u) => u.itemId === 'b1' && u.kind === 'rest');
    const r = cmd(s, { kind: 'skip' });
    const u = unitsOf(r.state)[currentIndex(r.state)]!;
    expect(u).toMatchObject({ itemId: 'b1', kind: 'rep', set: 2, rep: 1 });
  });

  it('sets: one more and one fewer, ending the item when the current set is gone', () => {
    let s = at(run('routine-bodyweight'), (u) => u.itemId === 'b1' && u.kind === 'rep' && u.set === 3 && u.rep === 2);
    s = cmd(s, { kind: 'sets', delta: 1 }).state;
    expect(s.items[0]).toMatchObject({ sets: 4 });
    s = cmd(s, { kind: 'sets', delta: -1 }).state;
    const r = cmd(s, { kind: 'sets', delta: -1 });
    expect(r.state.items[0]).toMatchObject({ sets: 2 });
    expect(unitsOf(r.state)[currentIndex(r.state)]!.itemId).toBe('b2');
    const one = { ...r.state, items: r.state.items.map((i) => (i.kind === 'exercise' ? { ...i, sets: 1 } : i)) };
    expect(cmd(one, { kind: 'sets', delta: -1 }).ok).toBe(false);
  });

  it('rest change applies to the current and later items only', () => {
    const s = at(run('routine-bodyweight'), (u) => u.itemId === 'b2' && u.kind === 'rep');
    const r = cmd(s, { kind: 'rest', sec: 45 });
    expect(r.state.items.map((i) => (i.kind === 'rest' ? i.sec : (i as { restSec: number }).restSec))).toEqual([30, 45, 45, 45]);
  });

  it('swap renames the named or current exercise and keeps reps and sets', () => {
    const s = at(run('routine-bodyweight'), (u) => u.itemId === 'b1' && u.kind === 'rep');
    const r = cmd(s, { kind: 'swap', from: 'push-ups', to: 'burpees' });
    expect(r.state.items[1]).toMatchObject({ name: 'burpees', reps: 10, sets: 3 });
    const cur = cmd(s, { kind: 'swap', to: 'lunges' });
    expect(cur.state.items[0]!.name).toBe('lunges');
    expect(cmd(s, { kind: 'swap', from: 'nothing', to: 'x' }).ok).toBe(false);
  });

  it('poomsae: repeat from a movement, and go back one move', () => {
    let s = at(run('routine-taegeuk-1', 'ko'), (u) => u.kind === 'move' && u.rep === 9);
    const back = cmd(s, { kind: 'back' });
    expect(unitsOf(back.state)[currentIndex(back.state)]).toMatchObject({ kind: 'move', rep: 8 });
    expect(back.reply).toBe('8번 동작으로 돌아갈게요.');
    const rep = cmd(s, { kind: 'repeat_from', no: 5 });
    expect(unitsOf(rep.state)[currentIndex(rep.state)]).toMatchObject({ kind: 'move', rep: 5 });
    expect(cmd(s, { kind: 'repeat_from', no: 40 }).ok).toBe(false);
    s = at(run('routine-bodyweight'), (u) => u.kind === 'rep');
    expect(cmd(s, { kind: 'repeat_from', no: 2 }).ok).toBe(false);
  });

  it('back from the first move goes to the item start', () => {
    const s = at(run('routine-taegeuk-1'), (u) => u.kind === 'move' && u.rep === 1);
    const r = cmd(s, { kind: 'back' });
    expect(unitsOf(r.state)[currentIndex(r.state)]!.kind).toBe('intro');
  });

  it('tempo changes by 15 percent and stops at the limits', () => {
    let s = run('routine-bodyweight');
    s = cmd(s, { kind: 'tempo', dir: 'slower' }).state;
    expect(s.tempoFactor).toBe(1.15);
    s = cmd(s, { kind: 'tempo', dir: 'faster' }).state;
    expect(s.tempoFactor).toBeCloseTo(0.9775, 2);
    for (let i = 0; i < 20; i++) s = cmd(s, { kind: 'tempo', dir: 'slower' }).state;
    expect(s.tempoFactor).toBe(2);
    expect(cmd(s, { kind: 'tempo', dir: 'slower' }).ok).toBe(false);
    for (let i = 0; i < 30; i++) s = cmd(s, { kind: 'tempo', dir: 'faster' }).state;
    expect(s.tempoFactor).toBe(0.5);
    const rep = unitsOf(s).find((u) => u.kind === 'rep')!;
    expect(rep.durMs).toBe(1500);
  });

  it('pause and resume keep the cursor on the current unit', () => {
    const s = at(run('routine-bodyweight'), (u) => u.itemId === 'b2' && u.kind === 'rep' && u.rep === 4);
    const p = cmd(s, { kind: 'pause' });
    expect(p.state.status).toBe('paused');
    expect(cmd(p.state, { kind: 'pause' }).ok).toBe(false);
    const r = cmd(p.state, { kind: 'resume' });
    expect(r.state.status).toBe('running');
    expect(r.state.cursor).toBe(s.cursor);
  });

  it('answers how many are left and what is next', () => {
    const s = at(run('routine-bodyweight', 'ko'), (u) => u.itemId === 'b1' && u.kind === 'rep' && u.set === 1 && u.rep === 5);
    expect(cmd(s, { kind: 'query', query: 'left' }).reply).toContain('스쿼트 1세트 중 10개 남았고');
    expect(cmd(s, { kind: 'query', query: 'next' }).reply).toBe('다음은 스쿼트 2세트예요.');
    const last = at(run('routine-bodyweight'), (u) => u.itemId === 'b3' && u.set === 3 && u.rep === 12);
    expect(cmd(last, { kind: 'query', query: 'next' }).reply).toBe('Next is Plank 45 seconds, 3 sets.');
    const e = cmd(at(run('routine-bodyweight'), (u) => u.itemId === 'b1' && u.kind === 'rep' && u.set === 1 && u.rep === 5), { kind: 'query', query: 'left' });
    expect(e.reply).toMatch(/^10 reps left in set 1 of Squats, 3 more items, about \d+ min left\.$/);
  });

  it('ends early and summarizes', () => {
    const s = at(run('routine-bodyweight'), (u) => u.itemId === 'b2' && u.kind === 'rep');
    const r = cmd(s, { kind: 'end' });
    expect(r.state.status).toBe('ended');
    expect(r.state.endedEarly).toBe(true);
    expect(cmd(r.state, { kind: 'skip' }).ok).toBe(false);
    const sum = summarizeRun(r.state);
    expect(sum.endedEarly).toBe(true);
    expect(sum.completedUnits).toBeGreaterThan(40);
    expect(sum.completedUnits).toBeLessThan(sum.totalUnits);
  });

  it('keeps poomsae movement edits out of the template', () => {
    const s = run('routine-taegeuk-1');
    const p = s.items[0] as PoomsaeItem;
    expect(p.movements).not.toBe((s.template.items[0] as PoomsaeItem).movements);
  });
});
