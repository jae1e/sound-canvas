import { describe, expect, it } from 'vitest';
import { applyCommand, beginRun, builtinRoutines, startRun, unitsOf, withCursor } from '@vlc/session-engine';

import { deriveRoutineView } from './view';

const run = (id: string, lang: 'ko' | 'en') => beginRun(startRun(builtinRoutines(lang).find((r) => r.id === id)!, 'full'));

describe('deriveRoutineView', () => {
  it('shows count, set and next for a rep', () => {
    let s = run('routine-bodyweight', 'ko');
    s = withCursor(s, unitsOf(s).find((u) => u.itemId === 'b1' && u.kind === 'rep' && u.set === 2 && u.rep === 7)!.key);
    const v = deriveRoutineView(s, 'ko');
    expect(v).toMatchObject({ title: '스쿼트', count: '7 / 15', setLabel: '2/3 세트', next: '휴식 30초', tempoPercent: 100 });
  });

  it('shows the movement, stance, facing and next movement for a poomsae', () => {
    let s = run('routine-taegeuk-1', 'en');
    s = withCursor(s, unitsOf(s).find((u) => u.kind === 'move' && u.rep === 5)!.key);
    const v = deriveRoutineView(s, 'en');
    expect(v.title).toBe('low block');
    expect(v.count).toBe('5 / 18');
    expect(v.movement).toMatchObject({ no: 5, facing: 'N', kihap: false, stance: 'left front stance' });
    expect(v.next).toBe('6. middle punch');
    const last = withCursor(s, unitsOf(s).find((u) => u.kind === 'move' && u.rep === 18)!.key);
    expect(deriveRoutineView(last, 'en').movement!.kihap).toBe(true);
  });

  it('reflects the tempo as a speed percentage', () => {
    const s = applyCommand(run('routine-bodyweight', 'en'), { kind: 'tempo', dir: 'slower' }, 0).state;
    expect(deriveRoutineView(s, 'en').tempoPercent).toBe(87);
  });

  it('shows holds with the side', () => {
    let s = run('routine-stretching', 'en');
    s = withCursor(s, unitsOf(s).find((u) => u.kind === 'hold' && u.side === 'right')!.key);
    expect(deriveRoutineView(s, 'en')).toMatchObject({ subtitle: 'Right side', count: '20 s' });
  });
});
