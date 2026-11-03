import {
  apply,
  createSession,
  describeDue,
  describeNoteSaved,
  dueEvents,
  handleUtterance,
  type Lang,
  type Session,
  type SessionMode,
} from '@vlc/session-engine';

/** The three product modes. Only one of them may own the native voice session at a time. */
export type ModeKey = 'work' | 'travel' | 'coach';

/** Modes whose session is managed here; Work Partner has its own controller. */
export type ManagedMode = Exclude<ModeKey, 'work'>;

export const ENGINE_MODE: Record<ManagedMode, SessionMode> = { travel: 'walk', coach: 'vocal' };

export type MicHold = 'take' | 'monitor' | 'playback';

export interface ModeNativePort {
  start(lang: Lang, mode: ManagedMode): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  speak(text: string, priority: 'normal' | 'high'): void;
  /** Pauses (true) or resumes (false) the session's platform STT so another recorder can hold the microphone. */
  holdStt(hold: boolean): void;
}

export interface ModeStorePort {
  saveSession(session: Session, title: string | null): void;
  appendEvent(kind: 'session' | 'action' | 'utterance' | 'error' | 'unrecognized' | 'llm_needed', payload: unknown, sessionId?: string): void;
}

export interface ModeEnv {
  now(): number;
  newId(): string;
}

/** What a started session looked like when it ended; handed to the per-mode end hooks. */
export interface EndedSession {
  mode: ManagedMode;
  session: Session;
  lang: Lang;
  startedAt: number;
  endedAt: number;
}

export interface ModeHandler {
  /** Return true when the utterance was a mode command and was acted on. */
  handle(hypotheses: string[], lang: Lang): Promise<boolean> | boolean;
  /** Called with a spoken note the shared parser recognised ("note: ..."). Returns the spoken confirmation. */
  saveNote(text: string, session: Session, lang: Lang): string | null;
  /** Called when the session ends (by the user or because the native service stopped). */
  onEnded?(info: EndedSession): void;
  onStarted?(info: { mode: ManagedMode; session: Session; lang: Lang }): void;
}

export type StartResult = { ok: true } | { ok: false; reason: 'other_mode_active'; other: ModeKey } | { ok: false; reason: 'native_failed'; message: string };

export interface ModeSessionState {
  mode: ManagedMode | null;
  status: 'idle' | 'starting' | 'running';
  sessionId: string | null;
  startedAt: number | null;
  lang: Lang | null;
  error: string | null;
  /** Active microphone holds (Voice Coach take, live pitch, playback). Session STT is paused while this is non-empty. */
  holds: MicHold[];
}

const IDLE: ModeSessionState = { mode: null, status: 'idle', sessionId: null, startedAt: null, lang: null, error: null, holds: [] };

/**
 * Session owner for Travel Guide and Voice Coach. It starts and stops the native foreground session for a mode, enforces
 * "one mode session at a time", routes each STT final to the mode handler first and to the shared session-engine
 * `handleUtterance` second (timers, notes), and arbitrates the microphone with the Voice Coach recorder.
 */
export class ModeSessionManager {
  private state: ModeSessionState = IDLE;
  private session: Session | null = null;
  private handlers = new Map<ManagedMode, ModeHandler>();
  private listeners = new Set<() => void>();
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private startPromise: Promise<StartResult> | null = null;

  constructor(
    private readonly native: ModeNativePort,
    private readonly store: ModeStorePort,
    private readonly env: ModeEnv,
    /** The other, independently managed mode (Work Partner) that is active right now, or null. */
    private readonly workActive: () => boolean,
  ) {}

  getState = (): ModeSessionState => this.state;
  getSession = (): Session | null => this.session;
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  private set(patch: Partial<ModeSessionState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  register(mode: ManagedMode, handler: ModeHandler): void {
    this.handlers.set(mode, handler);
  }

  /** The mode that currently owns the session, counting Work Partner. */
  activeMode(): ModeKey | null {
    return this.state.mode ?? (this.workActive() ? 'work' : null);
  }

  /** Why `mode` cannot start now, or null when it can. */
  blockedBy(mode: ManagedMode): ModeKey | null {
    const active = this.activeMode();
    return active && active !== mode ? active : null;
  }

  async start(mode: ManagedMode, lang: Lang): Promise<StartResult> {
    if (this.startPromise && this.state.mode === mode) return this.startPromise;
    const other = this.blockedBy(mode);
    if (other) return { ok: false, reason: 'other_mode_active', other };
    if (this.state.status === 'running' && this.state.mode === mode) return { ok: true };
    this.startPromise = this.doStart(mode, lang).finally(() => {
      this.startPromise = null;
    });
    return this.startPromise;
  }

  private async doStart(mode: ManagedMode, lang: Lang): Promise<StartResult> {
    this.set({ ...IDLE, mode, status: 'starting', lang });
    try {
      await this.native.start(lang, mode);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.set({ ...IDLE, error: message });
      this.store.appendEvent('error', { where: 'mode_start', mode, message });
      return { ok: false, reason: 'native_failed', message };
    }
    const now = this.env.now();
    const created = createSession({ id: `${mode}-${this.env.newId()}`, mode: ENGINE_MODE[mode], lang, now });
    const started = apply(created, { action: { type: 'start_session' }, source: 'system' }, { now, newId: this.env.newId });
    this.session = started.ok ? started.session : created;
    this.persist();
    this.set({ mode, status: 'running', sessionId: this.session.id, startedAt: now, lang, error: null, holds: [] });
    this.store.appendEvent('session', { event: 'mode_started', mode, lang }, this.session.id);
    this.tickTimer = setInterval(() => this.tick(), 1000);
    this.handlers.get(mode)?.onStarted?.({ mode, session: this.session, lang });
    return { ok: true };
  }

  /** Re-attaches to a session that is still running natively (JS reload) with its stored engine state. */
  adopt(mode: ManagedMode, session: Session, startedAt: number): void {
    this.session = session;
    this.set({ ...IDLE, mode, status: 'running', sessionId: session.id, startedAt, lang: session.lang });
    this.tickTimer ??= setInterval(() => this.tick(), 1000);
    this.handlers.get(mode)?.onStarted?.({ mode, session, lang: session.lang });
  }

  /** Ends the session: stops the native service and closes the stored engine session. */
  async end(): Promise<void> {
    if (!this.state.mode) return;
    try {
      await this.native.stop();
    } finally {
      this.finish('user');
    }
  }

  /** The native service stopped (notification Stop, system kill, error). */
  onNativeStopped(): void {
    if (this.state.mode) this.finish('native');
  }

  private finish(reason: 'user' | 'native'): void {
    const mode = this.state.mode;
    const session = this.session;
    if (!mode || !session) {
      this.set(IDLE);
      return;
    }
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = null;
    const now = this.env.now();
    const ended = apply(session, { action: { type: 'end_session' }, source: 'system' }, { now, newId: this.env.newId });
    const final = ended.ok ? ended.session : { ...session, status: 'ended' as const, endedAt: now };
    this.session = null;
    const startedAt = this.state.startedAt ?? now;
    const lang = this.state.lang ?? session.lang;
    this.set(IDLE);
    try {
      this.store.saveSession(final, null);
    } catch (e) {
      this.store.appendEvent('error', { where: 'mode_end_save', message: String(e) });
    }
    this.store.appendEvent('session', { event: 'mode_ended', mode, reason }, final.id);
    try {
      this.handlers.get(mode)?.onEnded?.({ mode, session: final, lang, startedAt, endedAt: now });
    } catch (e) {
      this.store.appendEvent('error', { where: 'mode_end_hook', message: String(e) });
    }
  }

  // ------------------------------------------------------------------ voice

  /** Routes one final transcript. Returns true when something handled it. */
  async onFinal(text: string, alternatives: string[] | undefined, lang: Lang | undefined): Promise<boolean> {
    const mode = this.state.mode;
    const session = this.session;
    if (!mode || !session || this.state.status !== 'running') return false;
    const hyps = alternatives && alternatives.length > 0 ? alternatives : [text];
    const l = lang ?? this.state.lang ?? session.lang;
    try {
      if (await this.handlers.get(mode)?.handle(hyps, l)) {
        this.store.appendEvent('utterance', { heard: hyps[0], outcome: 'mode_command', mode }, session.id);
        return true;
      }
    } catch (e) {
      this.store.appendEvent('error', { where: 'mode_handler', mode, message: String(e) }, session.id);
    }
    return this.fallback(hyps, l);
  }

  /** Shared session-engine path: timers, quiet mode, notes. */
  private fallback(hyps: string[], lang: Lang): boolean {
    const session = this.session;
    const mode = this.state.mode;
    if (!session || !mode) return false;
    const result = handleUtterance(session, hyps, lang, { now: this.env.now(), newId: this.env.newId });
    const heard = result.chosen?.text ?? hyps[0] ?? '';
    let reply = result.reply;
    switch (result.outcome) {
      case 'applied':
        this.session = result.session;
        this.persist();
        this.store.appendEvent('action', { source: 'voice', intent: result.intent, heard }, session.id);
        break;
      case 'unsupported_intent':
        if (result.intent?.kind === 'journal') {
          reply = this.handlers.get(mode)?.saveNote(result.intent.text, session, lang) ?? describeNoteSaved(session.lang);
        } else {
          reply = null;
        }
        break;
      case 'needs_llm':
        this.store.appendEvent('llm_needed', { heard, hypotheses: hyps, lang, mode }, session.id);
        break;
      case 'no_intent':
        this.store.appendEvent('unrecognized', { heard, hypotheses: hyps }, session.id);
        break;
      default:
        break;
    }
    if (reply) this.say(reply);
    return result.outcome !== 'empty' && result.outcome !== 'no_intent' && result.outcome !== 'needs_llm';
  }

  private say(text: string): void {
    if (!this.native.isRunning()) return;
    try {
      this.native.speak(text, 'high');
    } catch (e) {
      this.store.appendEvent('error', { where: 'speak', message: String(e) });
    }
  }

  private persist(): void {
    if (this.session) this.store.saveSession(this.session, null);
  }

  /** Announces timers that came due (the same JS tick the spike voice loop used; there is no native cue backup in these modes). */
  private tick(): void {
    const session = this.session;
    if (!session) return;
    const now = this.env.now();
    let current = session;
    for (const ev of dueEvents(current, now)) {
      const text = ev.stale ? '' : describeDue(ev, current.lang);
      const r = apply(current, { action: { type: 'handle_due', key: ev.key, outcome: ev.stale ? 'expired' : 'delivered' }, source: 'system' }, { now, newId: this.env.newId });
      if (r.ok) current = r.session;
      if (text) this.say(text);
    }
    if (current !== session) {
      this.session = current;
      this.persist();
    }
  }

  // ----------------------------------------------------------- mic arbitration

  /**
   * A recorder (Voice Coach take, live pitch, playback) wants the microphone: pause the session's STT first. The pause is
   * requested synchronously; callers wait a short settle time before opening their own AudioRecord.
   */
  holdMic(kind: MicHold): void {
    if (this.state.holds.includes(kind)) return;
    const wasEmpty = this.state.holds.length === 0;
    this.set({ holds: [...this.state.holds, kind] });
    if (wasEmpty && this.state.status === 'running') {
      this.native.holdStt(true);
      this.store.appendEvent('session', { event: 'stt_paused_for_take', kind }, this.state.sessionId ?? undefined);
    }
  }

  releaseMic(kind: MicHold): void {
    if (!this.state.holds.includes(kind)) return;
    const holds = this.state.holds.filter((h) => h !== kind);
    this.set({ holds });
    if (holds.length === 0 && this.state.status === 'running') {
      this.native.holdStt(false);
      this.store.appendEvent('session', { event: 'stt_resumed', kind }, this.state.sessionId ?? undefined);
    }
  }
}
