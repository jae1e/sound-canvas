import { formatDistance } from "./text";
import type { Lang, Landmark, LandmarkDetail, LandmarkSource } from "./types";

/*
 * Deterministic landmark narration. Everything spoken is either a sentence taken from the provider text
 * (cleaned for TTS) or a fixed template that names the landmark, the distance or the source. No facts are added.
 */

// ---------- text cleaning ----------

/** Strip HTML tags and entities from provider text. Keeps paragraph breaks as newlines. */
export function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|li|h[1-6])(\s[^>]*)?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_m, n: string) => {
      const c = Number(n);
      return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : " ";
    })
    .replace(/&amp;/gi, "&")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n[ \n]*/g, "\n")
    .trim();
}

const PAREN = /[(（[［][^()（）[\]［］]*[)）\]］]/g;
const HANJA = /[㐀-䶿一-鿿豈-﫿]+/g;

/** Remove parenthetical asides, hanja/kanji runs, URLs and list markers, then tidy spacing. */
export function removeClutter(text: string): string {
  let t = text;
  for (let i = 0; i < 4; i++) {
    const next = t.replace(PAREN, "");
    if (next === t) break;
    t = next;
  }
  return t
    .replace(/https?:\/\/\S+/g, " ")
    .replace(HANJA, "")
    .replace(/[※★☆◆◇■□●○▶▷◎·•]+/g, " ")
    .replace(/^[\s\-–—*]+/gm, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,;:])(?=[^\s\d])/g, "$1 ")
    .trim();
}

const EN_ABBREV = /\b(St|Mt|Mr|Mrs|Ms|Dr|No|Jr|Sr|vs|c|ca|approx|Co|Ltd)$/i;

/** Split text into sentences without lookbehind (Hermes friendly). Newlines are hard boundaries. */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let cur = "";
  const flush = () => {
    const s = cur.replace(/\s+/g, " ").trim();
    if (s) out.push(s);
    cur = "";
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === "\n") {
      flush();
      continue;
    }
    cur += ch;
    if (ch === "." || ch === "!" || ch === "?" || ch === "。") {
      const next = text[i + 1];
      const atEnd = next === undefined || /\s/.test(next);
      if (!atEnd) continue;
      if (ch === "." && EN_ABBREV.test(cur.slice(0, -1))) continue;
      flush();
    }
  }
  flush();
  return out;
}

/** Clean provider text and return speakable sentences in source order (duplicates and fragments dropped). */
export function prepareSentences(overview: string, _lang: Lang): string[] {
  const cleaned = removeClutter(stripHtml(overview));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of splitSentences(cleaned)) {
    const letters = s.replace(/[^\p{L}\p{N}]/gu, "");
    if (letters.length < 6 || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

// ---------- TTS-friendly numbers ----------

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function below100(n: number): string {
  if (n < 20) return ONES[n]!;
  return TENS[Math.floor(n / 10)]! + (n % 10 ? `-${ONES[n % 10]}` : "");
}

/** English year reading: 1395 -> "thirteen ninety-five", 1405 -> "fourteen oh five", 2005 -> "two thousand five". */
export function yearToWords(y: number): string {
  if (y === 1000) return "one thousand";
  if (y >= 2000 && y < 2010) return y === 2000 ? "two thousand" : `two thousand ${below100(y - 2000)}`;
  const hi = Math.floor(y / 100);
  const lo = y % 100;
  if (lo === 0) return `${below100(hi)} hundred`;
  return `${below100(hi)} ${lo < 10 ? `oh ${below100(lo)}` : below100(lo)}`;
}

/** Make numbers, units and ranges easy for a TTS engine. Run after sentence selection. */
export function speechNumbers(text: string, lang: Lang): string {
  let t = text;
  for (let i = 0; i < 3; i++) t = t.replace(/(\d),(\d{3})(?!\d)/g, "$1$2");
  if (lang === "ko") {
    return t
      .replace(/㎢|km²|km2/g, "제곱킬로미터")
      .replace(/㎡|m²|m2(?!\d)/g, "제곱미터")
      .replace(/㎞|(\d)\s*km\b/g, (_m, d?: string) => (d ? `${d}킬로미터` : "킬로미터"))
      .replace(/(\d)\s*m\b/g, "$1미터")
      .replace(/(\d)\s*%/g, "$1퍼센트")
      .replace(/(\d)\s*[~∼–—]\s*(\d)/g, "$1에서 $2")
      .replace(/\s*&\s*/g, " 그리고 ")
      .replace(/\s+/g, " ")
      .trim();
  }
  t = t
    .replace(/㎢|km²|km2/g, " square kilometers")
    .replace(/㎡|m²|m2(?!\d)/g, " square meters")
    .replace(/(\d)\s*km\b/g, "$1 kilometers")
    .replace(/(\d)\s*m\b/g, "$1 meters")
    .replace(/(\d)\s*%/g, "$1 percent")
    .replace(/(\d)\s*[~∼–—]\s*(\d)/g, "$1 to $2")
    .replace(/\s*&\s*/g, " and ")
    .replace(/\bNo\.\s*(\d)/g, "number $1");
  t = t.replace(/(^|[^\d.,$₩])(1\d{3}|20\d{2})(?![\d,]|\.\d|\s*(?:square|meters|kilometers|percent|people|visitors|won|yen|dollars))/g, (_m, pre: string, y: string) => `${pre}${yearToWords(Number(y))}`);
  return t.replace(/\s+/g, " ").trim();
}

// ---------- timing ----------

/** Rough speaking time. Korean about 5.5 syllables per second, English about 2.5 words per second. */
export function estimateSpeechSeconds(text: string, lang: Lang): number {
  if (lang === "ko") return text.replace(/\s+/g, "").length / 5.5;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return words / 2.5;
}

// ---------- sentence roles ----------

interface Roles {
  period: RegExp;
  why: RegExp;
  fact: RegExp;
}
const ROLES: Record<Lang, Roles> = {
  ko: {
    period: /\d{3,4}\s*년|\d{1,2}\s*세기|왕조|시대|시기|조선|고려|신라|백제|고구려|대한제국|일제강점|건립|창건|지어|세워|건축|축조|창립/,
    why: /중요|대표|가장|최초|유일|상징|세계|유네스코|문화유산|지정|사적|보물|국보|의미|역할|목적|위해|때문|중심|법궁/,
    fact: /\d|최초|처음|유일|가장|무려|지금도|오늘날|현재|복원|재건|화재|소실|불에|전해|전설|이름|뜻|수문장|행사|축제/,
  },
  en: {
    period: /\b(1\d{3}|20\d{2})\b|century|dynasty|\bera\b|\bperiod\b|joseon|goryeo|silla|baekje|empire|colonial|\bbuilt\b|founded|constructed|established/i,
    why: /important|significan|famous|largest|oldest|\bfirst\b|\bonly\b|symbol|unesco|world heritage|designated|national treasure|served|purpose|represent|center|main palace/i,
    fact: /\d|\bfirst\b|\bonly\b|largest|oldest|rebuilt|restored|destroyed|\bfire\b|legend|named|means|ceremony|festival|still/i,
  },
};

const hits = (re: RegExp, s: string): number => {
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
  return (s.match(g) ?? []).length;
};

// ---------- spoken templates ----------

/** What the source is, for the spoken line and on-screen label. */
export function sourceSpoken(source: LandmarkSource, lang: Lang): string {
  const ko: Record<LandmarkSource, string> = {
    tourapi: "한국관광공사 관광 정보를 바탕으로 한 설명이에요.",
    kakao: "카카오 장소 정보예요.",
    wikipedia: "위키백과 요약을 바탕으로 한 설명이에요.",
    fixture: "앱에 들어 있는 샘플 설명이에요.",
  };
  const en: Record<LandmarkSource, string> = {
    tourapi: "This is based on Korea Tourism Organization data.",
    kakao: "This is Kakao place data.",
    wikipedia: "This is based on a Wikipedia summary.",
    fixture: "This is sample text bundled with the app.",
  };
  return (lang === "ko" ? ko : en)[source];
}

const sourceShort = (source: LandmarkSource, lang: Lang): string => {
  const ko: Record<LandmarkSource, string> = { tourapi: "한국관광공사 자료", kakao: "카카오 장소 정보", wikipedia: "위키백과", fixture: "샘플 데이터" };
  const en: Record<LandmarkSource, string> = { tourapi: "Korea Tourism Organization data", kakao: "Kakao place data", wikipedia: "Wikipedia", fixture: "sample data" };
  return (lang === "ko" ? ko : en)[source];
};

/** First sentence of provider text, cleaned and shortened to at most `max` characters at a word boundary. */
export function oneLineFrom(overview: string, lang: Lang, max = 80): string {
  const first = prepareSentences(overview, lang)[0] ?? "";
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  const sp = lang === "en" ? cut.lastIndexOf(" ") : -1;
  return `${(sp > max * 0.5 ? cut.slice(0, sp) : cut).replace(/[\s,;:]+$/, "")}…`;
}

const ORDINAL_KO = ["첫 번째", "두 번째", "세 번째"];
const ORDINAL_EN = ["First", "Second", "Third"];

export interface LandmarkListAnswer {
  text: string;
  /** Spoken chunks, one per landmark, so a stop request can land between them. */
  chunks: string[];
  landmarks: Landmark[];
}

/** Spoken list of the nearest 2 to 3 landmarks with distance and one line each. */
export function composeLandmarkList(landmarks: Landmark[], lang: Lang, opts: { max?: number; radiusM?: number } = {}): LandmarkListAnswer {
  const list = landmarks.slice().sort((a, b) => a.distanceM - b.distanceM).slice(0, Math.max(1, Math.min(opts.max ?? 3, 3)));
  if (list.length === 0) {
    const within = opts.radiusM ? formatDistance(opts.radiusM, lang) : "";
    const text =
      lang === "ko"
        ? `근처${within ? ` ${within} 안에` : "에"} 소개할 만한 역사 명소를 찾지 못했어요.`
        : `I could not find a historic landmark ${within ? `within ${within}` : "nearby"}.`;
    return { text, chunks: [text], landmarks: [] };
  }
  const chunks: string[] = [];
  chunks.push(lang === "ko" ? `근처 역사 명소 ${list.length}곳이에요.` : `${list.length === 1 ? "One historic landmark" : `${list.length} historic landmarks`} nearby.`);
  list.forEach((l, i) => {
    const line = oneLineFrom(l.oneLine, lang, 70);
    if (lang === "ko") {
      chunks.push(`${ORDINAL_KO[i]}, ${l.name}, ${formatDistance(l.distanceM, "ko")} 거리예요.${line ? ` ${endWithPeriod(line)}` : ""}`);
    } else {
      chunks.push(`${ORDINAL_EN[i]}, ${l.name}, ${formatDistance(l.distanceM, "en")} away.${line ? ` ${endWithPeriod(line)}` : ""}`);
    }
  });
  const sources = [...new Set(list.map((l) => l.source))].map((s) => sourceShort(s, lang)).join(lang === "ko" ? ", " : ", ");
  chunks.push(
    lang === "ko"
      ? `${sources} 기준이에요. 궁금한 곳은 "두 번째 알려줘"처럼 말해 보세요.`
      : `Based on ${sources}. Say "tell me about the second one" to hear more.`,
  );
  const spoken = chunks.map((c) => speechNumbers(c, lang));
  return { text: spoken.join(" "), chunks: spoken, landmarks: list };
}

const endWithPeriod = (s: string): string => (/[.!?…]$/.test(s) ? s : `${s}.`);

export interface NarrationScript {
  text: string;
  /** Sentence-sized chunks (intro, body sentences, source line). */
  chunks: string[];
  seconds: number;
  /** Cleaned source sentences spoken in the body, in order. */
  used: string[];
  /** True when the source has sentences that were left out (so "more" has something to say). */
  hasMore: boolean;
}

export interface NarrationOptions {
  minSeconds?: number;
  maxSeconds?: number;
}

/** Split an over-long sentence at commas so chunks stay short. */
function splitLong(s: string, lang: Lang): string[] {
  const limit = lang === "ko" ? 90 : 180;
  if (s.length <= limit) return [s];
  return softSplit(s, limit);
}

function softSplit(s: string, limit: number): string[] {
  const out: string[] = [];
  let rest = s;
  while (rest.length > limit) {
    let at = -1;
    for (let i = Math.min(rest.length - 1, limit + 30); i > limit * 0.4; i--) {
      if (rest[i] === "," || rest[i] === "，") {
        at = i + 1;
        break;
      }
    }
    if (at < 0) break;
    out.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) out.push(rest);
  return out;
}

/**
 * Pick sentences for a 30 to 60 second spoken explanation: the first sentence (what it is), then the best sentence
 * for period, importance and an interesting fact, kept in source order. If the source is short, all of it is used.
 */
export function selectSentences(sentences: string[], lang: Lang, maxSeconds: number, minSeconds: number): { picked: number[]; leftover: number[] } {
  const roles = ROLES[lang];
  const sec = (i: number) => estimateSpeechSeconds(sentences[i]!, lang);
  const chosen = new Set<number>();
  let total = 0;
  const add = (i: number, force = false): boolean => {
    if (chosen.has(i)) return false;
    if (!force && total + sec(i) > maxSeconds) return false;
    chosen.add(i);
    total += sec(i);
    return true;
  };
  if (sentences.length === 0) return { picked: [], leftover: [] };
  add(0, true);
  for (const re of [roles.period, roles.why, roles.fact]) {
    let best = -1;
    let bestScore = 0;
    for (let i = 1; i < sentences.length; i++) {
      if (chosen.has(i)) continue;
      const sc = hits(re, sentences[i]!);
      if (sc > bestScore) {
        best = i;
        bestScore = sc;
      }
    }
    if (best >= 0) add(best);
  }
  for (let i = 1; i < sentences.length && total < minSeconds; i++) add(i);
  const picked = [...chosen].sort((a, b) => a - b);
  const leftover = sentences.map((_s, i) => i).filter((i) => !chosen.has(i));
  return { picked, leftover };
}

/** Spoken explanation for one landmark, built only from the supplied detail text. */
export function composeLandmarkNarration(name: string, detail: LandmarkDetail, lang: Lang, opts: NarrationOptions = {}): NarrationScript {
  const maxS = opts.maxSeconds ?? 52; // leaves room for the intro and source line within 60 s
  const minS = opts.minSeconds ?? 30;
  const sentences = prepareSentences(detail.overview, lang);
  if (sentences.length === 0) {
    const text =
      lang === "ko" ? `${name}에 대해 읽어 드릴 설명 자료가 없어요.` : `I do not have a description for ${name}.`;
    return { text, chunks: [text], seconds: estimateSpeechSeconds(text, lang), used: [], hasMore: false };
  }
  const { picked, leftover } = selectSentences(sentences, lang, maxS, minS);
  const used = picked.map((i) => sentences[i]!);
  const intro = lang === "ko" ? `${name}에 대해 알려 드릴게요.` : `Here is what I have on ${name}.`;
  const body = used.flatMap((s) => splitLong(endWithPeriod(s), lang)).map((s) => speechNumbers(s, lang));
  const outro = sourceSpoken(detail.source, lang);
  const chunks = [intro, ...body, outro];
  const text = chunks.join(" ");
  return { text, chunks, seconds: estimateSpeechSeconds(text, lang), used, hasMore: leftover.length > 0 };
}

export type LandmarkTopic = "period" | "why" | "more" | "hours" | "fee";

export interface FollowupAnswer {
  text: string;
  chunks: string[];
  /** Newly spoken source sentences (add them to the already-used list). */
  used: string[];
}

const FACT_LABEL: Record<"hours" | "fee", Record<Lang, string>> = {
  hours: { ko: "운영 시간", en: "Opening hours" },
  fee: { ko: "입장료", en: "Admission" },
};

/**
 * Answer a follow-up from the same source text: when was it built, why does it matter, hours, fee, or "more".
 * `alreadyUsed` holds source sentences that were spoken before, so "more" continues instead of repeating.
 */
export function composeLandmarkFollowup(name: string, detail: LandmarkDetail, topic: LandmarkTopic, lang: Lang, alreadyUsed: string[] = []): FollowupAnswer {
  const sentences = prepareSentences(detail.overview, lang);
  const done = new Set(alreadyUsed);
  const roles = ROLES[lang];
  const sourceLine = sourceSpoken(detail.source, lang);
  const none = (ko: string, en: string): FollowupAnswer => {
    const text = lang === "ko" ? ko : en;
    return { text, chunks: [text], used: [] };
  };
  const answer = (picked: string[]): FollowupAnswer => {
    const body = picked.flatMap((s) => splitLong(endWithPeriod(s), lang)).map((s) => speechNumbers(s, lang));
    const chunks = [...body, sourceLine];
    return { text: chunks.join(" "), chunks, used: picked };
  };

  if (topic === "hours" || topic === "fee") {
    const keys = topic === "hours" ? (["hours", "closed"] as const) : (["fee"] as const);
    const facts = detail.facts.filter((f) => (keys as readonly string[]).includes(f.key));
    if (facts.length === 0) {
      return none(`${name}의 ${FACT_LABEL[topic].ko}은 제가 가진 자료에 나와 있지 않아요.`, `${FACT_LABEL[topic].en} for ${name} is not in my source.`);
    }
    const parts = facts.map((f) => speechNumbers(removeClutter(stripHtml(f.value)), lang)).filter(Boolean);
    const label = lang === "ko" ? (topic === "hours" ? "운영 시간 정보예요." : "입장료 정보예요.") : topic === "hours" ? "Hours information." : "Admission information.";
    const chunks = [label, ...parts.map(endWithPeriod), sourceSpoken(detail.source, lang)];
    return { text: chunks.join(" "), chunks, used: [] };
  }

  if (topic === "period" || topic === "why") {
    const re = topic === "period" ? roles.period : roles.why;
    const matches = sentences
      .map((s, i) => ({ s, i, sc: hits(re, s) }))
      .filter((x) => x.sc > 0)
      .sort((a, b) => b.sc - a.sc || a.i - b.i)
      .slice(0, 2)
      .sort((a, b) => a.i - b.i)
      .map((x) => x.s);
    if (matches.length === 0) {
      return topic === "period"
        ? none(`${name}이 언제 지어졌는지는 제가 가진 자료에 나와 있지 않아요.`, `My source does not say when ${name} was built.`)
        : none(`${name}이 왜 중요한지는 제가 가진 자료에 나와 있지 않아요.`, `My source does not say why ${name} matters.`);
    }
    return answer(matches);
  }

  // more
  const rest = sentences.filter((s) => !done.has(s)).slice(0, 3);
  if (rest.length === 0) {
    return none(`${name}에 대해 자료에 더 나와 있는 내용은 없어요.`, `My source has nothing more on ${name}.`);
  }
  return answer(rest);
}

/** Hook for later LLM rephrasing and open-ended questions (milestone M4). Not implemented yet; nothing calls it. */
export interface AskLlmRequest {
  lang: Lang;
  question: string;
  landmarkName: string;
  /** The only facts the model may use. */
  sourceText: string;
  source: LandmarkSource;
}

export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`${what} is not implemented yet`);
  }
}

export async function askLlm(_req: AskLlmRequest): Promise<string> {
  throw new NotImplementedError("askLlm (M4)");
}
