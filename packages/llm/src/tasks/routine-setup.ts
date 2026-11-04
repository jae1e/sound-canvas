import { DEFAULT_REST_SEC, DEFAULT_SEC_PER_REP, poomsaeItem, type RoutineItem, type RoutineTemplate, routineItemSchema, routineSeconds } from '@vlc/session-engine';
import { z } from 'zod';

import { langSchema } from '../context';
import { bad, jsonSchemaOf, ok, type Task } from '../task';

export const routineSetupInput = z.object({
  /** Free-form description, typed or spoken. */
  text: z.string().max(600),
  lang: langSchema,
});
export type RoutineSetupInput = z.input<typeof routineSetupInput>;

const itemOut = z.object({
  kind: z.enum(['exercise', 'hold', 'rest', 'poomsae']),
  name: z.string(),
  reps: z.number(),
  sets: z.number(),
  secPerRep: z.number(),
  holdSec: z.number(),
  perSide: z.boolean(),
  restSec: z.number(),
  repeat: z.number(),
  formNo: z.number(),
});

const out = z.object({
  name: z.string(),
  /** Total length the user asked for, in minutes (0 when not stated). */
  targetMinutes: z.number(),
  items: z.array(itemOut),
  /** Short notes for the preview screen: what the model assumed because the user did not say. */
  assumptions: z.array(z.string()),
  needsConfirmation: z.boolean(),
  question: z.string(),
});

export interface RoutineSetupResult {
  template: RoutineTemplate;
  assumptions: string[];
  needsConfirmation: boolean;
  question: string;
  seconds: number;
}

const SYSTEM = `You turn a free-form workout / stretching / martial-arts-form description (Korean or English, spoken or typed) into a routine as ONE JSON object. The app shows it in an editable preview, so make sensible choices and list them in "assumptions".

Item kinds and fields (unused fields = 0 / false / ""):
- exercise: name, reps, sets, secPerRep (seconds per rep, default 3), restSec (rest between sets)
- hold: name, holdSec, sets, perSide (true for left+right), restSec
- rest: name ("휴식"/"Rest"), holdSec = rest seconds
- poomsae: only Taegeuk 1 (태극 1장) exists: formNo = 1, repeat = number of times. For any other form use needsConfirmation=true and no item for it.

Rules:
- Write names in the user's language. Only bodyweight/equipment-free exercises unless the user names equipment.
- Use the numbers the user gives. restSec when unstated: 30 ("short rests" = 20, "long rests" = 60). Reps 8-20, sets 2-4 for unstated amounts.
- "targetMinutes": the total time the user asked for (0 if none). If given, pick reps/sets/rests so the total is close to it (an exercise rep takes secPerRep seconds, plus rest between sets).
- A focus ("하체 위주", "upper body", "core") with no exercises named: choose 4-6 matching exercises.
- "warm up" / "cool down" / "스트레칭" -> a hold or short exercise item (for example 30-60 s).
- needsConfirmation=true with a short "question" in the user's language ONLY if something essential is impossible to guess; otherwise false and "".

Example: "warm up then 3 rounds of squats and pushups, short rests"
-> {"name":"Squats and pushups","targetMinutes":0,"items":[{"kind":"hold","name":"Warm up","reps":0,"sets":1,"secPerRep":0,"holdSec":60,"perSide":false,"restSec":0,"repeat":0,"formNo":0},{"kind":"exercise","name":"Squats","reps":12,"sets":3,"secPerRep":3,"holdSec":0,"perSide":false,"restSec":20,"repeat":0,"formNo":0},{"kind":"exercise","name":"Pushups","reps":10,"sets":3,"secPerRep":3,"holdSec":0,"perSide":false,"restSec":20,"repeat":0,"formNo":0}],"assumptions":["12 squats and 10 pushups per round","20 s rests"],"needsConfirmation":false,"question":""}`;

export const routineSetupTask: Task<z.output<typeof routineSetupInput>, RoutineSetupResult> = {
  name: 'routine_setup',
  inputSchema: routineSetupInput,
  maxTokens: 700,
  buildPrompt: (input) => ({ system: SYSTEM, user: `language: ${input.lang}\ntext: ${input.text}` }),
  outputSchema: () => jsonSchemaOf(out),
  validate(raw, input) {
    const p = out.safeParse(raw);
    if (!p.success) return bad('schema');
    const o = p.data;
    const items: RoutineItem[] = [];
    let n = 0;
    const id = () => `l${++n}`;
    const int = (x: number, min: number, fallback: number) => (Number.isFinite(x) && x >= min ? Math.round(x) : fallback);
    for (const it of o.items) {
      const name = it.name.trim();
      switch (it.kind) {
        case 'exercise':
          if (!name) return bad('missing_name');
          items.push({ kind: 'exercise', id: id(), name, reps: int(it.reps, 1, 10), sets: int(it.sets, 1, 1), secPerRep: it.secPerRep >= 0.5 ? it.secPerRep : DEFAULT_SEC_PER_REP, restSec: it.restSec >= 0 ? it.restSec : DEFAULT_REST_SEC });
          break;
        case 'hold':
          if (!name) return bad('missing_name');
          items.push({ kind: 'hold', id: id(), name, holdSec: it.holdSec >= 1 ? it.holdSec : 30, sets: int(it.sets, 1, 1), perSide: it.perSide, restSec: it.restSec >= 0 ? it.restSec : DEFAULT_REST_SEC });
          break;
        case 'rest':
          items.push({ kind: 'rest', id: id(), name: name || (input.lang === 'ko' ? '휴식' : 'Rest'), sec: it.holdSec >= 1 ? it.holdSec : DEFAULT_REST_SEC });
          break;
        case 'poomsae':
          if (Math.round(it.formNo) !== 1) return bad('unknown_poomsae');
          items.push(poomsaeItem(input.lang, id(), int(it.repeat, 1, 1)));
          break;
      }
    }
    if (items.length === 0) return bad('no_items');
    for (const it of items) if (!routineItemSchema.safeParse(it).success) return bad(`invalid_item:${it.name}`);
    const seconds = routineSeconds(items);
    if (seconds > 3 * 3600) return bad('too_long');
    const far = o.targetMinutes > 0 && Math.abs(seconds - o.targetMinutes * 60) > 0.4 * o.targetMinutes * 60;
    const ko = input.lang === 'ko';
    const assumptions = [...o.assumptions.map((a) => a.trim()).filter(Boolean)];
    if (far) assumptions.push(ko ? `요청한 ${o.targetMinutes}분과 달리 약 ${Math.round(seconds / 60)}분이에요` : `About ${Math.round(seconds / 60)} min, not the ${o.targetMinutes} you asked for`);
    return ok({
      template: { id: 'llm-routine', name: o.name.trim() || (ko ? '새 루틴' : 'New routine'), lang: input.lang, items },
      assumptions,
      needsConfirmation: o.needsConfirmation || far,
      question: o.question.trim(),
      seconds,
    });
  },
};
