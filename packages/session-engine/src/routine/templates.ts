import type { Lang } from '../types';
import {
  DEFAULT_REST_SEC,
  DEFAULT_SEC_PER_COUNT,
  DEFAULT_SEC_PER_REP,
  type Bi,
  type Facing,
  type Movement,
  type PoomsaeItem,
  type RoutineItem,
  type RoutineTemplate,
} from './model';

/**
 * Taegeuk 1 Jang (태극 1장 / Taegeuk Il Jang): 18 counted movements, one 기합 (kihap), checked 2026-11-04.
 *
 * Sources (see docs/products/voice-life-companion/v1-spec.md section 2.4 for the full comparison):
 * - NBTKDA Taegeuk 1 poomsae chart (Kukkiwon terminology, primary data): https://www.nbtkda.com/s/Taegeuk-1-NBTKDA-Poomsae-Chart.pdf
 * - NBTKDA page: https://nbtkda.com/taegeuk-1 (stances and techniques, kihap on the final punch)
 * - Taekwondo Nation (18-movement numbering): https://www.taekwondonation.com/tae-kwon-do-white-belt-form-taegeuk-il-jang/
 * - Yonggi Taekwondo (18-movement numbering): https://www.sites.google.com/site/yonggitaekwondo/poomse/il-jang
 * - Wikipedia (technique inventory): https://en.wikipedia.org/wiki/Taegeuk_Il_Jang
 * - Kukkiwon Taegeuk 1 page (symbolism only): https://www.kukkiwon.or.kr/eng/board/read?boardManagementNo=55&boardNo=1347
 * The Kukkiwon Taekwondo Textbook (Poomsae volume) is the most authoritative source but is not online; none of the
 * opened sources was a Kukkiwon or World Taekwondo movement list. Facings are derived from the stated turns, start = N.
 * Movements 14 and 16 are a front kick followed by a punch, counted as one movement. The kihap is on movement 18.
 */
const T1_STEPS: Array<{ no: number; face: Facing; turn?: Bi; stance: Bi; tech: Bi; kihap?: boolean }> = [
  { no: 1, face: 'W', turn: { ko: '왼쪽으로 90도', en: 'turn 90° left' }, stance: { ko: '왼발 앞서기', en: 'left walking stance' }, tech: { ko: '아래막기', en: 'low block' } },
  { no: 2, face: 'W', stance: { ko: '오른발 앞서기', en: 'right walking stance' }, tech: { ko: '몸통지르기', en: 'middle punch' } },
  { no: 3, face: 'E', turn: { ko: '오른쪽으로 180도', en: 'turn 180° right' }, stance: { ko: '오른발 앞서기', en: 'right walking stance' }, tech: { ko: '아래막기', en: 'low block' } },
  { no: 4, face: 'E', stance: { ko: '왼발 앞서기', en: 'left walking stance' }, tech: { ko: '몸통지르기', en: 'middle punch' } },
  { no: 5, face: 'N', turn: { ko: '왼쪽으로 90도', en: 'turn 90° left' }, stance: { ko: '왼발 앞굽이', en: 'left front stance' }, tech: { ko: '아래막기', en: 'low block' } },
  { no: 6, face: 'N', stance: { ko: '왼발 앞굽이', en: 'left front stance' }, tech: { ko: '몸통지르기', en: 'middle punch' } },
  { no: 7, face: 'E', turn: { ko: '오른쪽으로 90도', en: 'turn 90° right' }, stance: { ko: '오른발 앞서기', en: 'right walking stance' }, tech: { ko: '몸통안막기', en: 'middle inside block' } },
  { no: 8, face: 'E', stance: { ko: '왼발 앞서기', en: 'left walking stance' }, tech: { ko: '몸통지르기', en: 'middle punch' } },
  { no: 9, face: 'W', turn: { ko: '왼쪽으로 180도', en: 'turn 180° left' }, stance: { ko: '왼발 앞서기', en: 'left walking stance' }, tech: { ko: '몸통안막기', en: 'middle inside block' } },
  { no: 10, face: 'W', stance: { ko: '오른발 앞서기', en: 'right walking stance' }, tech: { ko: '몸통지르기', en: 'middle punch' } },
  { no: 11, face: 'N', turn: { ko: '오른쪽으로 90도', en: 'turn 90° right' }, stance: { ko: '오른발 앞굽이', en: 'right front stance' }, tech: { ko: '아래막기', en: 'low block' } },
  { no: 12, face: 'N', stance: { ko: '오른발 앞굽이', en: 'right front stance' }, tech: { ko: '몸통지르기', en: 'middle punch' } },
  { no: 13, face: 'W', turn: { ko: '왼쪽으로 90도', en: 'turn 90° left' }, stance: { ko: '왼발 앞서기', en: 'left walking stance' }, tech: { ko: '얼굴막기', en: 'high block' } },
  { no: 14, face: 'W', stance: { ko: '오른발 앞서기', en: 'right walking stance' }, tech: { ko: '앞차기, 몸통지르기', en: 'front kick, middle punch' } },
  { no: 15, face: 'E', turn: { ko: '오른쪽으로 180도', en: 'turn 180° right' }, stance: { ko: '오른발 앞서기', en: 'right walking stance' }, tech: { ko: '얼굴막기', en: 'high block' } },
  { no: 16, face: 'E', stance: { ko: '왼발 앞서기', en: 'left walking stance' }, tech: { ko: '앞차기, 몸통지르기', en: 'front kick, middle punch' } },
  { no: 17, face: 'N', turn: { ko: '왼쪽으로 90도', en: 'turn 90° left' }, stance: { ko: '왼발 앞굽이', en: 'left front stance' }, tech: { ko: '아래막기', en: 'low block' } },
  { no: 18, face: 'N', stance: { ko: '오른발 앞굽이', en: 'right front stance' }, tech: { ko: '몸통지르기', en: 'middle punch' }, kihap: true },
];

export const TAEGEUK_1_MOVEMENTS: readonly Movement[] = T1_STEPS.map((s) => ({
  id: `t1-${s.no}`,
  no: s.no,
  stance: s.stance,
  technique: s.tech,
  facing: s.face,
  ...(s.turn ? { turn: s.turn } : {}),
  ...(s.kihap ? { kihap: true } : {}),
}));

export const TAEGEUK_1_NAME: Bi = { ko: '태극 1장', en: 'Taegeuk 1' };

/** A fresh Taegeuk 1 item (deep copy so a session can edit it). */
export function poomsaeItem(lang: Lang, id: string, repeat = 1, secPerCount = DEFAULT_SEC_PER_COUNT): PoomsaeItem {
  return {
    kind: 'poomsae',
    id,
    name: TAEGEUK_1_NAME[lang],
    repeat,
    secPerCount,
    movements: TAEGEUK_1_MOVEMENTS.map((m) => ({ ...m })),
  };
}

interface BuiltinDef {
  id: string;
  name: Bi;
  build(lang: Lang): RoutineItem[];
}

const hold = (id: string, name: Bi, lang: Lang, holdSec: number, perSide: boolean, sets = 1, restSec = 10): RoutineItem => ({
  kind: 'hold',
  id,
  name: name[lang],
  holdSec,
  sets,
  perSide,
  restSec,
});

const ex = (id: string, name: Bi, lang: Lang, reps: number, sets: number, secPerRep = DEFAULT_SEC_PER_REP, restSec = DEFAULT_REST_SEC): RoutineItem => ({
  kind: 'exercise',
  id,
  name: name[lang],
  reps,
  sets,
  secPerRep,
  restSec,
});

export const BUILTIN_ROUTINES: readonly BuiltinDef[] = [
  {
    id: 'routine-stretching',
    name: { ko: '스트레칭', en: 'Stretching' },
    build: (l) => [
      hold('s1', { ko: '목 스트레칭', en: 'Neck stretch' }, l, 20, true),
      hold('s2', { ko: '어깨 스트레칭', en: 'Shoulder stretch' }, l, 30, true),
      hold('s3', { ko: '햄스트링 스트레칭', en: 'Hamstring stretch' }, l, 30, true),
      hold('s4', { ko: '대퇴사두 스트레칭', en: 'Quad stretch' }, l, 30, true),
      hold('s5', { ko: '허리 비틀기', en: 'Spinal twist' }, l, 30, true),
      hold('s6', { ko: '아기 자세', en: "Child's pose" }, l, 40, false),
    ],
  },
  {
    id: 'routine-bodyweight',
    name: { ko: '맨몸 운동', en: 'Bodyweight workout' },
    build: (l) => [
      ex('b1', { ko: '스쿼트', en: 'Squats' }, l, 15, 3),
      ex('b2', { ko: '푸시업', en: 'Push-ups' }, l, 10, 3),
      ex('b3', { ko: '런지', en: 'Lunges' }, l, 12, 3),
      hold('b4', { ko: '플랭크', en: 'Plank' }, l, 45, false, 3, 30),
    ],
  },
  {
    id: 'routine-taegeuk-1',
    name: TAEGEUK_1_NAME,
    build: (l) => [poomsaeItem(l, 'p1', 1)],
  },
];

/** Built-in routine templates in the requested language. */
export function builtinRoutines(lang: Lang): RoutineTemplate[] {
  return BUILTIN_ROUTINES.map((b) => ({ id: b.id, name: b.name[lang], lang, items: b.build(lang), builtin: true }));
}
