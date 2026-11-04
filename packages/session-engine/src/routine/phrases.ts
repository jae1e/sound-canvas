import type { Lang } from '../types';

/** Spoken numerals for pacing. Korean counts use the native series ("하나, 둘, 셋"), English uses words. */

const KO_ONES = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉'];
const KO_TENS = ['', '열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔'];

/** Native Korean count: 1 -> 하나, 15 -> 열다섯, 20 -> 스물. Values above 99 are spoken as digits. */
export function koCount(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 99) return String(n);
  return `${KO_TENS[Math.floor(n / 10)]}${KO_ONES[n % 10]}`;
}

const EN_ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

export function enCount(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99) return String(n);
  if (n < 20) return EN_ONES[n]!;
  return `${EN_TENS[Math.floor(n / 10)]}${n % 10 ? `-${EN_ONES[n % 10]}` : ''}`;
}

export function countWord(n: number, lang: Lang): string {
  return lang === 'ko' ? koCount(n) : enCount(n);
}

export function secondsPhrase(sec: number, lang: Lang): string {
  const s = Math.round(sec);
  return lang === 'ko' ? `${s}초` : `${s} seconds`;
}

/** Fixed vocabulary every routine pre-synthesizes (numbers 1-30 and the countdown, hold and rest words). */
export function baseVocabulary(lang: Lang): string[] {
  const out: string[] = [];
  for (let n = 1; n <= 30; n++) out.push(countWord(n, lang));
  const ko = lang === 'ko';
  out.push(
    ko ? '10초 남았어요' : 'ten seconds left',
    ko ? '반대쪽' : 'other side',
    ko ? '왼쪽' : 'left side',
    ko ? '오른쪽' : 'right side',
    ko ? '다음 세트' : 'next set',
    ko ? '휴식' : 'rest',
    ko ? '다시 한 번' : 'again',
    ko ? '기합!' : 'kihap!',
    ko ? '잠시 멈춤' : 'paused',
    ko ? '수고하셨어요' : 'well done',
  );
  return out;
}

/** Rough spoken length (ms) when a real clip duration is not known yet. Used only for planning. */
export function estimateClipMs(text: string, lang: Lang): number {
  const chars = text.replace(/\s+/g, '').length;
  return Math.round(260 + chars * (lang === 'ko' ? 170 : 70));
}
