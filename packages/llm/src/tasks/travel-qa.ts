import { z } from 'zod';

import { langSchema } from '../context';
import { bad, jsonSchemaOf, ok, type Task } from '../task';

export const travelQaInput = z.object({
  question: z.string().max(300),
  lang: langSchema,
  landmarkName: z.string().max(120),
  /** The only facts the answer may use. */
  sourceText: z.string().max(6000),
});
export type TravelQaInput = z.input<typeof travelQaInput>;

const out = z.object({
  answerable: z.boolean(),
  /** One or two short spoken sentences in the user's language; "" when not answerable. */
  answer: z.string(),
  /** The source sentence (copied exactly) that supports the answer; "" when not answerable. */
  quote: z.string(),
});

export type Grounding = 'ok' | 'not_in_source' | 'quote_missing' | 'number_missing';

export interface TravelQaResult {
  /** True when the source answers the question and the answer passed the grounding checks. */
  answered: boolean;
  /** Text to speak. When `answered` is false this is the fixed "source doesn't say" message, never model text. */
  text: string;
  grounding: Grounding;
}

export const notInSource = (lang: 'ko' | 'en', name: string): string =>
  lang === 'ko' ? `${name}에 대한 자료에는 그 내용이 나와 있지 않아요.` : `My source for ${name} doesn't say.`;

const squash = (s: string) => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const numbers = (s: string) => new Set(s.normalize('NFC').match(/\d+/g) ?? []);

const SYSTEM = `You answer a traveler's spoken question about one landmark, using ONLY the source text provided. Answer with ONE JSON object.

- If the source text contains the answer: answerable=true; "answer" is one or two short, natural spoken sentences in the user's language (Korean casual-polite 해요체, or plain English); "quote" is the supporting sentence copied EXACTLY from the source text.
- If the source text does not contain the answer, even partially or by implication: answerable=false, answer="", quote="". Never guess, never use outside knowledge, never add dates, numbers, names or opinions that are not in the source.
- The source may be in a different language than the question; translate faithfully, keeping numbers and names as given.
- Do not answer about other places.`;

export const travelQaTask: Task<z.output<typeof travelQaInput>, TravelQaResult> = {
  name: 'travel_qa',
  inputSchema: travelQaInput,
  maxTokens: 220,
  buildPrompt: (input) => ({ system: SYSTEM, user: `language: ${input.lang}\nlandmark: ${input.landmarkName}\nsource text:\n${input.sourceText}\n\nquestion: ${input.question}` }),
  outputSchema: () => jsonSchemaOf(out),
  validate(raw, input) {
    const p = out.safeParse(raw);
    if (!p.success) return bad('schema');
    const o = p.data;
    const none = (grounding: Grounding): TravelQaResult => ({ answered: false, text: notInSource(input.lang, input.landmarkName), grounding });
    if (!o.answerable || !o.answer.trim()) return ok(none('not_in_source'));
    const quote = squash(o.quote);
    if (quote.length < 4 || !squash(input.sourceText).includes(quote)) return ok(none('quote_missing'));
    const allowed = new Set([...numbers(input.sourceText), ...numbers(input.question)]);
    for (const n of numbers(o.answer)) if (!allowed.has(n)) return ok(none('number_missing'));
    return ok({ answered: true, text: o.answer.trim(), grounding: 'ok' });
  },
};
