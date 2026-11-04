/**
 * One voice per session. The voice is chosen once at session start and never changes except after an engine failure
 * that a single reload could not repair (see [nextVoiceStep]).
 */
export type SessionVoice = 'supertonic' | 'platform';

export type VoiceChoice = {
  voice: SessionVoice;
  /** True when Supertonic was wanted but the platform voice is used instead; the session screen shows a notice. */
  degraded: boolean;
  reason: 'ok' | 'platform_requested' | 'model_missing' | 'load_failed';
};

export type VoiceInputs = {
  /** The user's engine setting: `auto` and `supertonic` want Supertonic, `platform` does not. */
  requested: 'auto' | 'platform' | 'supertonic';
  modelDownloaded: boolean;
  /** Result of loading the engine before the session started, or null when no load has finished. */
  loaded: boolean | null;
};

export function chooseSessionVoice(i: VoiceInputs): VoiceChoice {
  if (i.requested === 'platform') return { voice: 'platform', degraded: false, reason: 'platform_requested' };
  if (!i.modelDownloaded) return { voice: 'platform', degraded: true, reason: 'model_missing' };
  if (i.loaded === false) return { voice: 'platform', degraded: true, reason: 'load_failed' };
  return { voice: 'supertonic', degraded: false, reason: 'ok' };
}

export type VoiceFailureState = { reloadsUsed: number; spokeInSessionVoice: boolean };

export type VoiceStep =
  | { kind: 'reload' }
  /** `announce` is true only when the user already heard the session voice, so the change needs explaining. */
  | { kind: 'switch'; announce: boolean };

/** The session voice failed (crash, unload, failed load). Reload once; after that, switch for the rest of the session. */
export function nextVoiceStep(s: VoiceFailureState, maxReloads = 1): VoiceStep {
  if (s.reloadsUsed < maxReloads) return { kind: 'reload' };
  return { kind: 'switch', announce: s.spokeInSessionVoice };
}
