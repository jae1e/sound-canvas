import { z } from 'zod';

import { contextSchema } from '@vlc/llm';

/**
 * Eval case format. Case files are JSON arrays in `cases/<task>.json`. `ko`/`en` is the language of the user (input text);
 * `tags` describe what the case stresses and drive the per-tag breakdown in the report.
 */
export const TAGS = [
  'real', // an utterance or note the user actually produced on the device
  'asr', // speech-recognition error or homophone in the heard text
  'honorific', // polite / formal Korean
  'casual', // casual Korean or colloquial English
  'mixed', // ko/en mixed utterance
  'ambiguous', // should ask for confirmation / clarification
  'oos', // out of scope: not a command / not in the source
  'numbers', // number or duration handling
  'hard', // hard to undo action
] as const;

const lang = z.enum(['ko', 'en']);
const base = { id: z.string().regex(/^[a-z_]+-(ko|en)-\d{3}$/), lang, tags: z.array(z.enum(TAGS)), note: z.string().optional() };

/** Expected arguments of a flat action. Only listed keys are compared. Labels compare squashed (case/space/punctuation-insensitive). */
export const argsSchema = z
  .object({ target: z.string(), label: z.string(), from: z.string(), seconds: z.number(), count: z.number(), flag: z.boolean() })
  .partial();

const alignCase = z.object({
  ...base,
  task: z.literal('align'),
  input: z.object({ hypotheses: z.array(z.string()).min(1).max(5), lang, context: contextSchema }),
  expect: z.object({
    /** Flat action type, or "none" for not-a-command. */
    type: z.string(),
    args: argsSchema.optional(),
    /** Must the system ask the user to confirm before acting? */
    needsConfirmation: z.boolean(),
  }),
});

const commandCase = z.object({
  ...base,
  task: z.literal('command'),
  input: z.object({ utterance: z.string(), lang, context: contextSchema }),
  expect: z.object({
    kind: z.enum(['action', 'clarify', 'not_command']),
    type: z.string().optional(),
    args: argsSchema.optional(),
  }),
});

const itemExpect = z.object({
  kind: z.enum(['exercise', 'hold', 'rest', 'poomsae']),
  /** Any one of these substrings (case-insensitive) must appear in the item name. Omit for rest/poomsae. */
  nameAny: z.array(z.string()).optional(),
  reps: z.number().optional(),
  sets: z.number().optional(),
  holdSec: z.number().optional(),
  restSec: z.number().optional(),
  sec: z.number().optional(),
  perSide: z.boolean().optional(),
  repeat: z.number().optional(),
});

const setupCase = z.object({
  ...base,
  task: z.literal('routine_setup'),
  input: z.object({ text: z.string(), lang }),
  expect: z.object({
    /** Items that must appear, in this order (other items may be interleaved). */
    items: z.array(itemExpect).default([]),
    minItems: z.number().optional(),
    maxItems: z.number().optional(),
    /** Total routine length window in minutes (for "about 20 minutes" style requests). */
    totalMinutes: z.object({ min: z.number(), max: z.number() }).optional(),
    /** True when the request cannot be fulfilled as asked (for example an unknown poomsae): the model must flag it or return a validation error. */
    needsConfirmation: z.boolean().optional(),
  }),
});

const correctionCase = z.object({
  ...base,
  task: z.literal('correction'),
  input: z.object({
    note: z.string(),
    lang,
    /** Routine fixture (see fixtures.ts): "taegeuk1" or "mixed". */
    fixture: z.enum(['taegeuk1', 'mixed']),
    practice: z.object({ itemId: z.string().optional(), movementNo: z.number().optional() }).optional(),
  }),
  expect: z.object({
    scope: z.enum(['movement', 'item', 'routine']),
    itemId: z.string().optional(),
    movementNo: z.number().optional(),
    side: z.enum(['left', 'right', 'both', 'none']).optional(),
    /** Any one substring must appear in the Korean cue (and, separately, the English cue if cueEnAny is given). */
    cueKoAny: z.array(z.string()).optional(),
    cueEnAny: z.array(z.string()).optional(),
    needsConfirmation: z.boolean().optional(),
  }),
});

const travelCase = z.object({
  ...base,
  task: z.literal('travel_qa'),
  input: z.object({ question: z.string(), lang, landmark: z.enum(['gyeongbokgung', 'deoksugung', 'jogyesa', 'bosingak', 'cheonggyecheon']) }),
  expect: z.object({
    /** True when the fixture source text answers the question. */
    answerable: z.boolean(),
    /** Each inner array is a group of alternatives (any one must appear in the answer); every group must be satisfied. Compared after squashing. */
    mustInclude: z.array(z.array(z.string())).default([]),
    /** None of these may appear in the answer (invented facts, wrong numbers). */
    mustNotInclude: z.array(z.string()).default([]),
  }),
});

export const evalCase = z.discriminatedUnion('task', [alignCase, commandCase, setupCase, correctionCase, travelCase]);
export type EvalCase = z.infer<typeof evalCase>;
export type TaskKey = EvalCase['task'];
