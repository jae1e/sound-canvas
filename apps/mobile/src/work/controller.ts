import {
  apply,
  classifyDue,
  createSession,
  describeDue,
  describeNoteSaved,
  diffCues,
  dueEvents,
  isSuppressed,
  planCues,
  stepsOf,
  templateActions,
  templateFromSession,
  type Action,
  type ActionEnvelope,
  type Change,
  type DueEvent,
  type Lang,
  type NudgeLevel,
  type PlanTemplate,
  type PlannedCue,
  type Session,
  type TurnResult,
  describeCannotAnswer,
  describeChanges,
  describeRejection,
  handleUtterance,
} from '@vlc/session-engine';

import type { EventKind } from '../db/repos/events';
import type { NewJournalEntry } from '../db/repos/journal';
import { askLlm, isLlmAvailable, type LlmResult } from '../llm/askLlm';
import { CONFIRM_TTL_MS, cancelledMessage, parseYesNo, retryMessage } from '../llm/confirm';
import { routeUtterance, type Route } from '@vlc/llm';
import { summaryOf } from './view';
import type { WorkSummary } from './summary';

/** The native foreground session as the controller sees it. Implemented over the Expo module; faked in tests. */
export interface NativePort {
  isRunning(): boolean;
  start(lang: Lang): Promise<void>;
  stop(): Promise<void>;
  /** 'high' flushes whatever is being said; 'normal' queues. */
  speak(text: string, priority: 'high' | 'normal'): void;
  stopSpeaking(): void;
  /** Throws when no native session is running. */
  scheduleCue(id: string, atEpochMs: number, fallbackText: string): void;
  cancelCue(id: string): void;
  ackCue(id: string): boolean;
}

export interface StorePort {
  saveSession(session: Session, title: string | null): void;
  appendEvent(kind: EventKind, payload: unknown): void;
  createJournal(entry: NewJournalEntry): void;
  deleteJournal(id: string): void;
}

export interface WorkSettings {
  nudgeLevel: NudgeLevel;
  focusBreakEnabled: boolean;
  focusBreakMinutes: number;
}

export interface Env {
  now(): number;
  newId(): string;
  settings(): WorkSettings;
}

export interface TurnRow {
  id: number;
  at: number;
  heard: string;
  lang: Lang;
  outcome: TurnResult['outcome'] | 'correction';
  reply: string | null;
  /** Index of the n-best alternative that was used (0 = the recognizer's top hypothesis). */
  chosenIndex: number;
}

export type ListenState = 'off' | 'starting' | 'on' | 'error';

export interface ControllerState {
  session: Session | null;
  title: string | null;
  listen: ListenState;
  listenError: string | null;
  partial: string;
  turns: TurnRow[];
  canUndo: boolean;
  /** Events that came due while nothing could speak them (no native session); shown on screen. */
  missed: { key: string; text: string }[];
  /** Bumped on every change so React can re-derive. */
  version: number;
}

interface Snapshot {
  session: Session;
  journalId?: string;
  /** Whether this undo step came from a voice turn (the Correct button only rewinds those). */
  voice: boolean;
}

const MAX_UNDO = 20;
const MAX_TURNS = 40;
const DUE_TOLERANCE_MS = 400;
const END_CONFIRM_MS = 20_000;

export interface PlanStepInput {
  label: string;
  estimateMs?: number;
}

/**
 * Work Partner session controller: the one place that applies engine actions, persists the result after every applied
 * action, keeps the native cue scheduler in step with the plan, and runs the voice loop.
 *
 * All side effects go through ports so the whole thing is testable with fakes.
 */
export class WorkController {
  private session: Session | null = null;
  private title: string | null = null;
  private listen: ListenState = 'off';
  private listenError: string | null = null;
  private partial = '';
  private turns: TurnRow[] = [];
  private undo: Snapshot[] = [];
  private missed: { key: string; text: string }[] = [];
  private armed = new Map<string, number>();
  private plannedById = new Map<string, PlannedCue>();
  private version = 0;
  private turnSeq = 0;
  private ticker: ReturnType<typeof setInterval> | null = null;
  /** When the user first asked to end by voice; a second request within the window confirms it. */
  private endRequestedAt: number | null = null;
  /** An LLM-proposed action waiting for a spoken yes/no. Bounded by CONFIRM_TTL_MS; the default is to do nothing. */
  private pendingLlm: { action: Action; question: string; until: number } | null = null;
  private listeners = new Set<(s: ControllerState) => void>();
  private summaryListeners = new Set<(s: WorkSummary) => void>();

  constructor(
    private readonly native: NativePort,
    private readonly store: StorePort,
    private readonly env: Env,
  ) {}

  // ---------------------------------------------------------------- observation

  subscribe(fn: (s: ControllerState) => void): () => void {
    this.listeners.add(fn);
    fn(this.state());
    return () => this.listeners.delete(fn);
  }

  onSummary(fn: (s: WorkSummary) => void): () => void {
    this.summaryListeners.add(fn);
    fn(summaryOf(this.session, this.title, this.listen === 'on'));
    return () => this.summaryListeners.delete(fn);
  }

  state(): ControllerState {
    return {
      session: this.session,
      title: this.title,
      listen: this.listen,
      listenError: this.listenError,
      partial: this.partial,
      turns: this.turns,
      canUndo: this.undo.length > 0,
      missed: this.missed,
      version: this.version,
    };
  }

  private emit(): void {
    this.version++;
    const s = this.state();
    for (const fn of this.listeners) fn(s);
    const sum = summaryOf(this.session, this.title, this.listen === 'on');
    for (const fn of this.summaryListeners) fn(sum);
  }

  private get lang(): Lang {
    return this.session?.lang ?? 'en';
  }
  private get level(): NudgeLevel {
    return this.env.settings().nudgeLevel;
  }

  // ------------------------------------------------------------------ lifecycle

  /** Re-attaches a session loaded from the database after the app was killed. */
  restore(session: Session, title: string | null): void {
    this.session = session;
    this.title = title;
    this.undo = [];
    this.turns = [];
    this.missed = [];
    this.armed.clear();
    if (session.status !== 'ended') this.startTicker();
    this.emit();
  }

  /** Creates a session in the `ready` state so the plan can be edited before it begins. */
  createDraft(opts: { lang: Lang; title?: string | null; steps?: PlanStepInput[] }): void {
    if (this.session && this.session.status !== 'ended') throw new Error('A Work Partner session is already open.');
    const now = this.env.now();
    this.session = createSession({ id: `work-${now}-${this.env.newId()}`, mode: 'activity', lang: opts.lang, now });
    this.title = opts.title ?? null;
    this.undo = [];
    this.turns = [];
    this.missed = [];
    this.armed.clear();
    this.persist();
    for (const s of opts.steps ?? []) this.commit({ type: 'add_step', label: s.label, ...(s.estimateMs ? { estimateMs: s.estimateMs } : {}) }, 'ui', { undoable: false });
    this.startTicker();
    this.emit();
  }

  /** Starts the work: the session becomes active, the focus break is armed, and the first step starts. */
  begin(): TurnResult['outcome'] | 'rejected' {
    const s = this.requireSession();
    if (s.status !== 'ready' && s.status !== 'draft') return 'rejected';
    this.commit({ type: 'start_session' }, 'ui', { undoable: false });
    const set = this.env.settings();
    if (set.focusBreakEnabled) this.commit({ type: 'set_focus_break', afterMs: set.focusBreakMinutes * 60_000 }, 'ui', { undoable: false });
    let spoken = '';
    if (stepsOf(this.session as Session).length > 0) {
      const r = this.commit({ type: 'next_step' }, 'ui', { undoable: false });
      spoken = r.said;
    }
    if (spoken) this.say(spoken, 'high');
    return 'applied';
  }

  /** Ends the session, writes the generated summary to the Journal, and cancels all cues. */
  end(): void {
    const s = this.session;
    if (!s || s.status === 'ended') return;
    const r = this.commit({ type: 'end_session' }, 'ui', { undoable: false });
    if (r.ok) {
      this.onEnded();
      this.say(r.said, 'high');
    }
  }

  /** Common wrap-up once the engine session is ended, by button or by (confirmed) voice command. */
  private onEnded(): void {
    this.writeSummary();
    this.stopTicker();
    this.armed.clear();
    this.undo = [];
    this.endRequestedAt = null;
    this.emit();
  }

  /** Throws away a session that has not begun (no summary is written). */
  discard(): void {
    const s = this.session;
    if (!s) return;
    if (s.status === 'ready' || s.status === 'draft') this.commit({ type: 'end_session' }, 'ui', { undoable: false });
    this.stopTicker();
    this.armed.clear();
    this.dismiss();
  }

  /** Clears an ended session from the screen so a new one can start. */
  dismiss(): void {
    if (this.session && this.session.status !== 'ended') return;
    this.session = null;
    this.title = null;
    this.undo = [];
    this.turns = [];
    this.missed = [];
    this.partial = '';
    this.emit();
  }

  // ------------------------------------------------------------------ actions

  /**
   * Applies an action from the UI. `speak` says the acknowledgement aloud (use it for the big hands-free controls, not for
   * plan editing). Returns whether it applied and the acknowledgement text.
   */
  dispatch(action: Action, opts: { speak?: boolean } = {}): { ok: boolean; said: string } {
    const r = this.commit(action, 'ui');
    if (opts.speak && r.said) this.say(r.said, 'high');
    return { ok: r.ok, said: r.said };
  }

  /** Quiet toggle. `forMs` makes it a timed quiet period. */
  setQuiet(quiet: boolean, forMs?: number): void {
    const r = this.commit({ type: 'set_quiet', quiet, ...(forMs ? { forMs } : {}) }, 'ui');
    if (r.said) this.say(r.said, 'high');
  }

  /** Loads a template's steps into the plan (appended after any existing steps). */
  loadTemplate(template: PlanTemplate): void {
    for (const a of templateActions(template)) this.commit(a, 'ui', { undoable: false });
    if (!this.title) {
      this.title = template.name;
      this.persist();
    }
    this.emit();
  }

  /** The current plan as a reusable template (the caller persists it). */
  planAsTemplate(name: string): PlanTemplate {
    return templateFromSession(this.requireSession(), name, `tpl-${this.env.newId()}`);
  }

  // --------------------------------------------------------------------- undo

  /** Rewinds the last applied change (a voice turn, a note, or a button press). */
  undoLast(): boolean {
    const snap = this.undo.pop();
    if (!snap || !this.session) return false;
    this.restoreSnapshot(snap);
    this.store.appendEvent('action', { type: 'undo' });
    this.say(this.lang === 'ko' ? '되돌렸어요.' : 'Undone.', 'high');
    return true;
  }

  /**
   * "Correct": rewinds the last voice turn (when there is one on top of the stack) and, if `text` is given, runs the corrected
   * text through the same path as speech. The corrected text replaces what was heard.
   */
  correct(text?: string): TurnResult | null {
    const top = this.undo[this.undo.length - 1];
    if (top?.voice) {
      this.undo.pop();
      this.restoreSnapshot(top);
    }
    const corrected = text?.trim();
    if (!corrected) {
      this.emit();
      return null;
    }
    return this.handleSpeech([corrected], this.lang, 'correction');
  }

  private restoreSnapshot(snap: Snapshot): void {
    this.session = snap.session;
    if (snap.journalId) this.store.deleteJournal(snap.journalId);
    this.persist();
    this.syncCues();
    this.emit();
  }

  // -------------------------------------------------------------------- voice

  /** Final transcript from the native recognizer. */
  onFinal(text: string, alternatives: string[] | undefined, lang: Lang | undefined): TurnResult | null {
    this.partial = '';
    const hyps = alternatives && alternatives.length > 0 ? alternatives : [text];
    return this.handleSpeech(hyps, lang ?? this.lang, 'turn');
  }

  onPartial(text: string): void {
    this.partial = text;
    this.emit();
  }

  private handleSpeech(hyps: string[], lang: Lang, kind: 'turn' | 'correction'): TurnResult | null {
    const s = this.session;
    if (!s || s.status === 'ended') return null;
    const now = this.env.now();
    if (kind === 'turn') {
      const pending = this.pendingLlm;
      this.pendingLlm = null;
      if (pending && now <= pending.until) {
        const answer = parseYesNo(hyps[0] ?? '', lang);
        if (answer === 'yes') return this.finishLlmAction(s, hyps, lang, pending.action, now);
        if (answer === 'no') return this.finishSynthetic(s, hyps, lang, 'rejected', cancelledMessage(s.lang), now);
      }
      if (isLlmAvailable()) {
        const route = routeUtterance(s, hyps, lang);
        if (route.path === 'llm') {
          this.startLlmTurn(s, hyps, lang, route, now);
          return null;
        }
      }
    }
    const result = handleUtterance(s, hyps, lang, { now, newId: this.env.newId });
    const heard = result.chosen?.text ?? hyps[0] ?? '';
    let reply = result.reply;

    // Ending is hard to undo and "종료"/"end" is easy to misrecognise: ask for it twice by voice.
    if (result.outcome === 'applied' && result.session.status === 'ended') {
      const confirmed = this.endRequestedAt !== null && now - this.endRequestedAt <= END_CONFIRM_MS;
      if (!confirmed) {
        this.endRequestedAt = now;
        const ask = s.lang === 'ko' ? '세션을 끝낼까요? 끝내려면 한 번 더 말씀해 주세요.' : 'End the session? Say it again to confirm.';
        return this.finishTurn(hyps, lang, kind, { ...result, session: s, outcome: 'rejected', reply: ask }, heard, ask, now);
      }
    }

    switch (result.outcome) {
      case 'applied':
        this.pushUndo({ session: s, voice: true });
        this.session = result.session;
        this.persist();
        this.syncCues();
        this.store.appendEvent('action', {
          source: 'voice',
          intent: result.intent,
          heard,
          revision: result.session.revision,
        });
        if (result.session.status === 'ended') this.onEnded();
        break;
      case 'unsupported_intent':
        if (result.intent?.kind === 'journal') {
          reply = this.saveNote(result.intent.text, heard, s);
        } else {
          reply = null;
          this.store.appendEvent('unrecognized', { heard, intent: result.intent });
        }
        break;
      case 'needs_llm':
        // The LLM tier arrives in M4. Log the question so the bake-off has real input, then say so.
        this.store.appendEvent('llm_needed', { heard, hypotheses: hyps, lang, step: s.currentTaskId ?? null });
        void askLlm({
          hypotheses: hyps,
          lang,
          session: s,
          recentTurns: this.turns.slice(0, 3).map((t) => ({ heard: t.heard, reply: t.reply })),
        }).catch(() => undefined);
        break;
      case 'no_intent':
        this.store.appendEvent('unrecognized', { heard, hypotheses: hyps });
        break;
      case 'answered':
      case 'rejected':
        this.store.appendEvent('utterance', { heard, outcome: result.outcome, reply });
        break;
      case 'empty':
        break;
    }

    return this.finishTurn(hyps, lang, kind, result, heard, reply, now);
  }

  // -------------------------------------------------------------------- LLM tier

  /**
   * Asks the `align` task (n-best + session context). The deterministic result is only computed again if the call fails, so a
   * slow or offline network costs one spoken "please say it again" at most, never a wrong action.
   */
  private startLlmTurn(s: Session, hyps: string[], lang: Lang, route: Route, t0: number): void {
    this.store.appendEvent('llm_needed', { heard: hyps[0] ?? '', hypotheses: hyps, lang, why: route.why, step: s.currentTaskId ?? null });
    void askLlm({ hypotheses: hyps, lang, session: s, now: t0, kind: 'align', recentTurns: this.turns.slice(0, 3).reverse().map((t) => ({ heard: t.heard, reply: t.reply })) })
      .then((res) => this.onLlmDone(s, hyps, lang, route, res, t0))
      .catch(() => this.onLlmDone(s, hyps, lang, route, { ok: false, reason: 'error' }, t0));
  }

  private onLlmDone(s0: Session, hyps: string[], lang: Lang, route: Route, res: LlmResult, t0: number): void {
    const cur = this.session;
    if (!cur || cur.status === 'ended') return;
    const now = this.env.now();
    this.store.appendEvent('utterance', { heard: hyps[0] ?? '', outcome: 'llm', task: 'align', ok: res.ok, ms: now - t0, ...(res.ok ? {} : { reason: res.reason }) });
    if (!res.ok || res.task !== 'align') {
      // Clean fallback: disagreement between hypotheses falls back to the deterministic choice; anything else asks to repeat.
      if (route.why === 'hypotheses_disagree') {
        const det = handleUtterance(cur, hyps, lang, { now, newId: this.env.newId });
        if (det.outcome === 'applied' || det.outcome === 'answered') {
          this.commitVoiceResult(cur, hyps, lang, det, now);
          return;
        }
      }
      this.finishSynthetic(cur, hyps, lang, 'no_intent', retryMessage(cur.lang), now);
      return;
    }
    const a = res.align;
    if (!a.mapped || a.mapped.domain !== 'work') {
      this.store.appendEvent('unrecognized', { heard: hyps[0] ?? '', hypotheses: hyps, via: 'llm' });
      // A question nothing can answer gets the honest "can't answer"; other unmapped speech stays silent.
      this.finishSynthetic(cur, hyps, lang, route.why === 'question' ? 'needs_llm' : 'no_intent', route.why === 'question' ? describeCannotAnswer(cur.lang) : null, now);
      return;
    }
    if (a.needsConfirmation) {
      this.pendingLlm = { action: a.mapped.action, question: a.confirmQuestion, until: now + CONFIRM_TTL_MS };
      this.finishSynthetic(cur, hyps, lang, 'rejected', a.confirmQuestion, now);
      return;
    }
    this.finishLlmAction(cur, hyps, lang, a.mapped.action, now, s0.revision);
  }

  /** Applies a validated LLM action through the engine (source `llm`, stale-checked) and speaks the engine's acknowledgement. */
  private finishLlmAction(s: Session, hyps: string[], lang: Lang, action: Action, now: number, expectedRevision?: number): TurnResult | null {
    const before = this.session ?? s;
    const r = this.commit(action, 'llm', { expectedRevision });
    if (!r.ok) {
      this.finishSynthetic(before, hyps, lang, 'rejected', r.said || retryMessage(before.lang), now);
      return null;
    }
    const after = this.session!;
    const result: TurnResult = { session: after, chosen: { text: hyps[0] ?? '', index: 0, reason: 'top' }, intent: { kind: 'action', action }, outcome: 'applied', reply: r.said || null };
    return this.finishTurn(hyps, lang, 'turn', result, hyps[0] ?? '', result.reply, now);
  }

  /** Records a turn that has no engine result of its own (a question, a retry request, a cancel). */
  private finishSynthetic(s: Session, hyps: string[], lang: Lang, outcome: TurnResult['outcome'], reply: string | null, now: number): TurnResult {
    const result: TurnResult = { session: s, chosen: { text: hyps[0] ?? '', index: 0, reason: 'top' }, intent: null, outcome, reply };
    return this.finishTurn(hyps, lang, 'turn', result, hyps[0] ?? '', reply, now);
  }

  /** Commits a deterministic result that was computed after an LLM failure. */
  private commitVoiceResult(prev: Session, hyps: string[], lang: Lang, result: TurnResult, now: number): void {
    if (result.outcome === 'applied') {
      this.pushUndo({ session: prev, voice: true });
      this.session = result.session;
      this.persist();
      this.syncCues();
      this.store.appendEvent('action', { source: 'voice', intent: result.intent, heard: result.chosen?.text ?? '', revision: result.session.revision });
    }
    this.finishTurn(hyps, lang, 'turn', result, result.chosen?.text ?? hyps[0] ?? '', result.reply, now);
  }

  private finishTurn(
    _hyps: string[],
    lang: Lang,
    kind: 'turn' | 'correction',
    result: TurnResult,
    heard: string,
    reply: string | null,
    now: number,
  ): TurnResult {
    const row: TurnRow = {
      id: ++this.turnSeq,
      at: now,
      heard,
      lang,
      outcome: kind === 'correction' ? 'correction' : result.outcome,
      reply,
      chosenIndex: result.chosen?.index ?? 0,
    };
    this.turns = [row, ...this.turns].slice(0, MAX_TURNS);
    if (reply) this.say(reply, 'high');
    this.emit();
    return result;
  }

  /** Voice note: stored in the Journal, linked to the current step. */
  private saveNote(text: string, heard: string, s: Session): string {
    const cur = s.currentTaskId ? s.tasks[s.currentTaskId] : undefined;
    const open = cur && (cur.status === 'in_progress' || cur.status === 'awaiting_confirmation' || cur.status === 'pending') ? cur : undefined;
    const id = `jn-${this.env.newId()}`;
    this.store.createJournal({
      id,
      sessionId: s.id,
      mode: 'work',
      source: 'user_note',
      text,
      taskId: open?.id ?? null,
      taskLabel: open?.label ?? null,
      createdAt: this.env.now(),
    });
    this.pushUndo({ session: s, journalId: id, voice: true });
    this.store.appendEvent('utterance', { heard, outcome: 'note', journalId: id });
    return describeNoteSaved(s.lang, open?.label);
  }

  /** Saves the spoken turns of this session as one transcript entry in the Journal. Returns false if there was nothing. */
  saveTranscript(): boolean {
    const s = this.session;
    if (!s || this.turns.length === 0) return false;
    const lines = [...this.turns]
      .reverse()
      .map((t) => `${new Date(t.at).toLocaleTimeString()}  ${t.heard}${t.reply ? `\n  -> ${t.reply}` : ''}`);
    this.store.createJournal({
      id: `jt-${this.env.newId()}`,
      sessionId: s.id,
      mode: 'work',
      source: 'transcript',
      text: lines.join('\n'),
      createdAt: this.env.now(),
    });
    return true;
  }

  // -------------------------------------------------------------- native session

  async startListening(): Promise<boolean> {
    if (this.listen === 'on' || this.listen === 'starting') return this.listen === 'on';
    this.listen = 'starting';
    this.listenError = null;
    this.emit();
    try {
      await this.native.start(this.lang);
      this.listen = 'on';
      this.armed.clear();
      this.syncCues();
      this.processDue(0);
    } catch (e) {
      this.listen = 'error';
      this.listenError = e instanceof Error ? e.message : String(e);
    }
    this.emit();
    return this.listen === 'on';
  }

  async stopListening(): Promise<void> {
    try {
      await this.native.stop();
    } finally {
      this.onNativeStopped();
    }
  }

  /** The native session stopped (by us or by the system). Cues are gone with it. */
  onNativeStopped(): void {
    if (this.listen === 'off') return;
    this.listen = 'off';
    this.partial = '';
    this.armed.clear();
    this.emit();
  }

  // --------------------------------------------------------------------- cues

  /** Arms the native cue scheduler to match the plan. Safe to call after any change. */
  syncCues(): void {
    const s = this.session;
    if (!s || !this.native.isRunning()) return;
    const planned = s.status === 'ended' ? [] : planCues(s, s.lang, this.level);
    this.plannedById = new Map(planned.map((c) => [c.id, c]));
    const diff = diffCues(planned, this.armed);
    try {
      for (const id of diff.cancel) {
        this.native.cancelCue(id);
        this.armed.delete(id);
      }
      for (const c of diff.schedule) {
        this.native.scheduleCue(c.id, c.atEpochMs, c.text);
        this.armed.set(c.id, c.atEpochMs);
      }
    } catch (e) {
      this.store.appendEvent('error', { where: 'syncCues', message: String(e) });
    }
  }

  /** The native scheduler fired a cue. Answer immediately so its fallback does not speak the same text. */
  onCueDue(id: string): void {
    this.native.ackCue(id);
    this.armed.delete(id);
    const planned = this.plannedById.get(id);
    if (planned?.derived) {
      // A derived cue (halfway) has no engine event. Say it only if it is still valid and not suppressed.
      const stillPlanned = this.session && planCues(this.session, this.lang, this.level).some((c) => c.id === id);
      if (stillPlanned) this.say(planned.text, 'normal');
    } else {
      this.processDue(DUE_TOLERANCE_MS);
    }
    this.syncCues();
  }

  /** 1 Hz in-app check; also the only path when a cue was cancelled or the native scheduler is not armed. */
  tick(): void {
    this.processDue(0);
    this.syncCues();
  }

  /** Speaks and acknowledges every due event, honouring quiet mode and the nudge level. */
  private processDue(toleranceMs: number): void {
    if (!this.session || (this.session.status !== 'active' && this.session.status !== 'paused')) return;
    if (!this.native.isRunning()) {
      this.collectMissed(toleranceMs);
      return;
    }
    const now = this.env.now() + toleranceMs;
    for (const ev of dueEvents(this.session, now)) {
      const cur = this.session;
      if (!cur) return;
      const nudge = classifyDue(ev) === 'nudge';
      const silent = isSuppressed(cur, ev, this.level) || (ev.stale && (nudge || ev.kind === 'timer_milestone'));
      const text = silent ? '' : describeDue(ev, cur.lang);
      const r = this.commit({ type: 'handle_due', key: ev.key, outcome: silent || ev.stale ? 'expired' : 'delivered' }, 'system', { undoable: false });
      if (!r.ok) continue;
      this.store.appendEvent('cue', { key: ev.key, kind: ev.kind, spoken: !!text, stale: ev.stale });
      if (text) this.say(text, nudge ? 'normal' : 'high');
    }
    if (this.missed.length > 0) {
      this.missed = [];
      this.emit();
    }
  }

  /** Without a native session nothing can be spoken; keep the due events visible instead of silently dropping them. */
  private collectMissed(toleranceMs: number): void {
    const s = this.session;
    if (!s) return;
    const events: DueEvent[] = dueEvents(s, this.env.now() + toleranceMs).filter((e) => !isSuppressed(s, e, this.level) && classifyDue(e) === 'requested');
    const next = events.map((e) => ({ key: e.key, text: describeDue({ ...e, stale: false }, s.lang) })).filter((m) => m.text);
    if (next.length !== this.missed.length || next.some((m, i) => m.key !== this.missed[i]?.key)) {
      this.missed = next;
      this.emit();
    }
  }

  /** The user acknowledged the on-screen alert for a due event while nothing could speak it. */
  acknowledgeMissed(key: string): void {
    this.commit({ type: 'handle_due', key, outcome: 'delivered' }, 'ui', { undoable: false });
    this.missed = this.missed.filter((m) => m.key !== key);
    this.emit();
  }

  private startTicker(): void {
    if (this.ticker) return;
    this.ticker = setInterval(() => this.tick(), 1000);
  }

  private stopTicker(): void {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
  }

  /** Stops timers and native resources. Call when the app is torn down (tests). */
  dispose(): void {
    this.stopTicker();
    this.listeners.clear();
    this.summaryListeners.clear();
  }

  // ----------------------------------------------------------------- internals

  private requireSession(): Session {
    if (!this.session) throw new Error('No Work Partner session.');
    return this.session;
  }

  private persist(): void {
    if (this.session) this.store.saveSession(this.session, this.title);
  }

  private pushUndo(s: Snapshot): void {
    this.undo = [...this.undo, s].slice(-MAX_UNDO);
  }

  /** Applies one engine action, persists on success, keeps cues in step, and returns the acknowledgement text. */
  private commit(
    action: Action,
    source: ActionEnvelope['source'],
    opts: { undoable?: boolean; expectedRevision?: number } = {},
  ): { ok: boolean; said: string; changes: Change[] } {
    const s = this.requireSession();
    const r = apply(s, { action, source, ...(opts.expectedRevision !== undefined ? { expectedRevision: opts.expectedRevision } : {}) }, { now: this.env.now(), newId: this.env.newId });
    if (!r.ok) return { ok: false, said: describeRejection(r.reason, r.candidates, s.lang), changes: [] };
    if (r.session !== s) {
      if (opts.undoable !== false) this.pushUndo({ session: s, voice: false });
      this.session = r.session;
      this.persist();
      if (action.type !== 'handle_due') this.store.appendEvent('action', { source, action, revision: r.session.revision });
      this.syncCues();
    }
    this.emit();
    return { ok: true, said: describeChanges(r.changes, s.lang), changes: r.changes };
  }

  private say(text: string, priority: 'high' | 'normal'): void {
    if (!text || !this.native.isRunning()) return;
    try {
      this.native.speak(text, priority);
    } catch (e) {
      this.store.appendEvent('error', { where: 'speak', message: String(e) });
    }
  }

  /** Deterministic end-of-session summary for the Journal (source: generated_summary). No LLM involved. */
  private writeSummary(): void {
    const s = this.session;
    if (!s) return;
    const steps = stepsOf(s);
    const done = steps.filter((t) => t.status === 'completed').length;
    const skipped = steps.filter((t) => t.status === 'skipped').length;
    const minutes = s.startedAt !== undefined && s.endedAt !== undefined ? Math.max(1, Math.round((s.endedAt - s.startedAt) / 60_000)) : 0;
    const ko = s.lang === 'ko';
    const head = this.title ? `${this.title}: ` : '';
    const body =
      steps.length > 0
        ? ko
          ? `${steps.length}단계 중 ${done}단계 완료${skipped ? `, ${skipped}단계 건너뜀` : ''}, ${minutes}분.`
          : `${done} of ${steps.length} steps done${skipped ? `, ${skipped} skipped` : ''}, ${minutes} min.`
        : ko
          ? `${minutes}분 동안 작업했어요.`
          : `Worked for ${minutes} min.`;
    const list = steps.map((t) => `- [${t.status === 'completed' ? 'x' : t.status === 'skipped' ? '-' : ' '}] ${t.label}`).join('\n');
    this.store.createJournal({
      id: `js-${this.env.newId()}`,
      sessionId: s.id,
      mode: 'work',
      source: 'generated_summary',
      text: `${head}${body}${list ? `\n${list}` : ''}`,
      createdAt: this.env.now(),
    });
  }
}

