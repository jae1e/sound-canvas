import { describeItem, unitsOf, currentIndex, type Lang, type Movement, type PoomsaeItem, type RunState } from '@vlc/session-engine';

/** What the active screen shows, derived from the run state (pure, tested). */
export interface RoutineView {
  /** Big heading: the item name, or the movement technique for a poomsae. */
  title: string;
  subtitle: string | null;
  /** "7 / 15" style count, or the countdown for holds. */
  count: string | null;
  setLabel: string | null;
  movement: { no: number; total: number; stance: string; technique: string; facing: string; turn: string | null; kihap: boolean } | null;
  next: string | null;
  /** Tempo as a percentage of the base pace (100 = as planned). */
  tempoPercent: number;
  kind: 'intro' | 'rep' | 'hold' | 'rest' | 'move' | 'switch' | 'between' | 'done';
}

export function deriveRoutineView(run: RunState, lang: Lang): RoutineView {
  const ko = lang === 'ko';
  const units = unitsOf(run);
  const ci = currentIndex(run, units);
  const u = units[ci]!;
  const item = u.itemId === 'end' ? undefined : run.items[u.itemIdx];
  const tempoPercent = Math.round(100 / run.tempoFactor);
  const after = units.slice(ci + 1);
  const nextUnit = u.kind === 'move' ? after[0] : after.find((x) => x.kind !== u.kind || x.itemIdx !== u.itemIdx || x.set !== u.set || x.side !== u.side);
  const nextItem = nextUnit && nextUnit.kind !== 'done' ? run.items[nextUnit.itemIdx] : undefined;
  const base = { tempoPercent, kind: u.kind };
  if (!item) return { ...base, title: ko ? '끝' : 'Done', subtitle: null, count: null, setLabel: null, movement: null, next: null };

  const next = (() => {
    if (!nextUnit || nextUnit.kind === 'done') return ko ? '마지막이에요' : 'Last one';
    if (nextUnit.itemIdx === u.itemIdx) {
      if (nextUnit.kind === 'rest') return ko ? `휴식 ${Math.round(nextUnit.durMs / 1000)}초` : `Rest ${Math.round(nextUnit.durMs / 1000)} s`;
      if (nextUnit.kind === 'move') {
        const m = (item as PoomsaeItem).movements.find((x) => x.id === nextUnit.movementId);
        return m ? `${m.no}. ${m.technique[lang]}` : null;
      }
      return ko ? `${item.name} ${nextUnit.set}세트` : `${item.name} set ${nextUnit.set}`;
    }
    return nextItem ? describeItem(nextItem, lang) : null;
  })();

  if (item.kind === 'poomsae' && u.kind === 'move') {
    const m = item.movements.find((x) => x.id === u.movementId) as Movement;
    return {
      ...base,
      title: m.technique[lang],
      subtitle: `${m.stance[lang]}${m.turn ? ` · ${m.turn[lang]}` : ''}`,
      count: `${m.no} / ${item.movements.length}`,
      setLabel: item.repeat > 1 ? (ko ? `${u.set}/${u.sets}번째` : `Pass ${u.set}/${u.sets}`) : null,
      movement: { no: m.no, total: item.movements.length, stance: m.stance[lang], technique: m.technique[lang], facing: m.facing, turn: m.turn?.[lang] ?? null, kihap: Boolean(m.kihap) },
      next,
    };
  }
  const setLabel = u.sets > 1 && u.set > 0 && item.kind !== 'poomsae' ? (ko ? `${u.set}/${u.sets} 세트` : `Set ${u.set}/${u.sets}`) : null;
  switch (u.kind) {
    case 'rep':
      return { ...base, title: item.name, subtitle: null, count: `${u.rep} / ${u.reps ?? ''}`.replace(/ \/ $/, ''), setLabel, movement: null, next };
    case 'hold':
      return { ...base, title: item.name, subtitle: u.side ? (u.side === 'left' ? (ko ? '왼쪽' : 'Left side') : ko ? '오른쪽' : 'Right side') : null, count: item.kind === 'hold' ? `${item.holdSec}${ko ? '초' : ' s'}` : null, setLabel, movement: null, next };
    case 'rest':
      return { ...base, title: ko ? '휴식' : 'Rest', subtitle: item.name, count: null, setLabel, movement: null, next };
    case 'switch':
      return { ...base, title: ko ? '반대쪽' : 'Other side', subtitle: item.name, count: null, setLabel, movement: null, next };
    case 'between':
      return { ...base, title: ko ? '다시 한 번' : 'Again', subtitle: item.name, count: null, setLabel: null, movement: null, next };
    default:
      return { ...base, title: item.name, subtitle: describeItem(item, lang), count: null, setLabel: null, movement: null, next };
  }
}
