import { builtinRoutines, type Correction, type Lang, type RoutineTemplate } from '@vlc/session-engine';

import { RoutineController, type RoutineNativePort, type RoutineStorePort } from '../../../apps/mobile/src/routine/controller';
import { Transcript, type MeteredTransport } from './harness';

export function routineFakes() {
  const spoken: string[] = [];
  let running = true;
  const native: RoutineNativePort = {
    isRunning: () => running,
    start: async () => void (running = true),
    stop: async () => void (running = false),
    speak: (t) => void spoken.push(t),
    stopSpeaking: () => undefined,
    prepare: async (clips) => ({ clips: clips.map((c) => ({ text: c.text, durationMs: 400, ok: true })), failed: [], engine: 'platform' }),
    schedule: () => undefined,
    cancel: () => undefined,
  };
  const db = { corrections: [] as Correction[], routines: [] as RoutineTemplate[], runs: [] as unknown[], events: [] as string[] };
  const store: RoutineStorePort = {
    listCorrections: (tid) => db.corrections.filter((c) => c.templateId === tid),
    saveCorrection: (c) => void (db.corrections = [...db.corrections.filter((x) => x.id !== c.id), c]),
    deleteCorrection: (id) => void (db.corrections = db.corrections.filter((c) => c.id !== id)),
    setFixed: (id, fixed) => void (db.corrections = db.corrections.map((c) => (c.id === id ? { ...c, fixed } : c))),
    addShown: () => undefined,
    saveRoutine: (t) => void (db.routines = [...db.routines.filter((x) => x.id !== t.id), t]),
    listRoutines: () => db.routines,
    getRoutine: (id) => db.routines.find((r) => r.id === id) ?? null,
    touchUsed: () => undefined,
    startRun: (r) => void db.runs.push(r),
    finishRun: () => undefined,
    lastRun: () => null,
    appendEvent: (k) => void db.events.push(k),
    createJournal: () => undefined,
  };
  let now = 1_000_000;
  let n = 0;
  const c = new RoutineController(native, store, { now: () => now, newId: () => `id${++n}`, level: () => 'full' });
  return { c, spoken, db, advance: (ms: number) => (now += ms) };
}

const tpl = (id: string, lang: Lang) => builtinRoutines(lang).find((r) => r.id === id)!;

/** Free-form voice setup of a routine, then a run with deviations. */
export async function routineSetupAndRun(transport: MeteredTransport): Promise<Transcript> {
  const tr = new Transcript(
    'Scenario 2: set up a routine by free-form voice, then run it with deviations',
    'Real `RoutineController`. Setup text the deterministic parser cannot place goes to the `routine_setup` task; the model output is validated against the routine schema and shown as an editable preview (never started automatically). Live utterances the grammar misses go to the `command` task in routine mode.',
  );
  const f = routineFakes();
  const describeDraft = () => {
    const d = f.c.state().draft;
    return d ? `${d.items.length} items: ${d.items.map((i) => (i.kind === 'exercise' ? `${i.name} ${i.reps}x${i.sets} rest ${i.restSec}s` : i.kind === 'hold' ? `${i.name} ${i.holdSec}s x${i.sets}` : i.kind === 'rest' ? `rest ${i.sec}s` : i.name)).join('; ')}${d.assumed.length ? ` | notes: ${d.assumed.join(' / ')}` : ''}` : '(no draft)';
  };

  async function setup(text: string, lang: Lang, path: string) {
    const before = { spoken: f.spoken.length, calls: transport.calls.length };
    f.c.onFinal(text, lang);
    await transport.settle();
    const call = transport.calls[before.calls];
    tr.add({ heard: text, path: call ? `${path} -> LLM routine_setup (draft is shown for editing, nothing starts automatically)` : path, state: describeDraft(), spoken: f.spoken.slice(before.spoken), ...(call ? { llm: { task: call.task, ms: call.ms, promptTokens: call.promptTokens, completionTokens: call.completionTokens } } : {}) });
  }

  await f.c.startVoiceSetup('ko');
  await setup('오늘은 하체 위주로 20분 정도', 'ko', 'deterministic parse is junk (a goal, not a list), so the parse is not trusted');
  const draft = f.c.state().draft;
  if (draft && draft.items.length > 0) {
    const saved = f.c.saveDraft('하체 20분', draft.items, 'ko');
    f.c.stopVoiceSetup?.();
    await f.c.start(saved);
  } else {
    await f.c.start(tpl('routine-bodyweight', 'ko'));
    tr.add({ heard: '(setup produced nothing; falling back to the built-in bodyweight routine to continue)', path: 'fallback', spoken: [] });
  }

  async function live(text: string, lang: Lang = 'ko') {
    const before = { spoken: f.spoken.length, calls: transport.calls.length, dev: f.c.state().run?.deviations.length ?? 0 };
    f.advance(4000);
    f.c.onFinal(text, lang);
    await transport.settle();
    const run = f.c.state().run!;
    const call = transport.calls[before.calls];
    const dev = run.deviations.slice(before.dev).map((d) => `${d.kind}${d.detail ? ' ' + d.detail : ''}`);
    tr.add({
      heard: text,
      path: call ? `deterministic missed -> LLM ${call.task}` : 'deterministic',
      action: dev.length ? dev.join(', ') : undefined,
      state: `phase ${f.c.state().phase}, items: ${run.items.map((i) => (i.kind === 'exercise' ? `${i.name} ${i.reps}x${i.sets}` : i.name)).join('; ')}`,
      spoken: f.spoken.slice(before.spoken),
      ...(call ? { llm: { task: call.task, ms: call.ms, promptTokens: call.promptTokens, completionTokens: call.completionTokens } } : {}),
    });
  }

  await live('다섯 개 더');
  await live('이거 건너뛰어');
  await live('너무 빠른데 좀 천천히 할게요', 'ko');
  await live('다리가 너무 후들거려서 잠깐 쉬어야겠어요', 'ko');
  await live('오늘 운동은 이만 접을게요', 'ko');
  await live('네', 'ko');
  const run = f.c.state().run;
  tr.add({ heard: '(summary)', path: 'engine', state: run ? `ended ${f.c.state().phase}, deviations: ${run.deviations.map((d) => d.kind).join(', ') || 'none'}; ${f.c.state().summaryLine ?? ''}` : 'no run', spoken: [] });
  return tr;
}

/** Taegeuk 1 practice where the user adds the right-hand correction note. */
export async function taegeukCorrection(transport: MeteredTransport): Promise<Transcript> {
  const tr = new Transcript(
    'Scenario 3: Taegeuk 1 practice, user adds the right-hand correction note',
    'Real `RoutineController` on the built-in Taegeuk 1 routine. A note that names or implies its movement is attached deterministically (current movement when practising). A technique name that matches several movements opens the on-screen picker and asks the `correction` task, which can resolve it from the practice context.',
  );
  const f = routineFakes();
  await f.c.start(tpl('routine-taegeuk-1', 'ko'));
  f.advance(3000); // counting movement 2 (middle punch)

  async function note(text: string, expectPick: boolean) {
    const before = { spoken: f.spoken.length, calls: transport.calls.length, corr: f.db.corrections.length };
    f.c.onFinal(text, 'ko');
    await transport.settle();
    const s = f.c.state();
    const added = f.db.corrections.slice(before.corr);
    const call = transport.calls[before.calls];
    tr.add({
      heard: text,
      path: call ? 'deterministic found several matching movements -> LLM correction' : 'deterministic (detectCorrectionNote + attachCorrection)',
      action: added.length ? added.map((c) => `correction cue "${c.cue}" side=${c.side ?? '-'} part=${c.part ?? '-'} movement=${c.movementNo ?? 'item/routine'}`).join('; ') : expectPick && s.pick ? `picker open with ${s.pick.candidates.length} candidates (movements ${s.pick.candidates.map((c) => (c.kind === 'movement' ? c.no : '-')).join(',')})` : undefined,
      state: `corrections stored: ${f.db.corrections.length}`,
      spoken: f.spoken.slice(before.spoken),
      ...(call ? { llm: { task: call.task, ms: call.ms, promptTokens: call.promptTokens, completionTokens: call.completionTokens } } : {}),
    });
  }

  await note('오른손 먼저 나가야되는데 자꾸 왼손이 나가요', false);
  await note('문제: 아래막기 할 때 왼손이 나가요', true);
  f.advance(1000);
  return tr;
}
