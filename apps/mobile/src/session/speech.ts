import type { Lang } from '@vlc/session-engine';

import VlcSessionService from '../../modules/vlc-session-service';
import { say, type SayOptions } from '../speech/sessionSpeech';

let spokenLang: Lang | null = null;

/** Remember the language the native session TTS was started with, so a switch is only sent when it changes. */
export function noteSessionSpeechLanguage(lang: Lang | null): void {
  spokenLang = lang;
}

/**
 * The one way Travel Guide and Voice Coach speak: through the running native session, so the output gets Supertonic or the
 * platform fallback and the user's output routing (earbuds by default; the phone speaker only if the user chose it).
 * Without a running session nothing is played and false is returned; callers show the text on screen instead.
 */
export function speakThroughSession(text: string, lang: Lang, opts: Omit<SayOptions, 'lang'> = {}): boolean {
  if (!text.trim()) return false;
  try {
    if (VlcSessionService.getSessionState() !== 'running') return false;
    if (spokenLang !== lang) {
      VlcSessionService.setSpeechLanguage(lang);
      spokenLang = lang;
    }
    return say(text, { ...opts, lang });
  } catch {
    return false;
  }
}
