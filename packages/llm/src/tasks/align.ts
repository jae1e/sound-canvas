import { z } from 'zod';

import { defaultConfirmQuestion, flatFields, HARD_TO_UNDO, type Flat, mapFlat, type Mapped, type Mode } from '../actions';
import { contextSchema, formatContext, langSchema, turnsSchema } from '../context';
import { bad, jsonSchemaOf, ok, type Task } from '../task';
import { actionReference, FIELD_GUIDE } from './command-prompt';

export const alignInput = z.object({
  /** Recognizer n-best list, top hypothesis first. */
  hypotheses: z.array(z.string().max(300)).min(1).max(5),
  lang: langSchema,
  context: contextSchema,
  recentTurns: turnsSchema,
});
export type AlignInput = z.input<typeof alignInput>;

const confidence = z.enum(['high', 'medium', 'low']);
const outFor = (mode: Mode) =>
  z.object({
    /** The utterance as the user most likely meant it (a chosen alternative or a corrected version). */
    text: z.string(),
    ...flatFields(mode),
    confidence,
    needsConfirmation: z.boolean(),
    confirmQuestion: z.string(),
  });

export interface AlignResult {
  text: string;
  /** Null when the utterance is not a command (`type: none`). */
  mapped: Mapped | null;
  confidence: z.infer<typeof confidence>;
  needsConfirmation: boolean;
  confirmQuestion: string;
  /** The raw flat record, for logging and the eval. */
  flat: Flat;
}

const SYSTEM = `You are the intent resolver of a hands-free voice assistant used in Korean and English while cooking, working or working out. A speech recognizer returned up to 5 alternative transcripts of ONE utterance (best first). Decide what the user meant and answer with ONE JSON object.

Rules:
- The recognizer often picks a wrong but similar-sounding word (e.g. "리조트" for "리조또", "pasta" for "pastor"). Prefer the alternative, or a minimal correction, that matches the task/timer names in the context. Never invent names that are not in the context, except for a new timer/task/step the user is clearly creating.
- "text": the utterance as meant (copy the chosen alternative or your minimal correction).
- type "none" when it is not a command for this assistant (chit-chat, unrelated speech, a question).
- confidence: high | medium | low.
- needsConfirmation: true when the alternatives disagree about a name or number that matters, when confidence is low, or when the action is hard to undo (cancel, end, skip). Otherwise false.
- confirmQuestion: one short yes/no question in the user's language when needsConfirmation is true, else "".

{FIELDS}

{ACTIONS}

Example (work mode, tasks: 파스타; timers: 파스타 (1:10 left)):
heard: 1. 리조트 5분 타이머  2. 리조또 5분 타이머  (no 리조또 in context)
-> {"text":"리조또 5분 타이머","type":"start_timer","target":"","label":"리조또","from":"","seconds":300,"count":0,"flag":false,"confidence":"medium","needsConfirmation":true,"confirmQuestion":"리조또 5분 타이머 맞나요?"}
Example: heard: 1. 파스타 다 됐어
-> {"text":"파스타 다 됐어","type":"task_done","target":"파스타","label":"","from":"","seconds":0,"count":0,"flag":false,"confidence":"high","needsConfirmation":false,"confirmQuestion":""}`;

function systemFor(mode: Mode): string {
  return SYSTEM.replace('{FIELDS}', FIELD_GUIDE).replace('{ACTIONS}', actionReference(mode));
}

export const alignTask: Task<z.output<typeof alignInput>, AlignResult> = {
  name: 'align',
  inputSchema: alignInput as z.ZodType<z.output<typeof alignInput>>,
  maxTokens: 160,
  buildPrompt(input) {
    const lines = [`language: ${input.lang}`, formatContext(input.context)];
    if (input.recentTurns.length) lines.push('recent: ' + input.recentTurns.map((t) => `"${t.heard}"${t.reply ? ` -> "${t.reply}"` : ''}`).join(' | '));
    lines.push('heard:', ...input.hypotheses.map((h, i) => `${i + 1}. ${h}`));
    return { system: systemFor(input.context.mode), user: lines.join('\n') };
  },
  outputSchema: (input) => jsonSchemaOf(outFor(input.context.mode)),
  validate(raw, input) {
    const p = outFor(input.context.mode).safeParse(raw);
    if (!p.success) return bad('schema');
    const o = p.data;
    const m = mapFlat(o, input.context.mode);
    if (!m.ok) return bad(m.reason);
    const ko = input.lang === 'ko';
    const needs = m.value !== null && (o.needsConfirmation || o.confidence === 'low' || HARD_TO_UNDO.has(o.type));
    return ok({
      text: o.text,
      mapped: m.value,
      confidence: o.confidence,
      needsConfirmation: needs,
      confirmQuestion: needs ? o.confirmQuestion.trim() || defaultConfirmQuestion(o, ko) : '',
      flat: o,
    });
  },
};
