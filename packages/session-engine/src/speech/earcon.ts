import type { Lang } from '../types';

/**
 * Earcons are short non-speech sounds played when a spoken phrase is due but its audio is not ready. They are rendered
 * natively as PCM (see `audio/Earcons.kt`); this file only names them and maps events to them.
 */
export const EARCON_NAMES = ['attention', 'timer_done', 'turn_left', 'turn_right', 'arrived', 'warning', 'tick'] as const;
export type EarconName = (typeof EARCON_NAMES)[number];

export const isEarconName = (v: unknown): v is EarconName => typeof v === 'string' && (EARCON_NAMES as readonly string[]).includes(v);

/** Earcon for a navigation cue. `turn` is a TurnType from @vlc/travel (kept as a string here to avoid a dependency). */
export function earconForNavCue(kind: 'approach' | 'now' | 'off_route' | 'arrived' | 'gps_uncertain', turn: string | null): EarconName {
  switch (kind) {
    case 'arrived':
      return 'arrived';
    case 'off_route':
    case 'gps_uncertain':
      return 'warning';
    default:
      if (turn === 'left' || turn === 'slight_left' || turn === 'sharp_left') return 'turn_left';
      if (turn === 'right' || turn === 'slight_right' || turn === 'sharp_right') return 'turn_right';
      if (turn === 'arrive') return 'arrived';
      return 'attention';
  }
}

/** Fixed announcement made once, in the fallback voice, when the session voice is lost for good. */
export function voiceSwitchAnnouncement(lang: Lang): string {
  return lang === 'ko'
    ? '음성 엔진에 문제가 생겨서, 지금부터 목소리가 바뀌어요.'
    : 'The voice engine had a problem, so my voice will change for the rest of this session.';
}
