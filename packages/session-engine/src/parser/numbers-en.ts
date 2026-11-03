/** English number words (0-99) and helpers for building duration patterns. */

const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

const SINGLE = Object.keys(ONES).filter((w) => ONES[w]! < 10 && ONES[w]! > 0).join('|');

/** Regex source matching an English number word expression (not digits, not "a"/"an"). */
export const EN_NUMBER_WORDS_SRC =
  `(?:${Object.keys(TENS).join('|')})(?:\\s+(?:${SINGLE}))?|${Object.keys(ONES).sort((a, b) => b.length - a.length).join('|')}`;

/** Parses "five", "twenty five", "thirty", "12", "1.5", "a", "an", "a couple of". */
export function parseEnNumber(phrase: string): number | undefined {
  const s = phrase.toLowerCase().trim().replace(/\s+/g, ' ');
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s === 'a' || s === 'an') return 1;
  if (s === 'a couple of' || s === 'a couple' || s === 'couple of' || s === 'couple') return 2;
  const parts = s.split(' ');
  if (parts.length === 1) return ONES[parts[0]!] ?? TENS[parts[0]!];
  if (parts.length === 2 && TENS[parts[0]!] !== undefined && ONES[parts[1]!] !== undefined && ONES[parts[1]!]! < 10) {
    return TENS[parts[0]!]! + ONES[parts[1]!]!;
  }
  return undefined;
}
