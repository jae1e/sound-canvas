import { poomsaeItem, type Lang, type RoutineItem } from '@vlc/session-engine';

import { LANDMARK_FIXTURES } from '../../../apps/mobile/src/travel/landmarkFixtures';

/** Routine fixtures referenced by correction cases. Item ids are stable: p1 (Taegeuk 1), e1, e2, h1, h2. */
export function routineFixture(name: 'taegeuk1' | 'mixed', lang: Lang): RoutineItem[] {
  const ko = lang === 'ko';
  if (name === 'taegeuk1') return [poomsaeItem(lang, 'p1')];
  return [
    { kind: 'hold', id: 'h1', name: ko ? '스트레칭' : 'Stretching', holdSec: 30, sets: 1, perSide: true, restSec: 10 },
    { kind: 'exercise', id: 'e1', name: ko ? '스쿼트' : 'Squats', reps: 12, sets: 3, secPerRep: 3, restSec: 30 },
    { kind: 'exercise', id: 'e2', name: ko ? '푸시업' : 'Pushups', reps: 10, sets: 3, secPerRep: 3, restSec: 30 },
    { kind: 'hold', id: 'h2', name: ko ? '플랭크' : 'Plank', holdSec: 30, sets: 2, perSide: false, restSec: 20 },
    poomsaeItem(lang, 'p1'),
  ];
}

/** Source text for a fixture landmark, as the travel mode would pass it to the model: overview plus facts. */
export function landmarkSource(key: string, lang: Lang): { name: string; sourceText: string } {
  const f = LANDMARK_FIXTURES.find((x) => x.key === key);
  if (!f) throw new Error(`unknown landmark fixture ${key}`);
  const facts = (f.facts[lang] ?? []).map((x) => x.value).join('. ');
  return { name: f.name[lang], sourceText: [f.overview[lang], facts].filter(Boolean).join(' ') };
}
