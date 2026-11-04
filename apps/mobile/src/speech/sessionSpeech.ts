import {
  fixedPhrases,
  planCue,
  SynthQueue,
  type EarconName,
  type Lang,
  type SynthPriority,
} from '@vlc/session-engine';

import VlcSessionService from '../../modules/vlc-session-service';

/**
 * The app's single way to say something during a session. One voice per session: this never picks another engine. If a
 * phrase is cached it plays at once; fragments are composed; otherwise (Supertonic only) an earcon plays and the speech
 * follows when ready unless it went stale. The decision logic lives in `@vlc/session-engine` (`planCue`); this file wires
 * it to the native module and runs the background synthesis queue.
 */
export type SayOptions = {
  lang?: Lang;
  /** Fragments that make up the text (for example distance + direction). */
  parts?: string[];
  /** Tone to play when the voice cannot start the phrase immediately. */
  earcon?: EarconName | null;
  /** Epoch ms after which the phrase is no longer true. */
  staleAtMs?: number;
  priority?: 'high' | 'normal';
  cueId?: string | null;
};

export type PrewarmItem = { text: string; lang?: Lang; needByMs?: number; priority?: SynthPriority; order?: number };

const queue = new SynthQueue();
let sessionLang: Lang = 'ko';
let pumping = false;
let lastVoice: string | null = null;
let voiceSub: { remove(): void } | null = null;

const now = () => Date.now();

function running(): boolean {
  try {
    return VlcSessionService.getSessionState() === 'running';
  } catch {
    return false;
  }
}

/** Speaks [text] in the session voice. Returns false when no session runs (callers keep the text on screen). */
export function say(text: string, opts: SayOptions = {}): boolean {
  const trimmed = text.trim();
  if (!trimmed || !running()) return false;
  const lang = opts.lang ?? sessionLang;
  try {
    const voice = VlcSessionService.getSessionVoice().voice ?? 'platform';
    const parts = opts.parts && opts.parts.length > 1 ? opts.parts : undefined;
    const flags = VlcSessionService.clipsCached([trimmed, ...(parts ?? [])], lang);
    const decision = planCue({
      nowMs: now(),
      staleAfterMs: opts.staleAtMs,
      voice,
      fullCached: flags[0] === true,
      parts,
      partsCached: parts ? flags.slice(1).every(Boolean) : false,
      earcon: opts.earcon ?? null,
    });
    // The native side re-checks the cache and logs earcon_played / speech_late / speech_dropped_stale.
    VlcSessionService.speakCue({
      text: trimmed,
      lang,
      parts: decision.action === 'compose' ? decision.parts : undefined,
      priority: opts.priority ?? 'high',
      cueId: opts.cueId ?? null,
      earcon: decision.action === 'earcon_then_speech' ? decision.earcon : null,
      staleAtEpochMs: opts.staleAtMs,
    });
    return decision.action !== 'drop_stale';
  } catch {
    return false;
  }
}

/** Plays a tone only (for example the "thinking" tick while an LLM answer is pending). */
export function earcon(name: EarconName, vibrate = false): void {
  try {
    VlcSessionService.playEarcon(name, vibrate);
  } catch {
    // No native module: nothing to play.
  }
}

/** Queues phrases for background synthesis in the session voice, at the moment their text becomes known. */
export function prewarm(items: PrewarmItem[]): void {
  if (!running()) return;
  for (const it of items) queue.enqueue({ text: it.text, lang: it.lang ?? sessionLang, needByMs: it.needByMs, priority: it.priority, order: it.order }, now());
  void pump();
}

async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  try {
    while (running()) {
      const item = queue.next(now());
      if (!item) break;
      let ok = false;
      try {
        const r = await VlcSessionService.pacingPrepare([{ text: item.text, lang: item.lang === 'en' ? 'en' : 'ko' }]);
        ok = r.clips[0]?.ok === true;
      } catch {
        ok = false;
      }
      queue.complete(item, ok);
      if (!ok) await new Promise((r) => setTimeout(r, 300));
    }
  } finally {
    pumping = false;
  }
}

/** Call right after the native session started. Queues the fixed system phrases and watches for a voice change. */
export function onSessionStarted(lang: Lang): void {
  queue.clear();
  sessionLang = lang;
  lastVoice = null;
  voiceSub?.remove();
  try {
    voiceSub = VlcSessionService.addListener('sessionVoice', (v) => {
      if (v.voice && lastVoice && v.voice !== lastVoice) {
        // The voice changed after an engine failure: clips made with the old voice are useless, make them again.
        queue.resetForNewVoice(now());
        void pump();
      }
      if (v.voice) lastVoice = v.voice;
    });
    lastVoice = VlcSessionService.getSessionVoice().voice;
  } catch {
    voiceSub = null;
  }
  prewarm(fixedPhrases(lang).map((text) => ({ text, lang, priority: 'background' as const })));
}

export function onSessionStopped(): void {
  voiceSub?.remove();
  voiceSub = null;
  queue.clear();
  lastVoice = null;
}

export function setSessionLanguage(lang: Lang): void {
  sessionLang = lang;
}

