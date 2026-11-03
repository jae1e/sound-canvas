import {
  apply,
  createSession,
  describeDue,
  dueEvents,
  handleUtterance,
  type Lang,
  type Session,
  type TurnResult,
} from '@vlc/session-engine';

export interface VoiceLoopHooks {
  /** Speak an acknowledgement or due announcement through the native TTS path. */
  speak: (text: string) => void;
  /** Called after every turn, for the UI. */
  onTurn: (turn: { heard: string; alternatives: string[]; lang: Lang; result: TurnResult }) => void;
  onDue: (text: string) => void;
}

/**
 * The session's JS voice path: final transcript (+ n-best) -> chooseHypothesis with the real task/timer labels ->
 * parseUtterance -> engine `apply` -> spoken acknowledgement. Also announces due timer events from a 1 s tick.
 * Source-agnostic: the sherpa pipeline and the platform recognizer both feed `onFinal`.
 */
export class VoiceLoop {
  session: Session;
  private n = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly lang: Lang,
    private readonly hooks: VoiceLoopHooks,
  ) {
    const now = Date.now();
    const created = createSession({ id: `s${now}`, mode: 'activity', lang, now });
    const r = apply(created, { action: { type: 'start_session' }, source: 'system' }, { now, newId: this.newId });
    this.session = r.ok ? r.session : created;
  }

  private newId = () => `e${++this.n}`;

  start() {
    this.timer = setInterval(() => this.tick(), 1000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  onFinal(text: string, alternatives: string[] | undefined, utteranceLang: Lang | undefined) {
    const hypotheses = alternatives && alternatives.length > 0 ? alternatives : [text];
    const lang = utteranceLang ?? this.lang;
    const result = handleUtterance(this.session, hypotheses, lang, { now: Date.now(), newId: this.newId });
    this.session = result.session;
    this.hooks.onTurn({ heard: text, alternatives: hypotheses, lang, result });
    if (result.reply) this.hooks.speak(result.reply);
  }

  private tick() {
    const now = Date.now();
    for (const ev of dueEvents(this.session, now)) {
      const text = ev.stale ? '' : describeDue(ev, this.lang);
      const r = apply(
        this.session,
        { action: { type: 'handle_due', key: ev.key, outcome: ev.stale ? 'expired' : 'delivered' }, source: 'system' },
        { now, newId: this.newId },
      );
      if (r.ok) this.session = r.session;
      if (text) {
        this.hooks.onDue(text);
        this.hooks.speak(text);
      }
    }
  }
}
