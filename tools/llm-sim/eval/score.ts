import type { AlignResult, CommandResult, CorrectionProposal, RoutineSetupResult, TaskOutcome, TravelQaResult } from '@vlc/llm';
import { routineSeconds, type RoutineItem } from '@vlc/session-engine';

import type { EvalCase } from './schema';

/** Case-, space- and punctuation-insensitive comparison key (same idea as the engine's `squash`). */
export const squash = (s: string) => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export interface Score {
  pass: boolean;
  /** Model output parsed and matched the output schema (a semantic validator rejection still counts as valid JSON). */
  jsonValid: boolean;
  /** The task validator accepted the output (nothing to apply otherwise). */
  accepted: boolean;
  /** Task-specific booleans: exact action, args, clarification correctness, groundedness, ... */
  checks: Record<string, boolean>;
  /** Short human summary of what the model produced. */
  actual: string;
  /** Short note on why a case failed. */
  why?: string;
}

type Outcome = TaskOutcome<'align'> | TaskOutcome<'command'> | TaskOutcome<'routine_setup'> | TaskOutcome<'correction'> | TaskOutcome<'travel_qa'>;

const isJsonValid = (o: Outcome) => o.ok || (o.reason === 'invalid_output' && o.detail !== 'schema');

function argsOk(expected: Record<string, unknown> | undefined, actual: Record<string, unknown>): { ok: boolean; why: string } {
  if (!expected) return { ok: true, why: '' };
  for (const [k, v] of Object.entries(expected)) {
    const a = actual[k];
    const same = typeof v === 'string' ? squash(String(a ?? '')) === squash(v) : typeof v === 'number' ? Math.round(Number(a)) === v : a === v;
    if (!same) return { ok: false, why: `${k}: expected ${JSON.stringify(v)}, got ${JSON.stringify(a)}` };
  }
  return { ok: true, why: '' };
}

export function scoreCase(c: EvalCase, o: Outcome): Score {
  const jsonValid = isJsonValid(o);
  const fail = (actual: string, why: string, checks: Record<string, boolean> = {}): Score => ({ pass: false, jsonValid, accepted: o.ok, checks, actual, why });
  const rejected = !o.ok ? `${o.reason}${o.detail ? ':' + o.detail : ''}` : '';

  switch (c.task) {
    case 'align': {
      if (!o.ok) return fail(rejected, rejected, { exactAction: false, args: false, confirm: false });
      const v = (o as TaskOutcome<'align'> & { ok: true }).value as AlignResult;
      const exactAction = v.flat.type === c.expect.type;
      const a = exactAction ? argsOk(c.expect.args, v.flat as unknown as Record<string, unknown>) : { ok: false, why: '' };
      const confirm = v.needsConfirmation === c.expect.needsConfirmation;
      const why = !exactAction ? `type ${v.flat.type}, expected ${c.expect.type}` : !a.ok ? a.why : !confirm ? `needsConfirmation ${v.needsConfirmation}, expected ${c.expect.needsConfirmation}` : undefined;
      return { pass: exactAction && a.ok && confirm, jsonValid, accepted: true, checks: { exactAction, args: a.ok, confirm, ...(c.expect.needsConfirmation ? { askedWhenShould: v.needsConfirmation } : { quietWhenShould: !v.needsConfirmation }) }, actual: `${v.flat.type} ${JSON.stringify({ t: v.flat.target, l: v.flat.label, s: v.flat.seconds, n: v.flat.count })} conf=${v.needsConfirmation}`, ...(why ? { why } : {}) };
    }
    case 'command': {
      if (!o.ok) return fail(rejected, rejected, { kind: false, exactAction: false, args: false });
      const v = (o as { value: CommandResult }).value;
      const kind = v.kind === c.expect.kind;
      let exactAction = true;
      let args = true;
      let why: string | undefined = kind ? undefined : `kind ${v.kind}, expected ${c.expect.kind}`;
      if (c.expect.kind === 'action') {
        if (v.kind !== 'action') {
          exactAction = false;
          args = false;
        } else {
          exactAction = c.expect.type === undefined || v.flat.type === c.expect.type;
          const a = exactAction ? argsOk(c.expect.args, v.flat as unknown as Record<string, unknown>) : { ok: false, why: '' };
          args = a.ok;
          if (!exactAction) why = `type ${v.flat.type}, expected ${c.expect.type}`;
          else if (!a.ok) why = a.why;
        }
      }
      const actual = v.kind === 'action' ? `action ${v.flat.type} ${JSON.stringify({ t: v.flat.target, l: v.flat.label, f: v.flat.from, s: v.flat.seconds, n: v.flat.count })}` : v.kind === 'clarify' ? `clarify "${v.question}"` : 'not_command';
      return { pass: kind && exactAction && args, jsonValid, accepted: true, checks: { kind, exactAction, args, clarifyCorrect: (v.kind === 'clarify') === (c.expect.kind === 'clarify'), ...(c.expect.kind === 'clarify' ? { askedWhenShould: v.kind === 'clarify' } : { quietWhenShould: v.kind !== 'clarify' }) }, actual, ...(why ? { why } : {}) };
    }
    case 'routine_setup': {
      const flagExpected = c.expect.needsConfirmation === true;
      if (!o.ok) {
        // An unsupported request may legitimately end in a validator rejection (nothing is applied).
        const okReject = flagExpected && o.reason === 'invalid_output';
        return { pass: okReject, jsonValid, accepted: false, checks: { flagged: okReject, items: okReject }, actual: rejected, ...(okReject ? {} : { why: rejected }) };
      }
      const v = (o as { value: RoutineSetupResult }).value;
      const items = v.template.items;
      const nameOk = (it: RoutineItem, any?: string[]) => !any || any.length === 0 || any.some((s) => it.name.toLowerCase().includes(s.toLowerCase()));
      const fieldOk = (it: RoutineItem, e: (typeof c.expect.items)[number]) => {
        const g = it as unknown as Record<string, unknown>;
        for (const k of ['reps', 'sets', 'holdSec', 'restSec', 'sec', 'perSide', 'repeat'] as const) {
          const want = e[k];
          if (want !== undefined && g[k] !== want) return false;
        }
        return true;
      };
      let cursor = 0;
      const missing: string[] = [];
      for (const e of c.expect.items) {
        let found = -1;
        for (let i = cursor; i < items.length; i++) {
          const it = items[i]!;
          if (it.kind === e.kind && nameOk(it, e.nameAny) && fieldOk(it, e)) {
            found = i;
            break;
          }
        }
        if (found < 0) missing.push(`${e.kind}${e.nameAny ? '[' + e.nameAny.join('|') + ']' : ''}`);
        else cursor = found + 1;
      }
      const itemsOk = missing.length === 0;
      const minutes = routineSeconds(items) / 60;
      const timeOk = !c.expect.totalMinutes || (minutes >= c.expect.totalMinutes.min && minutes <= c.expect.totalMinutes.max);
      const countOk = (c.expect.minItems === undefined || items.length >= c.expect.minItems) && (c.expect.maxItems === undefined || items.length <= c.expect.maxItems);
      const flagOk = c.expect.needsConfirmation === undefined || v.needsConfirmation === c.expect.needsConfirmation;
      const why = !itemsOk ? `missing ${missing.join(', ')}` : !timeOk ? `${minutes.toFixed(1)} min outside ${c.expect.totalMinutes!.min}-${c.expect.totalMinutes!.max}` : !countOk ? `${items.length} items` : !flagOk ? `needsConfirmation ${v.needsConfirmation}` : undefined;
      return { pass: itemsOk && timeOk && countOk && flagOk, jsonValid, accepted: true, checks: { items: itemsOk, time: timeOk, count: countOk, flag: flagOk }, actual: `${items.length} items, ${minutes.toFixed(1)} min: ` + items.map((i) => i.name).join(', '), ...(why ? { why } : {}) };
    }
    case 'correction': {
      if (!o.ok) return fail(rejected, rejected, { scope: false, target: false, side: false, cue: false });
      const v = (o as { value: CorrectionProposal }).value;
      const scope = v.target.kind === c.expect.scope;
      const target = !scope ? false : (c.expect.itemId === undefined || (v.target.kind !== 'routine' && v.target.itemId === c.expect.itemId)) && (c.expect.movementNo === undefined || (v.target.kind === 'movement' && v.target.no === c.expect.movementNo));
      const side = c.expect.side === undefined || (v.side ?? 'none') === c.expect.side;
      const ko = !c.expect.cueKoAny || c.expect.cueKoAny.some((s) => v.cue.ko.includes(s));
      const en = !c.expect.cueEnAny || c.expect.cueEnAny.some((s) => v.cue.en.toLowerCase().includes(s.toLowerCase()));
      const confirm = c.expect.needsConfirmation === undefined || v.needsConfirmation === c.expect.needsConfirmation;
      const tgt = v.target.kind === 'movement' ? `movement ${v.target.itemId}#${v.target.no}` : v.target.kind === 'item' ? `item ${v.target.itemId}` : 'routine';
      const bad = [!scope && 'scope', scope && !target && 'target', !side && 'side', !ko && 'cueKo', !en && 'cueEn', !confirm && 'confirm'].filter(Boolean);
      return { pass: bad.length === 0, jsonValid, accepted: true, checks: { scope, target, side, cue: ko && en, confirm }, actual: `${tgt} side=${v.side ?? 'none'} "${v.cue.ko}" / "${v.cue.en}" confirm=${v.needsConfirmation}`, ...(bad.length ? { why: `wrong: ${bad.join(', ')}` } : {}) };
    }
    case 'travel_qa': {
      if (!o.ok) return fail(rejected, rejected, { answerable: false, included: false, noInvention: false });
      const v = (o as { value: TravelQaResult }).value;
      const rawAnswerable = (() => {
        try {
          return (JSON.parse(o.raw) as { answerable?: boolean }).answerable === true;
        } catch {
          return false;
        }
      })();
      const answerable = v.answered === c.expect.answerable;
      const text = squash(v.text);
      const included = !c.expect.answerable || c.expect.mustInclude.every((g) => g.some((s) => text.includes(squash(s))));
      const rawText = v.text.toLowerCase();
      const noInvention = c.expect.mustNotInclude.every((s) => !rawText.includes(s.toLowerCase()) && (squash(s) === '' || !text.includes(squash(s))));
      // The validator can rescue a hallucination (the model said answerable but the quote or numbers were not in the source).
      const rescued = !c.expect.answerable && rawAnswerable && !v.answered;
      const bad = [!answerable && (c.expect.answerable ? 'refused an answerable question' : 'answered an unanswerable question'), !included && 'missing required fact', !noInvention && 'invented fact'].filter(Boolean);
      return { pass: bad.length === 0, jsonValid, accepted: true, checks: { answerable, included, noInvention, rescued, notInSourceCorrect: c.expect.answerable || (!v.answered && v.grounding !== 'ok') }, actual: `${v.answered ? 'answered' : 'not in source'} (${v.grounding}): ${v.text.slice(0, 120)}`, ...(bad.length ? { why: bad.join('; ') } : {}) };
    }
  }
}
