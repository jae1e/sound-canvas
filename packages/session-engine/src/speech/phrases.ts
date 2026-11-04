import type { Lang } from '../types';

/**
 * Fixed system phrases synthesized in the background at session start, so they play from cache when needed.
 * Texts must match what the app speaks verbatim.
 */
export const FIXED_PHRASES: Record<string, Record<Lang, string>> = {
  gpsWeak: { ko: 'GPS 신호가 약해요. 안내가 정확하지 않을 수 있어요.', en: 'GPS signal is weak. Guidance may be inaccurate.' },
  offRoute: { ko: '경로에서 벗어났어요. 다시 안내할까요?', en: 'You are off the route. Want me to reroute?' },
  gpsNoFix: { ko: '아직 GPS 위치를 잡지 못했어요.', en: 'I do not have a GPS fix yet.' },
  landmarksUnavailable: { ko: '지금은 역사 명소 정보를 가져오지 못했어요.', en: 'I could not load landmark information right now.' },
  arrived: { ko: '목적지에 도착했어요.', en: 'You have arrived.' },
  connectionLost: { ko: '연결이 끊겼어요. 잠시 후 다시 시도할게요.', en: 'The connection was lost. I will try again shortly.' },
  notUnderstood: { ko: '잘 못 알아들었어요. 다시 말씀해 주세요.', en: 'Sorry, I did not catch that. Please say it again.' },
  llmFiller: { ko: '잠깐만요.', en: 'One moment.' },
  guidanceStopped: { ko: '안내를 종료했어요.', en: 'Guidance stopped.' },
  noGuidance: { ko: '지금은 안내 중이 아니에요.', en: 'Guidance is not active.' },
};

export function fixedPhrases(lang: Lang): string[] {
  return Object.values(FIXED_PHRASES).map((p) => p[lang]);
}
