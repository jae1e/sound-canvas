import type { EarconName } from './earcon';
import type { SessionVoice } from './voice';

/** Gap inserted between composed fragments; the native side uses the same value (PacingCache.COMPOSE_GAP_MS). */
export const COMPOSE_GAP_MS = 80;

export type CueRequest = {
  nowMs: number;
  /** After this epoch ms the phrase is no longer true (a turn already passed, a count moved on). */
  staleAfterMs?: number;
  voice: SessionVoice;
  /** The whole phrase has a cached clip in the session voice. */
  fullCached: boolean;
  /** Fragments that together make the phrase (for example ["50미터 앞에서", "우회전하세요"]). */
  parts?: string[];
  /** Every fragment has a cached clip. */
  partsCached?: boolean;
  earcon?: EarconName | null;
};

export type CueDecision =
  | { action: 'drop_stale'; lateMs: number }
  | { action: 'play_clip' }
  | { action: 'compose'; parts: string[] }
  /** Session voice is Supertonic and nothing is cached: play the earcon now, speak when synthesis finishes (unless stale). */
  | { action: 'earcon_then_speech'; earcon: EarconName }
  /** Speak in the session voice with no earcon (platform voice answers fast, or the caller wants no tone). */
  | { action: 'speak_now' };

/** Chooses between: drop, cached clip, composed fragments, earcon then speech, plain speech. Never picks another voice. */
export function planCue(r: CueRequest): CueDecision {
  if (r.staleAfterMs !== undefined && r.nowMs > r.staleAfterMs) return { action: 'drop_stale', lateMs: r.nowMs - r.staleAfterMs };
  if (r.fullCached) return { action: 'play_clip' };
  if (r.parts && r.parts.length > 1 && r.partsCached) return { action: 'compose', parts: r.parts };
  if (r.voice === 'supertonic' && r.earcon) return { action: 'earcon_then_speech', earcon: r.earcon };
  return { action: 'speak_now' };
}

/** After an earcon, speech that finishes synthesizing at [nowMs] is still worth saying only if it is not stale. */
export function lateSpeechVerdict(nowMs: number, requestedMs: number, staleAfterMs?: number): { speak: boolean; lateMs: number } {
  const lateMs = Math.max(0, nowMs - requestedMs);
  if (staleAfterMs !== undefined && nowMs > staleAfterMs) return { speak: false, lateMs };
  return { speak: true, lateMs };
}

/** How long a navigation cue stays true: the time to reach the maneuver at the current pace, with a floor. */
export function navStaleAfterMs(nowMs: number, distanceToManeuverM: number | null, paceMps: number, kind: 'approach' | 'now' | 'other'): number {
  if (kind === 'now') return nowMs + 4_000;
  if (kind === 'approach' && distanceToManeuverM !== null) {
    const secs = distanceToManeuverM / Math.max(0.6, paceMps);
    return nowMs + Math.max(4_000, Math.round(secs * 1000));
  }
  return nowMs + 20_000;
}

/** Native log event names, kept in one place so the app and diagnostics agree. */
export const SPEECH_LOG = { earcon: 'earcon_played', late: 'speech_late', droppedStale: 'speech_dropped_stale', voiceSwitched: 'voice_switched' } as const;
