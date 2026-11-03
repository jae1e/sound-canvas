/** Korean numeral parsing (Sino-Korean and native Korean), up to a few hundred. */

const SINO_DIGITS: Record<string, number> = {
  일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9,
};

const NATIVE_TENS: Record<string, number> = {
  열: 10, 스물: 20, 스무: 20, 서른: 30, 마흔: 40, 쉰: 50, 예순: 60,
};

const NATIVE_ONES: Record<string, number> = {
  한: 1, 두: 2, 세: 3, 석: 3, 네: 4, 넉: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9,
};

const NATIVE_RE = /^(열|스물|스무|서른|마흔|쉰|예순)?(한|두|세|석|네|넉|다섯|여섯|일곱|여덟|아홉)?$/;

/** Every character that can appear in a Korean numeral word. */
export const KO_NUMERAL_CHARS = Array.from(
  new Set(
    [...Object.keys(SINO_DIGITS), '십', '백', ...Object.keys(NATIVE_TENS), ...Object.keys(NATIVE_ONES)].join(''),
  ),
).join('');

function parseNative(s: string): number | undefined {
  const m = NATIVE_RE.exec(s);
  if (!m || (!m[1] && !m[2])) return undefined;
  const tens = m[1] ? NATIVE_TENS[m[1]]! : 0;
  const ones = m[2] ? NATIVE_ONES[m[2]]! : 0;
  if (m[1] === '스무' && m[2]) return undefined; // 스무 is only the standalone form of twenty
  return tens + ones;
}

function parseSino(s: string): number | undefined {
  if (!s) return undefined;
  let total = 0;
  let current = 0;
  let prevDigit = false;
  for (const ch of s) {
    const digit = SINO_DIGITS[ch];
    if (digit !== undefined) {
      if (prevDigit) return undefined;
      current = digit;
      prevDigit = true;
    } else if (ch === '십' || ch === '백') {
      total += (current || 1) * (ch === '십' ? 10 : 100);
      current = 0;
      prevDigit = false;
    } else {
      return undefined;
    }
  }
  return total + current;
}

/** Parses "15", "십오", "삼십", "이", "열다섯", "스물", "두". Returns undefined if not a numeral. */
export function parseKoNumber(word: string): number | undefined {
  const s = word.normalize('NFC').trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  return parseNative(s) ?? parseSino(s);
}
