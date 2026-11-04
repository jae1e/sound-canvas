import { z } from 'zod';

import { defaultConfirmQuestion, flatFields, HARD_TO_UNDO, type Flat, mapFlat, type Mapped, type Mode } from '../actions';
import { contextSchema, formatContext, langSchema, turnsSchema } from '../context';
import { bad, jsonSchemaOf, ok, type Task } from '../task';
import { actionReference, FIELD_GUIDE } from './command-prompt';

export const commandInput = z.object({
  utterance: z.string().max(300),
  lang: langSchema,
  context: contextSchema,
  recentTurns: turnsSchema,
});
export type CommandInput = z.input<typeof commandInput>;

const outFor = (mode: Mode) =>
  z.object({
    kind: z.enum(['action', 'clarify', 'not_command']),
    ...flatFields(mode),
    /** Short question in the user's language when `kind` is clarify (or when an action is risky). */
    question: z.string(),
  });

export type CommandResult =
  | { kind: 'action'; mapped: Mapped; needsConfirmation: boolean; question: string; flat: Flat }
  | { kind: 'clarify'; question: string }
  | { kind: 'not_command' };

const SYSTEM = `You map ONE free-form spoken utterance (Korean or English, casual or polite, possibly with recognition errors) to exactly one command of a hands-free assistant, or decide that it is not a command. Answer with ONE JSON object.

- kind "action": the utterance clearly asks for one allowed action. Fill type and fields.
- kind "clarify": it is probably a command but a needed detail is missing or ambiguous (which timer, how long, which exercise). Set type "none" and put a short question in the user's language in "question".
- kind "not_command": chit-chat, a question the assistant cannot act on, or unrelated speech. Set type "none", question "".
- Use only names that appear in the context for "target". If two things match equally, ask (clarify).
- Hard-to-undo actions (cancel, end, skip) are still "action"; put a short confirmation question in "question".
- Do not do more than one action.

{FIELDS}

{ACTIONS}

Example (work mode, timers: 파스타 (2:00 left); 달걀 (4:00 left)): "2분 더 줘"
-> {"kind":"clarify","type":"none","target":"","label":"","from":"","seconds":0,"count":0,"flag":false,"question":"파스타와 달걀 중 어느 타이머에 2분을 더할까요?"}
Example (routine mode): "make it a bit slower"
-> {"kind":"action","type":"tempo_slower","target":"","label":"","from":"","seconds":0,"count":0,"flag":false,"question":""}`;

export const commandTask: Task<z.output<typeof commandInput>, CommandResult> = {
  name: 'command',
  inputSchema: commandInput as z.ZodType<z.output<typeof commandInput>>,
  maxTokens: 140,
  buildPrompt(input) {
    const lines = [`language: ${input.lang}`, formatContext(input.context)];
    if (input.recentTurns.length) lines.push('recent: ' + input.recentTurns.map((t) => `"${t.heard}"${t.reply ? ` -> "${t.reply}"` : ''}`).join(' | '));
    lines.push(`utterance: ${input.utterance}`);
    const system = SYSTEM.replace('{FIELDS}', FIELD_GUIDE).replace('{ACTIONS}', actionReference(input.context.mode));
    return { system, user: lines.join('\n') };
  },
  outputSchema: (input) => jsonSchemaOf(outFor(input.context.mode)),
  validate(raw, input) {
    const p = outFor(input.context.mode).safeParse(raw);
    if (!p.success) return bad('schema');
    const o = p.data;
    if (o.kind === 'not_command') return ok({ kind: 'not_command' });
    if (o.kind === 'clarify') return o.question.trim() ? ok({ kind: 'clarify', question: o.question.trim() }) : bad('clarify_without_question');
    const m = mapFlat(o, input.context.mode);
    if (!m.ok) return bad(m.reason);
    if (m.value === null) return bad('action_without_type');
    const needs = HARD_TO_UNDO.has(o.type);
    return ok({ kind: 'action', mapped: m.value, needsConfirmation: needs, question: needs ? o.question.trim() || defaultConfirmQuestion(o, input.lang === 'ko') : '', flat: o });
  },
};
