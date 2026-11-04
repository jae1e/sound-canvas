import type { Lang } from '@vlc/session-engine';

const YES_KO = /^(?:응|어|네|예|넵|그래|그래요|맞아|맞아요|맞습니다|좋아|좋아요|그렇게\s*해(?:줘|요)?|해줘|해주세요|오케이|ok)[\s.!]*$/u;
const NO_KO = /^(?:아니|아니요|아뇨|아냐|아니야|싫어|싫어요|하지\s*마|하지마|취소|됐어|됐어요|그만)[\s.!]*$/u;
const YES_EN = /^(?:yes|yeah|yep|yup|sure|ok|okay|correct|right|that'?s right|do it|go ahead|please do)[\s.!]*$/u;
const NO_EN = /^(?:no|nope|nah|don'?t|cancel|never ?mind|stop|forget it)[\s.!]*$/u;

/** Answer to a confirmation question. Anything else (`other`) means the user moved on: drop the pending action. */
export function parseYesNo(text: string, lang: Lang): 'yes' | 'no' | 'other' {
  const t = text.normalize('NFC').trim().toLowerCase().replace(/[’]/g, "'");
  if ((lang === 'ko' ? YES_KO : YES_EN).test(t) || (lang === 'ko' && YES_EN.test(t))) return 'yes';
  if ((lang === 'ko' ? NO_KO : NO_EN).test(t) || (lang === 'ko' && NO_EN.test(t))) return 'no';
  return 'other';
}

/** How long a confirmation question stays open. After this the default is "do nothing". */
export const CONFIRM_TTL_MS = 20_000;

export const retryMessage = (lang: Lang): string => (lang === 'ko' ? '잘 못 알아들었어요. 다시 말씀해 주세요.' : "Sorry, I didn't catch that. Please say it again.");
export const cancelledMessage = (lang: Lang): string => (lang === 'ko' ? '알겠어요, 하지 않을게요.' : "Okay, I won't.");
