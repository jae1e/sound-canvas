import type { Target } from '@vlc/session-engine';
import type { RoutineItem } from '@vlc/session-engine';
import { z } from 'zod';

import { langSchema } from '../context';
import { bad, jsonSchemaOf, ok, type Task } from '../task';

export const correctionInput = z.object({
  /** The note as said or typed. */
  note: z.string().max(400),
  lang: langSchema,
  /** The routine the note may belong to (see `correctionItems`). */
  items: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        kind: z.enum(['exercise', 'hold', 'rest', 'poomsae']),
        movements: z.array(z.object({ id: z.string(), no: z.number(), technique: z.string(), stance: z.string() })).max(60).optional(),
      }),
    )
    .max(40),
  /** What the user is practicing right now (item id, movement number being counted), when known. */
  practice: z.object({ itemId: z.string().optional(), movementNo: z.number().optional() }).optional(),
});
export type CorrectionInput = z.input<typeof correctionInput>;

/** Builds the compact `items` payload from a routine. Movement names are given in the user's language only. */
export function correctionItems(items: readonly RoutineItem[], lang: 'ko' | 'en'): CorrectionInput['items'] {
  return items
    .filter((i) => i.kind !== 'rest')
    .map((i) => ({
      id: i.id,
      name: i.name,
      kind: i.kind,
      ...(i.kind === 'poomsae' ? { movements: i.movements.map((m) => ({ id: m.id, no: m.no, technique: m.technique[lang], stance: m.stance[lang] })) } : {}),
    }));
}

const out = z.object({
  scope: z.enum(['movement', 'item', 'routine']),
  itemId: z.string(),
  movementNo: z.number(),
  side: z.enum(['left', 'right', 'both', 'none']),
  /** Body part in English, lowercase ("hand", "knee", "hip"), "" if none. */
  part: z.string(),
  cueKo: z.string(),
  cueEn: z.string(),
  needsConfirmation: z.boolean(),
  question: z.string(),
});

export interface CorrectionProposal {
  target: Target;
  side: 'left' | 'right' | 'both' | undefined;
  part: string | undefined;
  cue: { ko: string; en: string };
  needsConfirmation: boolean;
  question: string;
}

const SYSTEM = `You turn a practitioner's personal correction note into a short voice cue that the app plays just before the movement it belongs to. Answer with ONE JSON object.

- scope: "movement" (a numbered movement of a poomsae/form: set itemId and movementNo), "item" (a whole exercise/hold/form: set itemId, movementNo 0), or "routine" (applies everywhere or unclear: itemId "", movementNo 0).
- Find the movement from what the note says: a number ("5번 동작", "movement 5"), a technique or stance name ("아래막기", "front kick"). If the note names no movement, use the movement being practiced (practice.movementNo) if given; else the practiced item; else "routine". If a technique name matches several movements and the note does not decide between them, choose the practiced movement if it is among them, otherwise set needsConfirmation=true and put a short question in the user's language in "question".
- side: left | right | both | none, as the cue should emphasise it (the side that SHOULD act, e.g. "오른손 먼저 나가야되는데 자꾸 왼손이 나가요" -> right). part: the body part in English lowercase ("hand", "foot", "knee", "hip", ...) or "".
- cueKo and cueEn: a very short imperative cue (2-4 words) ending with "!", in both languages ("오른손 먼저!", "right hand first!"). Do not repeat the problem, give the instruction.
- needsConfirmation=false and question="" unless the target is genuinely ambiguous.`;

export const correctionTask: Task<z.output<typeof correctionInput>, CorrectionProposal> = {
  name: 'correction',
  inputSchema: correctionInput,
  maxTokens: 200,
  buildPrompt(input) {
    const lines = [`language: ${input.lang}`, 'routine:'];
    for (const it of input.items) {
      lines.push(`- ${it.id}: ${it.name} (${it.kind})${it.movements ? ' movements: ' + it.movements.map((m) => `${m.no}=${m.technique}/${m.stance}`).join(', ') : ''}`);
    }
    if (input.practice?.itemId) lines.push(`practicing: ${input.practice.itemId}${input.practice.movementNo ? `, movement ${input.practice.movementNo}` : ''}`);
    lines.push(`note: ${input.note}`);
    return { system: SYSTEM, user: lines.join('\n') };
  },
  outputSchema: () => jsonSchemaOf(out),
  validate(raw, input) {
    const p = out.safeParse(raw);
    if (!p.success) return bad('schema');
    const o = p.data;
    const cueKo = o.cueKo.trim();
    const cueEn = o.cueEn.trim();
    if (!cueKo || !cueEn || cueKo.length > 30 || cueEn.length > 40) return bad('bad_cue');
    let target: Target;
    if (o.scope === 'routine') target = { kind: 'routine' };
    else {
      const item = input.items.find((i) => i.id === o.itemId);
      if (!item) return bad('unknown_item');
      if (o.scope === 'item') target = { kind: 'item', itemId: item.id };
      else {
        const no = Math.round(o.movementNo);
        const m = item.movements?.find((x) => x.no === no);
        if (!m) return bad('unknown_movement');
        target = { kind: 'movement', itemId: item.id, movementId: m.id, no };
      }
    }
    return ok({
      target,
      side: o.side === 'none' ? undefined : o.side,
      part: o.part.trim() || undefined,
      cue: { ko: cueKo, en: cueEn },
      needsConfirmation: o.needsConfirmation,
      question: o.needsConfirmation ? o.question.trim() : '',
    });
  },
};
