/** Korean particle selection by the final consonant (batchim) of the preceding word. */

/** Final-consonant index (0 = none, 8 = ㄹ) of the Sino-Korean reading of each digit. */
const DIGIT_JONG: Record<string, number> = {
  '0': 21, // 영 (ㅇ)
  '1': 8, // 일 (ㄹ)
  '2': 0, // 이
  '3': 16, // 삼 (ㅁ)
  '4': 0, // 사
  '5': 0, // 오
  '6': 1, // 육 (ㄱ)
  '7': 8, // 칠 (ㄹ)
  '8': 8, // 팔 (ㄹ)
  '9': 0, // 구
};

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const RIEUL_JONG = 8;

function lastSyllable(word: string): string | undefined {
  const chars = Array.from(word.normalize('NFC')).filter((ch) => /[\p{L}\p{N}]/u.test(ch));
  return chars[chars.length - 1];
}

function jongseong(word: string): number | undefined {
  const ch = lastSyllable(word);
  if (!ch) return undefined;
  const code = ch.codePointAt(0)!;
  if (code >= HANGUL_BASE && code <= HANGUL_END) return (code - HANGUL_BASE) % 28;
  if (ch in DIGIT_JONG) return DIGIT_JONG[ch];
  return 0; // Latin and other scripts: treated as vowel-final (no reliable rule without a pronunciation dictionary)
}

export function hasFinalConsonant(word: string): boolean {
  return (jongseong(word) ?? 0) !== 0;
}

export type ParticleKind = 'topic' | 'subject' | 'object' | 'instrumental' | 'with';

/**
 * - topic: 은/는, subject: 이/가, object: 을/를
 * - instrumental: 으로/로 (a final ㄹ takes 로: 물로, but 밥으로)
 * - with: colloquial 이랑/랑
 */
export function particle(word: string, kind: ParticleKind): string {
  const jong = jongseong(word) ?? 0;
  const batchim = jong !== 0;
  switch (kind) {
    case 'topic':
      return batchim ? '은' : '는';
    case 'subject':
      return batchim ? '이' : '가';
    case 'object':
      return batchim ? '을' : '를';
    case 'instrumental':
      return batchim && jong !== RIEUL_JONG ? '으로' : '로';
    case 'with':
      return batchim ? '이랑' : '랑';
  }
}

export function withParticle(word: string, kind: ParticleKind): string {
  return word + particle(word, kind);
}
