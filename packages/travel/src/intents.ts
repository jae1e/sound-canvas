import { findCategory } from "./categories";
import type { Lang } from "./types";

/** Which place the user means when asking for navigation. */
export type PlaceRef =
  | { kind: "ordinal"; index: number } // 0-based index into the last spoken list
  | { kind: "last_mentioned" }
  | { kind: "nearest"; category?: string };

export type TravelIntent =
  | { type: "nearby"; lang: Lang; category?: string; query?: string; radiusM?: number }
  | { type: "where_am_i"; lang: Lang }
  | { type: "how_far"; lang: Lang }
  | { type: "next_turn"; lang: Lang }
  | { type: "navigate_to"; lang: Lang; ref: PlaceRef }
  | { type: "stop_navigation"; lang: Lang };

const WALK_M_PER_MIN = 80;

const STOP =
  /안내\s*(를\s*)?(종료|중지|중단|그만|취소|끝|멈춰)|(내비|네비|길안내|길\s*안내)\s*(를\s*)?(종료|그만|꺼|끄|중지|취소)|경로\s*(취소|종료)|그만\s*(가|갈|걸)|\b(stop|end|cancel|quit|exit)\b.{0,15}\b(navigation|navigating|guidance|guiding|route|directions|walk)\b|\bstop (guiding|navigating)\b/;
const HOW_FAR =
  /얼마나\s*(더\s*)?(남|걸|가야)|얼마\s*(남|걸)|도착.{0,6}(언제|얼마|몇)|몇\s*분\s*(남|걸)|남았|\bhow (much )?(far|farther|further|longer)\b|\bhow long (is it )?(left|until|till)\b|\bhow many (more )?(minutes|meters)\b|\beta\b|\bare we there yet\b/;
const WHERE =
  /(지금|현재)\s*어디|(여기|이곳)\s*(가|는|이)?\s*어디|현재\s*위치|내\s*위치|어디\s*(야|지|니|인가요?|예요)\s*$|어디\s*(있|쯤)|\bwhere am i\b|\bwhere are we\b|\bmy (current )?(location|position|address)\b|\bcurrent location\b|\bwhat('?s| is) (this|my) (place|address|location)\b/;
const NEXT_TURN =
  /다음\s*(에)?\s*(어디|뭐|어떻게|안내|길|회전)|어디로\s*가(야|면)|어느\s*쪽|\bwhat('?s| is) next\b|\bnext turn\b|\bwhich way\b|\bwhere (do|should) i (go|turn)\b/;
const GO =
  /가자|갈래|가줘|가볼래|가고\s*싶|안내|데려|찾아가|\btake me\b|\bnavigate\b|\bwalk me\b|\bguide me\b|\bbring me\b|\blet'?s go\b|\bgo to\b|\bgo there\b|\bdirections? to\b|\bhead to\b/;
const THERE = /거기|그곳|저기|그리로|그쪽|\bthere\b|\bthat one\b|\bthat place\b/;
const NEARBY_TRIGGER =
  /근처|가까운|가까이|주변|근방|인근|\baround\b|\bnearby\b|\bnear (me|here)\b|\bclosest\b|\bnearest\b|\bclose (by|to me)\b/;
const QUESTION =
  /있어|있나|어디|알려|찾아|추천|갈\s*만한|\bwhere\b|\bfind\b|\bany\b|\bis there\b|\bare there\b|\brecommend\b|\bshow\b|\bwhat\b/;

const ORDINALS: Array<[number, RegExp]> = [
  [0, /첫\s*(번)?째|첫\s*번|처음|한\s*번째|(^|\s)1\s*번|\b(first|1st)\b|\b(number|no\.?|#)\s*(1|one)\b/],
  [1, /두\s*번째|둘째|이\s*번째|(^|\s)2\s*번|\b(second|2nd)\b|\b(number|no\.?|#)\s*(2|two)\b/],
  [2, /세\s*번째|셋째|삼\s*번째|(^|\s)3\s*번|\b(third|3rd)\b|\b(number|no\.?|#)\s*(3|three)\b/],
];
const LAST = /마지막|\blast\b/;

function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.,!?~"'`]+(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const detectLang = (s: string): Lang => (/[가-힣]/.test(s) ? "ko" : "en");

function parseRadius(s: string): number | undefined {
  const min = /(\d+)\s*분/.exec(s) ?? /\bwithin (\d+)\s*(?:min|minutes)\b/.exec(s) ?? /(\d+)\s*(?:min|minutes?)\s*(?:walk|away)?/.exec(s);
  if (min) return Math.min(20000, Number(min[1]) * WALK_M_PER_MIN);
  const km = /(\d+(?:\.\d+)?)\s*(?:km|킬로)/.exec(s);
  if (km) return Math.min(20000, Math.round(Number(km[1]) * 1000));
  const m = /(\d+)\s*(?:m\b|미터|meters?)/.exec(s);
  if (m) return Math.min(20000, Number(m[1]));
  return undefined;
}

const FILLER =
  /근처에?|가까운|가까이|주변|근방|인근|있어|있나요?|알려줘|알려주세요|추천해줘|추천|찾아줘|찾아|어디|뭐|좀|\b(what'?s|what|where|is|are|there|any|here|around|nearby|near me|closest|nearest|find|me|a|an|the|some|show|recommend|good|please|can you|any)\b/g;

/**
 * Parse a Korean or English utterance into a travel intent, or null when it is not travel related.
 * Pure and independent of the session engine.
 */
export function parseTravelIntent(raw: string): TravelIntent | null {
  const s = normalize(raw);
  if (!s) return null;
  const lang = detectLang(s);
  const cat = findCategory(s);

  if (STOP.test(s)) return { type: "stop_navigation", lang };
  if (HOW_FAR.test(s) && !cat) return { type: "how_far", lang };

  if (GO.test(s)) {
    for (const [index, re] of ORDINALS) {
      if (re.test(s)) return { type: "navigate_to", lang, ref: { kind: "ordinal", index } };
    }
    if (LAST.test(s)) return { type: "navigate_to", lang, ref: { kind: "ordinal", index: -1 } };
    if (THERE.test(s)) return { type: "navigate_to", lang, ref: { kind: "last_mentioned" } };
    if (cat && NEARBY_TRIGGER.test(s)) return { type: "navigate_to", lang, ref: { kind: "nearest", category: cat.key } };
    // A bare "let's go" / "안내해줘" refers to the place discussed last.
    if (!cat && !NEARBY_TRIGGER.test(s)) return { type: "navigate_to", lang, ref: { kind: "last_mentioned" } };
  }

  if (NEXT_TURN.test(s) && !cat) return { type: "next_turn", lang };
  if (WHERE.test(s) && !cat && !NEARBY_TRIGGER.test(s)) return { type: "where_am_i", lang };

  const radiusM = parseRadius(s);
  const wantsNearby = NEARBY_TRIGGER.test(s) || (cat && (QUESTION.test(s) || radiusM !== undefined)) || (radiusM !== undefined && /갈\s*만한|추천|recommend|go\b/.test(s));
  if (wantsNearby) {
    const out: TravelIntent = { type: "nearby", lang };
    if (cat) out.category = cat.key;
    else {
      const query = s
        .replace(FILLER, " ")
        .replace(/\d+\s*(분|미터|m|km|킬로|min(utes?)?)\s*(안에|이내|내|away|walk)?/g, " ")
        .replace(/\b(within|in)\b/g, " ")
        .replace(/[은는이가을를에의로?]\s*$/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (query && query.length >= 2 && !/갈\s*만한|곳|장소|\bplaces?\b/.test(query)) out.query = query;
    }
    if (radiusM) out.radiusM = radiusM;
    return out;
  }
  return null;
}

/** Resolve a place reference against the last list spoken to the user. */
export function resolvePlaceRef<T>(ref: PlaceRef, lastList: readonly T[], lastMentioned?: T): T | undefined {
  if (ref.kind === "ordinal") {
    return ref.index < 0 ? lastList[lastList.length - 1] : lastList[ref.index];
  }
  if (ref.kind === "last_mentioned") return lastMentioned ?? (lastList.length === 1 ? lastList[0] : undefined);
  return lastList[0];
}
