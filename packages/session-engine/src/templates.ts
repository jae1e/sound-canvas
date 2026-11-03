import { z } from 'zod';
import type { Action } from './actions';
import type { Lang, Session } from './types';

/** A reusable plan: ordered steps with optional time estimates. Saved templates are single-language. */
export const planTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  lang: z.enum(['ko', 'en']).optional(),
  steps: z
    .array(z.object({ label: z.string().trim().min(1), estimateMs: z.number().int().positive().max(24 * 3600_000).optional() }))
    .min(1)
    .max(100),
});

export type PlanTemplate = z.infer<typeof planTemplateSchema>;

const MIN = 60_000;

interface BuiltinStep {
  ko: string;
  en: string;
  min?: number;
}
interface Builtin {
  id: string;
  name: { ko: string; en: string };
  steps: BuiltinStep[];
}

/** Example templates shipped with the app. They are plain activity plans, with no safety or health guidance. */
export const BUILTIN_TEMPLATES: readonly Builtin[] = [
  {
    id: 'builtin-focus',
    name: { ko: '집중 세션', en: 'Focus session' },
    steps: [
      { ko: '목표 하나 정하기', en: 'Pick one goal', min: 2 },
      { ko: '집중 블록 1', en: 'Focus block 1', min: 25 },
      { ko: '짧은 휴식', en: 'Short break', min: 5 },
      { ko: '집중 블록 2', en: 'Focus block 2', min: 25 },
      { ko: '정리와 메모', en: 'Wrap up and notes', min: 5 },
    ],
  },
  {
    id: 'builtin-furniture',
    name: { ko: '가구 조립', en: 'Furniture assembly' },
    steps: [
      { ko: '포장 풀고 부품 확인', en: 'Unpack and check the parts', min: 10 },
      { ko: '프레임 조립', en: 'Assemble the frame', min: 20 },
      { ko: '선반 끼우기', en: 'Attach the shelves', min: 15 },
      { ko: '문 달기', en: 'Attach the doors', min: 10 },
      { ko: '나사 마무리와 정리', en: 'Final tightening and cleanup', min: 5 },
    ],
  },
  {
    id: 'builtin-stretching',
    name: { ko: '스트레칭 루틴', en: 'Stretching routine' },
    steps: [
      { ko: '목 스트레칭', en: 'Neck stretch', min: 1 },
      { ko: '어깨 돌리기', en: 'Shoulder rolls', min: 1 },
      { ko: '팔 늘리기', en: 'Arm stretch', min: 1 },
      { ko: '허리 늘리기', en: 'Back stretch', min: 2 },
      { ko: '다리 스트레칭', en: 'Leg stretch', min: 2 },
      { ko: '마무리 호흡', en: 'Cool-down breathing', min: 2 },
    ],
  },
  {
    id: 'builtin-cooking',
    name: { ko: '요리 두 가지', en: 'Two-dish cooking' },
    steps: [
      { ko: '재료 손질', en: 'Prep the ingredients', min: 10 },
      { ko: '파스타 물 올리기', en: 'Start the pasta water', min: 8 },
      { ko: '소스 만들기', en: 'Make the sauce', min: 12 },
      { ko: '파스타 삶기', en: 'Cook the pasta', min: 9 },
      { ko: '샐러드 만들기', en: 'Make the salad', min: 6 },
      { ko: '접시에 담기', en: 'Plate both dishes', min: 4 },
    ],
  },
];

export function builtinTemplates(lang: Lang): PlanTemplate[] {
  return BUILTIN_TEMPLATES.map((b) => ({
    id: b.id,
    name: b.name[lang],
    lang,
    steps: b.steps.map((s) => ({ label: s[lang], ...(s.min !== undefined ? { estimateMs: s.min * MIN } : {}) })),
  }));
}

/** Plain step list captured from a session (for "save as template"), in plan order. */
export function templateFromSession(session: Session, name: string, id: string): PlanTemplate {
  const steps = Object.values(session.tasks)
    .filter((t) => t.order !== undefined && t.status !== 'cancelled')
    .sort((a, b) => (a.order as number) - (b.order as number))
    .map((t) => ({ label: t.label, ...(t.estimateMs !== undefined ? { estimateMs: t.estimateMs } : {}) }));
  return planTemplateSchema.parse({ id, name, lang: session.lang, steps });
}

/** The actions that load a template into a session. They go through the engine like any other action. */
export function templateActions(template: PlanTemplate): Action[] {
  return template.steps.map((s) => ({ type: 'add_step', label: s.label, ...(s.estimateMs !== undefined ? { estimateMs: s.estimateMs } : {}) }));
}
