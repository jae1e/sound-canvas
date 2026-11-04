import { routeUtterance } from '@vlc/llm';

import { WorkController, type NativePort, type StorePort } from '../../../apps/mobile/src/work/controller';
import { Transcript, type MeteredTransport } from './harness';

const T0 = 1_700_000_000_000;

/** Work Partner cooking session: deterministic commands, a misrecognized timer, an ambiguous one, a free-form request. */
export async function workCooking(transport: MeteredTransport): Promise<Transcript> {
  const tr = new Transcript(
    'Scenario 1: Work Partner, cooking session with misrecognized timers',
    'Real `WorkController` + session engine. Each turn goes through `routeUtterance`: deterministic parsing first, the `align` LLM task only when hypotheses disagree or the speech is out of grammar. Confirmation is a bounded yes/no (20 s, default do nothing).',
  );
  const spoken: string[] = [];
  const events: Array<{ kind: string; payload: any }> = [];
  const clock = { now: T0 };
  const native = { isRunning: () => true, async start() {}, async stop() {}, speak: (t: string) => spoken.push(t), stopSpeaking() {}, scheduleCue() {}, cancelCue() {}, ackCue: () => true };
  const store: StorePort = { saveSession() {}, appendEvent: (kind, payload) => events.push({ kind, payload }), createJournal() {}, deleteJournal() {} };
  let n = 0;
  const c = new WorkController(native as unknown as NativePort, store, { now: () => clock.now, newId: () => `id${++n}`, settings: () => ({ nudgeLevel: 'normal', focusBreakEnabled: false, focusBreakMinutes: 50 }) });
  c.createDraft({ lang: 'ko', title: '저녁 요리', steps: [] });
  c.begin();
  for (const label of ['파스타', '샐러드']) c.dispatch({ type: 'add_task', label });
  spoken.length = 0;
  let pendingQuestion = false;

  const stateOf = () => {
    const s = c.state().session!;
    const timers = Object.values(s.timers).filter((t) => t.state === 'running' || t.state === 'paused').map((t) => `${t.label} ${Math.round((t.durationMs - t.accumulatedMs - (t.runningSince !== undefined ? clock.now - t.runningSince : 0)) / 1000)}s ${t.state}`);
    const tasks = Object.values(s.tasks).map((t) => `${t.label}:${t.status}`);
    return `timers [${timers.join(', ')}] tasks [${tasks.join(', ')}]`;
  };

  async function say(text: string, alts?: string[], lang: 'ko' | 'en' = 'ko', note?: string) {
    const hyps = alts ? [text, ...alts] : [text];
    const before = { spoken: spoken.length, events: events.length, calls: transport.calls.length };
    const route = routeUtterance(c.state().session!, hyps, lang);
    const answersQuestion = pendingQuestion && /^(네|응|아니|yes|no)/i.test(text);
    c.onFinal(text, hyps, lang);
    await transport.settle();
    clock.now += 4000;
    const newEvents = events.slice(before.events);
    const action = [...newEvents].reverse().find((e) => e.kind === 'action')?.payload?.action ?? newEvents.find((e) => e.kind === 'action')?.payload?.intent?.action;
    const call = transport.calls[before.calls];
    pendingQuestion = spoken.slice(before.spoken).some((x) => /\?$/.test(x.trim()));
    const failed = newEvents.find((e) => e.kind === 'utterance' && e.payload.outcome === 'llm' && !e.payload.ok);
    tr.add({
      heard: text,
      alternatives: alts,
      path: answersQuestion ? 'pending confirmation (local yes/no, no LLM)' : route.path === 'llm' ? `LLM fallback (${route.why})${failed ? ` -> failed: ${failed.payload.reason}, deterministic/retry` : ''}` : `deterministic (${route.why})`,
      ...(action ? { action: JSON.stringify(action) } : {}),
      state: stateOf(),
      spoken: spoken.slice(before.spoken),
      ...(call ? { llm: { task: call.task, ms: call.ms, promptTokens: call.promptTokens, completionTokens: call.completionTokens } } : {}),
      ...(note ? { note } : {}),
    });
  }

  await say('파스타 10분 타이머');
  await say('리조트 5분 타이머', ['리조또 5분 타이머'], 'ko', 'The device case. The cooking lexicon contains 리조또, so `chooseHypothesis` picks the right alternative with no LLM call.');
  await say('쿠키 5분 타이머', ['쿠기 5분 타이머'], 'ko', 'Both alternatives parse, with different labels that the lexicon does not know: this is where the LLM is needed.');
  await say('네', undefined, 'ko', 'Answer to the confirmation question, handled locally.');
  await say('파스타 다 됐어');
  await say('아까 그 파스타 타이머 2분만 더 늘려줄래', undefined, 'ko', 'Free-form phrasing the grammar does not cover.');
  await say('how long should the rice rest after cooking?', undefined, 'en', 'A question nothing can answer: the model maps it to no action and the app says so honestly.');
  await say('cancel the cookie timer', undefined, 'en', 'Hard to undo: always confirmed.');
  await say('no', undefined, 'en');
  c.dispose();
  return tr;
}
