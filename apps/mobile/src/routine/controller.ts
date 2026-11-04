import {
  applyCommand,
  attachCorrection,
  beginRun,
  collectPhrases,
  correctionPreCues,
  correctionSummaryLine,
  currentIndex,
  describeItem,
  detectCorrectionNote,
  estimateClipMs,
  baseVocabulary,
  hasSavableChanges,
  isStopWord,
  makeCorrection,
  needsLlm,
  parseRoutineIntent,
  parseRoutineText,
  pickCorrectionToFix,
  planTimeline,
  routineSeconds,
  spanAt,
  startRun,
  summarizeRun,
  templateWithChanges,
  unitsOf,
  withCursor,
  builtinRoutines,
  type Correction,
  type Lang,
  type PacingLevel,
  type ParsedRoutine,
  type RoutineCommand,
  type RoutineItem,
  type RoutineTemplate,
  type RunState,
  type Target,
  type Timeline,
} from '@vlc/session-engine';

import type { EventKind } from '../db/repos/events';
import type { NewJournalEntry } from '../db/repos/journal';
import { askLlm } from '../llm/askLlm';

export interface PrepareResult {
  clips: { text: string; durationMs: number; ok: boolean }[];
  failed: string[];
  engine: string;
}

export interface SegmentSummary {
  segmentId: string;
  /** Item and set the segment belongs to (from the planner's segment name). */
  label: string;
  beats: number;
  played: number;
  missing: number;
  cancelled: boolean;
  meanDriftMs: number;
  p95DriftMs: number;
  maxDriftMs: number;
}

/** The native session as the routine controller sees it. Faked in tests. */
export interface RoutineNativePort {
  isRunning(): boolean;
  start(lang: Lang): Promise<void>;
  stop(): Promise<void>;
  speak(text: string): void;
  /** Queue phrases for background synthesis in the session voice as soon as their text is known. */
  prewarm?(items: { text: string; lang: Lang; priority?: 'urgent' | 'soon' | 'normal' | 'background' }[]): void;
  stopSpeaking(): void;
  prepare(clips: { text: string; lang: Lang }[], onProgress: (done: number, total: number) => void): Promise<PrepareResult>;
  schedule(segmentId: string, startEpochMs: number, beats: { offsetMs: number; text: string; lang: Lang; tag: string }[]): void;
  cancel(segmentId: string | null): void;
}

export interface RoutineStorePort {
  listCorrections(templateId: string): Correction[];
  saveCorrection(c: Correction): void;
  deleteCorrection(id: string): void;
  setFixed(id: string, fixed: boolean): void;
  addShown(played: ReadonlyMap<string, number>): void;
  saveRoutine(t: RoutineTemplate): void;
  listRoutines(): RoutineTemplate[];
  getRoutine(id: string): RoutineTemplate | null;
  touchUsed(id: string): void;
  startRun(r: { id: string; templateId: string; templateName: string; lang: Lang; startedAt: number }): void;
  finishRun(id: string, r: { endedAt: number; endedEarly: boolean; summary: unknown }): void;
  lastRun(): { templateId: string; templateName: string; lang: Lang } | null;
  appendEvent(kind: EventKind, payload: unknown): void;
  createJournal(entry: NewJournalEntry): void;
}

export interface RoutineEnv {
  now(): number;
  newId(): string;
  level(): PacingLevel;
}

export type RoutinePhase = 'idle' | 'preparing' | 'running' | 'paused' | 'ended';
export type ListenState = 'off' | 'starting' | 'on' | 'error';

export interface RoutineTurn {
  id: number;
  heard: string;
  reply: string | null;
}

export interface RoutineControllerState {
  phase: RoutinePhase;
  run: RunState | null;
  runId: string | null;
  level: PacingLevel;
  draft: ParsedRoutine | null;
  /** The mic is on for voice routine setup ("루틴 만들기", "start my last routine") outside a run. */
  voiceSetup: boolean;
  prepare: { done: number; total: number } | null;
  /** Non-fatal pacing problems shown to the user (missing clips, scheduling errors). */
  notice: string | null;
  listen: ListenState;
  listenError: string | null;
  partial: string;
  turns: RoutineTurn[];
  corrections: Correction[];
  /** A correction note whose movement is ambiguous: the UI lets the user pick one. */
  pick: { text: string; candidates: Target[] } | null;
  playedCues: Record<string, number>;
  segments: SegmentSummary[];
  /** After the end: offer "save changes to the template?". */
  offerSave: boolean;
  summaryLine: string | null;
  /** Epoch ms at which the current timeline starts (UI uses it for the countdown). */
  timelineStart: number | null;
  version: number;
}

const LEAD_IN_MS = 1500;
/** A correction said this soon after a movement started refers to the one before it. */
const JUST_FINISHED_MS = 1200;
const MAX_TURNS = 20;

const t2 = (lang: Lang, ko: string, en: string) => (lang === 'ko' ? ko : en);

/**
 * Routine session controller: owns the run state, pre-synthesizes the phrases, schedules the pacing timeline on the
 * native timer, runs the voice loop (live commands, correction notes) and persists corrections and run records.
 * All side effects go through ports.
 */
export class RoutineController {
  private s: RoutineControllerState = {
    phase: 'idle', run: null, runId: null, level: 'full', draft: null, voiceSetup: false, prepare: null, notice: null, listen: 'off', listenError: null,
    partial: '', turns: [], corrections: [], pick: null, playedCues: {}, segments: [], offerSave: false, summaryLine: null, timelineStart: null, version: 0,
  };
  private tl: Timeline | null = null;
  private clipMs = new Map<string, number>();
  private gen = 0;
  private turnSeq = 0;
  private lastPlayedCue: string | null = null;
  private startedAt = 0;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<(s: RoutineControllerState) => void>();

  constructor(
    private readonly native: RoutineNativePort,
    private readonly store: RoutineStorePort,
    private readonly env: RoutineEnv,
  ) {
    this.s.level = env.level();
  }

  // ------------------------------------------------------------ observation

  subscribe(fn: (s: RoutineControllerState) => void): () => void {
    this.listeners.add(fn);
    fn(this.s);
    return () => this.listeners.delete(fn);
  }

  state(): RoutineControllerState {
    return this.s;
  }

  /** True while a routine run owns the voice loop (the Work Partner controller then ignores transcripts). */
  isActive(): boolean {
    return this.s.phase === 'preparing' || this.s.phase === 'running' || this.s.phase === 'paused';
  }

  /** True while the routine controller wants the transcripts (a run, or voice setup). */
  isListening(): boolean {
    return this.isActive() || this.s.voiceSetup;
  }

  private set(patch: Partial<RoutineControllerState>): void {
    this.s = { ...this.s, ...patch, version: this.s.version + 1 };
    for (const fn of this.listeners) fn(this.s);
  }

  private get lang(): Lang {
    return this.s.run?.lang ?? 'en';
  }

  // ------------------------------------------------------------ setup

  /** Deterministic parse of typed or spoken routine text. Leftovers go to the (stub) LLM tier. */
  parseText(text: string, lang?: Lang): ParsedRoutine {
    const parsed = parseRoutineText(text, { idPrefix: `i${this.env.newId().slice(-4)}`, lang });
    this.set({ draft: parsed });
    this.store.appendEvent('routine', { what: 'parse', text, items: parsed.items.length, unparsed: parsed.unparsed.length });
    if (needsLlm(parsed)) {
      this.store.appendEvent('llm_needed', { heard: text, kind: 'routine_setup', unparsed: parsed.unparsed });
      void askLlm({ hypotheses: [text], lang: parsed.lang, kind: 'routine_setup', context: parsed.unparsed, recentTurns: [] }).catch(() => undefined);
    }
    return parsed;
  }

  /** Opens the mic for the voice "create routine" / "start my last routine" flow. Speaks only in answer to the user. */
  async startVoiceSetup(lang: Lang): Promise<void> {
    if (this.isActive() || this.s.voiceSetup) return;
    this.set({ voiceSetup: true, listen: 'starting', listenError: null, turns: [], partial: '' });
    try {
      if (!this.native.isRunning()) await this.native.start(lang);
      this.set({ listen: 'on' });
    } catch (e) {
      this.set({ voiceSetup: false, listen: 'error', listenError: String(e instanceof Error ? e.message : e) });
    }
  }

  async stopVoiceSetup(): Promise<void> {
    if (!this.s.voiceSetup) return;
    this.set({ voiceSetup: false, listen: 'off', partial: '' });
    try {
      if (!this.isActive() && this.native.isRunning()) await this.native.stop();
    } catch {
      // Best effort.
    }
  }

  private onSetupFinal(text: string, lang: Lang): void {
    const intent = parseRoutineIntent(text, lang);
    const reply = (r: string) => {
      this.say(r);
      this.pushTurn(text, r);
    };
    if (intent?.kind === 'start_last') {
      void this.startLast(lang).then((ok) => {
        if (!ok) reply(t2(lang, '아직 한 루틴이 없어요.', 'There is no previous routine yet.'));
      });
      return;
    }
    if (intent?.kind === 'create') {
      reply(t2(lang, '어떤 운동을 할까요? 예를 들어 스쿼트 15개 3세트, 플랭크 45초.', 'What would you like to do? For example, squats 15 reps 3 sets, plank 45 seconds.'));
      return;
    }
    const parsed = this.parseText(text, lang);
    if (parsed.items.length === 0) {
      reply(t2(lang, '이해하지 못했어요. 다시 말하거나 입력해 주세요.', 'I did not catch a routine. Say it again or type it.'));
      return;
    }
    const more = parsed.unparsed.length > 0 ? t2(lang, ` ${parsed.unparsed.length}개는 이해하지 못했어요.`, ` ${parsed.unparsed.length} part(s) were not understood.`) : '';
    reply(t2(lang, `${parsed.items.length}개 운동을 찾았어요.${more} 화면에서 확인해 주세요.`, `Found ${parsed.items.length} item(s).${more} Please check the preview.`));
  }

  setDraft(draft: ParsedRoutine | null): void {
    this.set({ draft });
  }

  /** Saves the draft (the user may have edited its items) as a template. */
  saveDraft(name: string, items: RoutineItem[], lang: Lang): RoutineTemplate {
    const tpl: RoutineTemplate = { id: `routine-${this.env.newId()}`, name: name.trim() || t2(lang, '내 루틴', 'My routine'), lang, items };
    this.store.saveRoutine(tpl);
    this.set({ draft: null });
    return tpl;
  }

  /** Built-in and saved routines, in the given language for built-ins. */
  allRoutines(lang: Lang): RoutineTemplate[] {
    return [...builtinRoutines(lang), ...this.store.listRoutines()];
  }

  findRoutine(id: string, lang: Lang): RoutineTemplate | null {
    return builtinRoutines(lang).find((r) => r.id === id) ?? this.store.getRoutine(id);
  }

  // ------------------------------------------------------------ start

  /** "어제 루틴 시작": the most recently started routine. Resolves false when there is none. */
  async startLast(lang: Lang): Promise<boolean> {
    const last = this.store.lastRun();
    const tpl = last ? this.findRoutine(last.templateId, last.lang) : null;
    if (!tpl) return false;
    await this.start(tpl);
    return true;
  }

  async start(template: RoutineTemplate): Promise<void> {
    if (this.isActive()) return;
    const level = this.env.level();
    const run = startRun(template, level);
    const runId = this.env.newId();
    this.clipMs = new Map();
    this.tl = null;
    this.set({
      phase: 'preparing', run, runId, level, draft: null, prepare: { done: 0, total: 0 }, notice: null, turns: [], pick: null, playedCues: {}, segments: [],
      offerSave: false, summaryLine: null, partial: '', corrections: this.store.listCorrections(template.id), timelineStart: null,
    });
    this.lastPlayedCue = null;
    this.startedAt = this.env.now();
    this.store.startRun({ id: runId, templateId: template.id, templateName: template.name, lang: template.lang, startedAt: this.startedAt });
    this.store.touchUsed(template.id);
    try {
      this.set({ listen: 'starting' });
      if (!this.native.isRunning()) await this.native.start(template.lang);
      this.set({ listen: 'on', listenError: null });
    } catch (e) {
      // No voice session: the run is still shown, but nothing can be paced or heard.
      this.set({ listen: 'error', listenError: String(e instanceof Error ? e.message : e), notice: t2(template.lang, '음성 세션을 시작하지 못해 소리 없이 진행해요.', 'The voice session did not start; running without sound.') });
    }
    await this.prepareClips();
    if (this.s.phase !== 'preparing') return;
    const begun = beginRun(this.s.run!);
    this.set({ run: begun, phase: 'running', prepare: null });
    this.replan(0, this.env.now() + 0, LEAD_IN_MS);
    this.startTicker();
  }

  private phrasesFor(run: RunState, level: PacingLevel): string[] {
    const preCues = correctionPreCues(this.s.corrections, run.items, run.lang);
    const set = new Set<string>(baseVocabulary(run.lang));
    for (const p of collectPhrases({ lang: run.lang, level, items: run.items, preCues, tempoFactor: run.tempoFactor })) set.add(p);
    for (const c of preCues) set.add(c.text);
    return [...set];
  }

  /** Pre-synthesizes every phrase the routine can say (cache hits are free). Never plays anything. */
  private async prepareClips(): Promise<void> {
    const run = this.s.run;
    if (!run || !this.native.isRunning()) return;
    const phrases = this.phrasesFor(run, this.s.level).filter((p) => !this.clipMs.has(p));
    if (phrases.length === 0) return;
    this.set({ prepare: { done: 0, total: phrases.length } });
    try {
      const r = await this.native.prepare(
        phrases.map((text) => ({ text, lang: run.lang })),
        (done, total) => this.set({ prepare: { done, total } }),
      );
      for (const c of r.clips) if (c.ok) this.clipMs.set(c.text, c.durationMs);
      this.store.appendEvent('routine', { what: 'prepared', engine: r.engine, total: phrases.length, failed: r.failed.length });
      if (r.failed.length > 0) {
        this.set({ notice: t2(run.lang, `${r.failed.length}개 문구는 미리 만들지 못했어요. 그 자리에서는 알림음이 나와요.`, `${r.failed.length} phrases could not be pre-made; a tone will play in their place.`) });
      }
    } catch (e) {
      this.store.appendEvent('error', { where: 'routine_prepare', message: String(e) });
      this.set({ notice: t2(run.lang, '미리 음성을 만들지 못했어요. 문구 대신 알림음이 나와요.', 'Could not pre-make the voice clips; tones will play in place of phrases.') });
    }
  }

  // ------------------------------------------------------------ pacing

  private clip = (text: string): number | undefined => this.clipMs.get(text);

  /**
   * Rebuilds the pacing timeline from a unit index and schedules it on the native timer (cancelling the old one).
   * `leadInMs` is silence before the first unit; a seamless re-plan passes 0 and the epoch where the next unit starts.
   */
  private replan(fromIndex: number, startAt: number, leadInMs: number): void {
    const run = this.s.run;
    if (!run) return;
    this.native.cancel(null);
    const tl = planTimeline(
      { lang: run.lang, level: this.s.level, items: run.items, tempoFactor: run.tempoFactor, preCues: correctionPreCues(this.s.corrections, run.items, run.lang), clipMs: this.clip, leadInMs },
      fromIndex,
    );
    this.tl = tl;
    this.gen++;
    this.set({ timelineStart: startAt });
    if (tl.droppedCues.length > 0) this.store.appendEvent('routine', { what: 'cues_dropped', ids: tl.droppedCues });
    if (!this.native.isRunning()) return;
    // One native segment per planner segment (item + set) so the drift summary is per set.
    let group: typeof tl.beats = [];
    const flush = () => {
      if (group.length === 0) return;
      const first = group[0]!;
      const id = `${this.s.runId}.${this.gen}.${first.segment}.${Math.round(first.atMs)}`;
      try {
        this.native.schedule(id, startAt + first.atMs, group.map((b) => ({ offsetMs: b.atMs - first.atMs, text: b.text, lang: run.lang, tag: b.cueId ? `cue:${b.cueId}` : b.unitKey })));
      } catch (e) {
        this.set({ notice: t2(run.lang, '박자를 예약하지 못했어요.', 'Could not schedule the pacing.') });
        this.store.appendEvent('error', { where: 'routine_schedule', message: String(e) });
      }
      group = [];
    };
    for (const b of tl.beats) {
      if (group.length > 0 && group[0]!.segment !== b.segment) flush();
      group.push(b);
    }
    flush();
  }

  private startTicker(): void {
    if (this.ticker) return;
    this.ticker = setInterval(() => this.tick(), 250);
  }

  private stopTicker(): void {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
  }

  /** Moves the cursor to the unit being performed; finishes the run after the closing unit. */
  tick(now = this.env.now()): void {
    const run = this.s.run;
    if (!run || this.s.phase !== 'running' || !this.tl || this.s.timelineStart === null) return;
    const span = spanAt(this.tl, now - this.s.timelineStart);
    if (!span) return;
    if (span.unit.kind === 'done' && now - this.s.timelineStart >= span.startMs + 1500) {
      this.finishRun(false);
      return;
    }
    if (run.cursor !== span.unit.key) this.set({ run: withCursor(run, span.unit.key) });
  }

  private syncCursor(): void {
    this.tick();
  }

  // ------------------------------------------------------------ commands

  /** Applies a live command (button or voice). Returns the spoken/shown reply. */
  exec(command: RoutineCommand): string | null {
    let run = this.s.run;
    if (!run || !this.isActive()) return null;
    this.syncCursor();
    run = this.s.run!;
    const now = this.env.now();
    const r = applyCommand(run, command, now);
    this.say(r.reply);
    if (!r.ok) return r.reply;
    this.set({ run: r.state });
    // An edit mid-session (swap, skip, repeat...) can introduce item names the cache has not seen: queue them now.
    if (r.replan) {
      const fresh = this.phrasesFor(r.state, this.s.level).filter((p) => !this.clipMs.has(p));
      if (fresh.length > 0) this.native.prewarm?.(fresh.map((text) => ({ text, lang: r.state.lang, priority: 'soon' as const })));
    }
    if (command.kind === 'end') {
      this.finishRun(true);
    } else if (command.kind === 'pause') {
      this.native.cancel(null);
      this.set({ phase: 'paused' });
    } else if (command.kind === 'resume') {
      this.set({ phase: 'running' });
      this.replan(currentIndex(r.state), now, LEAD_IN_MS);
    } else if (r.replan && this.s.phase === 'running') {
      this.replan(currentIndex(r.state), now, Math.max(LEAD_IN_MS, estimateClipMs(r.reply, run.lang) + 700));
    }
    return r.reply;
  }

  /** Changes the pacing level; missing phrases are synthesized first, then pacing continues from the current unit. */
  async setLevel(level: PacingLevel): Promise<void> {
    if (this.s.level === level) return;
    const run = this.s.run;
    this.set({ level });
    if (!run || !this.isActive()) return;
    const wasRunning = this.s.phase === 'running';
    this.syncCursor();
    this.native.cancel(null);
    await this.prepareClips();
    this.set({ prepare: null });
    if (wasRunning && this.s.phase === 'running') this.replan(currentIndex(this.s.run!), this.env.now(), LEAD_IN_MS);
  }

  private say(text: string): void {
    if (!text || !this.native.isRunning()) return;
    try {
      this.native.speak(text);
    } catch {
      // Speech is best effort; the reply is also shown on screen.
    }
  }

  // ------------------------------------------------------------ voice loop

  onPartial(text: string): void {
    if (!this.isListening()) return;
    this.set({ partial: text });
    // Priority stop: a stop word during counting pauses at once, without waiting for the final transcript.
    if (this.s.phase === 'running' && isStopWord(text)) this.exec({ kind: 'pause' });
  }

  onFinal(text: string, lang?: Lang): void {
    if (!text.trim() || !this.isListening()) return;
    this.set({ partial: '' });
    if (!this.isActive()) {
      this.onSetupFinal(text, lang ?? 'ko');
      return;
    }
    const row = (reply: string | null) => this.pushTurn(text, reply);
    const intent = parseRoutineIntent(text, lang ?? this.lang);
    if (intent?.kind === 'command') {
      row(this.exec(intent.command));
      return;
    }
    if (intent?.kind === 'fix') {
      row(this.fixLatest());
      return;
    }
    if (intent) {
      row(t2(this.lang, '루틴이 진행 중이에요. 끝낸 뒤에 해 주세요.', 'A routine is running. Please do that after it ends.'));
      return;
    }
    const note = detectCorrectionNote(text, lang ?? this.lang);
    if (note) {
      row(this.addCorrectionFromText(note.body));
      return;
    }
    this.store.appendEvent('unrecognized', { heard: text, where: 'routine' });
    row(null);
  }

  private pushTurn(heard: string, reply: string | null): void {
    const turn = { id: ++this.turnSeq, heard, reply };
    this.set({ turns: [turn, ...this.s.turns].slice(0, MAX_TURNS) });
  }

  // ------------------------------------------------------------ corrections

  private practiceContext() {
    const run = this.s.run;
    if (!run || !this.tl || this.s.timelineStart === null) return undefined;
    this.syncCursor();
    const off = this.env.now() - this.s.timelineStart;
    const span = spanAt(this.tl, off);
    if (!span) return undefined;
    const u = span.unit;
    const moves = this.tl.spans.filter((x) => x.unit.kind === 'move' && x.unit.itemId === u.itemId);
    const idx = moves.findIndex((x) => x.unit.key === u.key);
    return {
      itemId: u.itemId === 'end' ? undefined : u.itemId,
      movementId: u.movementId,
      previousMovementId: idx > 0 ? moves[idx - 1]!.unit.movementId : undefined,
      justFinished: u.kind === 'move' && off - span.startMs < JUST_FINISHED_MS,
    };
  }

  /**
   * Attaches a correction note to a movement/item/routine and stores it. Ambiguous targets open the picker
   * (and go to the LLM stub). Works during practice and in the editor (pass `practice: false`).
   */
  addCorrectionFromText(text: string, opts: { practice?: boolean; template?: RoutineTemplate } = {}): string | null {
    const run = this.s.run;
    const tpl = opts.template ?? run?.template;
    if (!tpl) return null;
    const lang = run?.lang ?? tpl.lang;
    const items = run?.items ?? tpl.items;
    const a = attachCorrection(text, items, lang, opts.practice === false ? undefined : this.practiceContext());
    if (a.target === null) {
      this.store.appendEvent('llm_needed', { heard: text, kind: 'routine_target', candidates: a.candidates });
      if (run) void askLlm({ hypotheses: [text], lang, kind: 'routine_target', context: a.candidates, recentTurns: [] }).catch(() => undefined);
      this.set({ pick: { text, candidates: a.candidates } });
      const reply = t2(lang, '어느 동작인지 화면에서 골라 주세요.', 'Please pick the movement on screen.');
      if (opts.practice !== false) this.say(reply);
      return reply;
    }
    return this.storeCorrection(text, a.target, tpl, lang, opts.practice !== false);
  }

  pickTarget(target: Target, template?: RoutineTemplate): void {
    const pick = this.s.pick;
    const tpl = template ?? this.s.run?.template;
    if (!pick || !tpl) return;
    this.set({ pick: null });
    this.storeCorrection(pick.text, target, tpl, this.s.run?.lang ?? tpl.lang);
  }

  cancelPick(): void {
    this.set({ pick: null });
  }

  /** Stores a correction for a chosen target outside a run (the editor). Never speaks. */
  storeCorrectionFor(text: string, target: Target, template: RoutineTemplate): string {
    return this.storeCorrection(text, target, template, template.lang, false);
  }

  private storeCorrection(text: string, target: Target, tpl: RoutineTemplate, lang: Lang, speak = true): string {
    const c = makeCorrection({ id: `cor-${this.env.newId()}`, templateId: tpl.id, text, lang, target, now: this.env.now() });
    this.store.saveCorrection(c);
    this.set({ corrections: [...this.s.corrections.filter((x) => x.templateId === tpl.id), c] });
    const where = c.movementNo !== undefined ? t2(lang, `${c.movementNo}번 동작`, `movement ${c.movementNo}`) : c.itemId ? t2(lang, '이 운동', 'this exercise') : t2(lang, '루틴 전체', 'the whole routine');
    this.store.createJournal({
      id: `j-${c.id}`,
      mode: 'work',
      source: 'user_note',
      text,
      taskId: c.movementId ? `${tpl.id}:${c.movementId}` : tpl.id,
      taskLabel: c.movementNo !== undefined ? `${tpl.name} · ${t2(lang, `${c.movementNo}번 동작`, `movement ${c.movementNo}`)}` : tpl.name,
      createdAt: c.createdAt,
    });
    // The new cue text is known now: start synthesizing it before the next unit boundary needs it.
    this.native.prewarm?.([{ text: c.cue, lang, priority: 'soon' }]);
    const reply = t2(lang, `${where}에 메모했어요. 다음부터 "${c.cue.replace(/!$/, '')}" 하고 알려드릴게요.`, `Noted for ${where}. I will cue "${c.cue.replace(/!$/, '')}" from now on.`);
    if (speak) this.say(reply);
    // Future pacing picks the new cue up at the next unit boundary without disturbing the rhythm.
    if (this.s.phase === 'running' && this.s.run && this.tl && this.s.timelineStart !== null) {
      void this.prepareClips().then(() => this.replanSeamless());
    }
    return reply;
  }

  /** Re-plans from the next unit boundary on the same grid. */
  private replanSeamless(): void {
    const run = this.s.run;
    if (!run || this.s.phase !== 'running' || !this.tl || this.s.timelineStart === null) return;
    this.syncCursor();
    const span = spanAt(this.tl, this.env.now() - this.s.timelineStart);
    if (!span) return;
    const units = unitsOf(this.s.run!);
    const idx = units.findIndex((u) => u.key === span.unit.key);
    if (idx < 0 || idx + 1 >= units.length) return;
    const startAt = this.s.timelineStart + span.endMs;
    if (startAt - this.env.now() < 400) return; // too close to the boundary: apply at the next opportunity
    this.replan(idx + 1, startAt, 0);
  }

  fixCorrection(id: string, fixed = true): void {
    this.store.setFixed(id, fixed);
    this.set({ corrections: this.s.corrections.map((c) => (c.id === id ? { ...c, fixed } : c)) });
    if (this.s.phase === 'running') this.replanSeamless();
  }

  deleteCorrection(id: string): void {
    this.store.deleteCorrection(id);
    this.set({ corrections: this.s.corrections.filter((c) => c.id !== id) });
    if (this.s.phase === 'running') this.replanSeamless();
  }

  /** Loads a template's corrections for the editor (outside a run). */
  loadCorrections(templateId: string): Correction[] {
    const list = this.store.listCorrections(templateId);
    if (!this.isActive()) this.set({ corrections: list });
    return list;
  }

  /** "이제 괜찮아": stops the cue that played last, or the one on the current movement. */
  private fixLatest(): string {
    const lang = this.lang;
    const ctx = this.practiceContext();
    const c = pickCorrectionToFix(this.s.corrections, { movementId: ctx?.movementId, lastPlayedId: this.lastPlayedCue ?? undefined });
    if (!c) return this.reply(t2(lang, '어느 교정 메모인지 모르겠어요. 편집 화면에서 완료로 표시해 주세요.', 'I am not sure which note. Mark it fixed in the editor.'));
    this.fixCorrection(c.id);
    return this.reply(t2(lang, `좋아요. "${c.cue.replace(/!$/, '')}" 알림은 이제 끌게요.`, `Great. I will stop the "${c.cue.replace(/!$/, '')}" cue.`));
  }

  private reply(text: string): string {
    this.say(text);
    return text;
  }

  // ------------------------------------------------------------ native events

  onPaceBeat(e: { tag?: string | null; source?: string; driftMs?: number }): void {
    const tag = e.tag ?? '';
    if (!tag.startsWith('cue:')) return;
    const id = tag.slice(4);
    this.lastPlayedCue = id;
    this.s.playedCues[id] = (this.s.playedCues[id] ?? 0) + 1;
  }

  onSegmentDone(e: Omit<SegmentSummary, 'label'>): void {
    const label = e.segmentId.split('.').slice(2).join('.').replace(/\.\d+$/, '');
    const row: SegmentSummary = { ...e, label };
    this.set({ segments: [...this.s.segments, row].slice(-60) });
    this.store.appendEvent('routine', { what: 'pace_segment', ...row });
  }

  onNativeStopped(): void {
    if (this.isListening()) this.set({ listen: 'off', voiceSetup: false });
  }

  // ------------------------------------------------------------ end

  /** Ends the run (all units done, or early). Stops pacing; the session summary and the save offer follow. */
  private finishRun(early: boolean): void {
    const run = this.s.run;
    if (!run || this.s.phase === 'ended') return;
    this.stopTicker();
    this.native.cancel(null);
    const ended: RunState = { ...run, status: 'ended', endedEarly: early || run.endedEarly };
    const played = new Map(Object.entries(this.s.playedCues));
    this.store.addShown(played);
    const line = correctionSummaryLine(played, this.s.corrections, run.lang);
    const summary = { ...summarizeRun(ended), cues: this.s.playedCues, segments: this.s.segments.length, tempoFactor: run.tempoFactor, deviations: run.deviations };
    this.store.finishRun(this.s.runId!, { endedAt: this.env.now(), endedEarly: early, summary });
    if (line) {
      this.store.createJournal({ id: `j-run-${this.s.runId}`, mode: 'work', source: 'generated_summary', text: `${run.template.name}: ${line}`, createdAt: this.env.now() });
    }
    this.set({ run: ended, phase: 'ended', summaryLine: line, offerSave: hasSavableChanges(ended), partial: '', timelineStart: null });
    this.say(t2(run.lang, early ? '루틴을 마쳤어요.' : '수고하셨어요.', early ? 'Routine ended.' : 'Well done.'));
  }

  /** Button: end now. */
  end(): void {
    if (this.isActive()) this.exec({ kind: 'end' });
  }

  /** After the summary: optionally save the session's changes to the template (default is not to), then reset. */
  async close(saveChanges: boolean): Promise<RoutineTemplate | null> {
    const run = this.s.run;
    let saved: RoutineTemplate | null = null;
    if (run && saveChanges && hasSavableChanges(run)) {
      const builtin = run.template.builtin === true;
      saved = templateWithChanges(run, builtin ? `routine-${this.env.newId()}` : run.template.id);
      if (builtin) saved = { ...saved, name: t2(run.lang, `${run.template.name} (내 버전)`, `${run.template.name} (mine)`) };
      this.store.saveRoutine(saved);
    }
    this.stopTicker();
    this.native.cancel(null);
    if (this.isActive()) this.finishRun(true);
    try {
      if (this.native.isRunning()) await this.native.stop();
    } catch {
      // Stopping is best effort.
    }
    this.tl = null;
    this.set({ phase: 'idle', run: null, runId: null, voiceSetup: false, listen: 'off', offerSave: false, summaryLine: null, segments: [], turns: [], timelineStart: null, prepare: null });
    return saved;
  }

  describe(item: RoutineItem, lang: Lang): string {
    return describeItem(item, lang);
  }

  secondsOf(items: RoutineItem[]): number {
    return routineSeconds(items);
  }
}
