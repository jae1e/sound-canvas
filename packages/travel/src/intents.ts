import { findCategory } from "./categories";
import type { LandmarkTopic } from "./narration";
import type { Lang, Landmark } from "./types";

/** Which place the user means when asking for navigation. */
export type PlaceRef =
  | { kind: "ordinal"; index: number } // 0-based index into the last spoken list
  | { kind: "last_mentioned" }
  | { kind: "nearest"; category?: string }
  /** A name or noun in the utterance ("that palace", "경복궁"); `text` is the normalized utterance. */
  | { kind: "keyword"; text: string };

export type TravelIntent =
  | { type: "nearby"; lang: Lang; category?: string; query?: string; radiusM?: number }
  | { type: "where_am_i"; lang: Lang }
  | { type: "how_far"; lang: Lang }
  | { type: "next_turn"; lang: Lang }
  | { type: "navigate_to"; lang: Lang; ref: PlaceRef }
  | { type: "stop_navigation"; lang: Lang }
  | { type: "landmarks_nearby"; lang: Lang; radiusM?: number }
  | { type: "landmark_info"; lang: Lang; ref: PlaceRef }
  | { type: "landmark_followup"; lang: Lang; topic: LandmarkTopic; ref?: PlaceRef }
  | { type: "stop_narration"; lang: Lang };

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
  const lm = parseLandmarkIntent(s, lang, cat !== undefined);
  if (lm) return lm;
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

// ---------- landmarks ----------

const STOP_NARRATION =
  /^(멈춰|멈춰줘|멈춰봐|그만|그만해|그만해줘|그만 말해|스톱|정지|중지|됐어|충분해|조용히|stop|stop it|stop talking|stop reading|pause|enough|that'?s enough|be quiet|never ?mind)$/;
const LM_THEME =
  /역사|유적|유물|고궁|궁궐|문화재|사적지?|랜드마크|\bhistor(y|ic|ical)\b|\blandmarks?\b|\bmonuments?\b|\bheritage\b|\bpalaces?\b|\btemples?\b/;
const LM_ASK = /추천|알려|있어|있나|가볼|구경|볼\s*만|어디|\brecommend|\bany\b|\bwhere\b|\bshow\b|\bwhat\b|\bsee\b|\bvisit\b|\bis there\b|\bare there\b/;
const LM_INFO =
  /알려|설명|소개|어떤\s*(곳|데|장소)|무슨\s*곳|뭐\s*하는|이야기|얘기|들려|\btell me (about|more about)\b|\bwhat('?s| is| are) (it|that|this|there|the (first|second|third|last))\b|\babout (it|that|the|this)\b|\bdescribe\b|\bexplain\b|\bwhat kind of place\b|\bwhat about\b/;
const F_PERIOD =
  /언제.*(지어|세워|만들|건립|창건|세웠|지은|생겼|만든)|몇\s*년.*(지어|세워|건립|창건)|건립\s*(시기|연도)|\bwhen\b.*\b(built|constructed|founded|established|made|opened)\b|\bwhat year\b|\bhow old\b/;
const F_HOURS =
  /몇\s*시.*(까지|부터|열|닫)|운영\s*시간|영업\s*시간|관람\s*시간|개방\s*시간|쉬는\s*날|휴무|\bopening hours\b|\bopen(s|ing)? (hours|times?)\b|\bwhat time\b.*\b(open|close)|\bis it open\b|\bclosed on\b|\bwhen (does|is) (it|that)\b.*\b(open|close)/;
const F_FEE = /입장료|관람료|입장\s*요금|\badmission\b|\bentrance fee\b|\btickets?\b|\bhow much\b.*\b(cost|entry|admission|ticket)/;
const F_WHY = /왜.*(유명|중요|특별)|무엇이\s*(특별|유명)|뭐가\s*(특별|유명)|\bwhy\b.*\b(famous|important|special|significant)\b|\bwhat makes\b.*\b(special|famous)\b/;
const F_MORE =
  /^(더|계속|좀 더|조금 더|더 알려줘|더 말해줘|더 들려줘|더 얘기해줘|계속해줘|계속 말해줘)$|더\s*(알려|말해|들려|얘기|설명)|계속\s*(해|말|설명|읽)|^(tell me |say |give me )?(a little |a bit )?more( about (it|that|this|there))?$|^(go on|continue|keep going)$/;
const STRICT_ORDINAL = /번째|\b(first|second|third|last|1st|2nd|3rd) one\b|\bnumber (1|2|3|one|two|three)\b|#\d/;

/** Noun hints for "that palace": the asking word and a pattern for landmark names. */
const KEYWORD_REFS: Array<{ ask: RegExp; name: RegExp }> = [
  { ask: /palace|궁궐|고궁|궁(?!금)/, name: /궁|palace/i },
  { ask: /temple|사찰|절(?![가-힣])/, name: /사$|사\s|절|temple/i },
  { ask: /\bgate\b|대문|(^|\s)문(\s|$)/, name: /문|gate/i },
  { ask: /\bbell\b|종각|보신각|(^|\s)종(\s|$)/, name: /각|bell/i },
  { ask: /stream|creek|하천|개천|(^|\s)천(\s|$)/, name: /천|stream/i },
];

function landmarkRef(s: string, strict: boolean): PlaceRef | undefined {
  if (!strict || STRICT_ORDINAL.test(s)) {
    for (const [index, re] of ORDINALS) if (re.test(s)) return { kind: "ordinal", index };
    if (LAST.test(s)) return { kind: "ordinal", index: -1 };
  }
  if (!strict && THERE.test(s)) return { kind: "last_mentioned" };
  if (KEYWORD_REFS.some((k) => k.ask.test(s))) return { kind: "keyword", text: s };
  return undefined;
}

function parseLandmarkIntent(s: string, lang: Lang, hasCategory: boolean): TravelIntent | null {
  if (STOP_NARRATION.test(s)) return { type: "stop_narration", lang };

  const followTopic: LandmarkTopic | null = F_PERIOD.test(s)
    ? "period"
    : F_HOURS.test(s)
      ? "hours"
      : F_FEE.test(s)
        ? "fee"
        : F_WHY.test(s)
          ? "why"
          : F_MORE.test(s)
            ? "more"
            : null;
  if (followTopic && !NEARBY_TRIGGER.test(s)) {
    const ref = landmarkRef(s, true);
    return ref ? { type: "landmark_followup", lang, topic: followTopic, ref } : { type: "landmark_followup", lang, topic: followTopic };
  }

  if (LM_INFO.test(s) && !NEARBY_TRIGGER.test(s) && !hasCategory && !GO.test(s)) {
    const ref = landmarkRef(s, false);
    if (ref) return { type: "landmark_info", lang, ref };
    // A bare name ("경복궁 알려줘"): the controller matches it against the last list or ignores the utterance.
    if (!LM_THEME.test(s)) return { type: "landmark_info", lang, ref: { kind: "keyword", text: s } };
  }

  if (LM_THEME.test(s) && !hasCategory && (NEARBY_TRIGGER.test(s) || LM_ASK.test(s)) && !GO.test(s) && !ORDINALS.some(([, re]) => re.test(s)) && !LAST.test(s) && !/거기|그곳|저기|\bthat one\b/.test(s)) {
    const radiusM = parseRadius(s);
    return radiusM ? { type: "landmarks_nearby", lang, radiusM } : { type: "landmarks_nearby", lang };
  }
  return null;
}

/**
 * Resolve a landmark reference: ordinal, "that one", a name said in the utterance, or a noun like "palace".
 * Returns undefined when nothing matches.
 */
export function resolveLandmarkRef(ref: PlaceRef, list: readonly Landmark[], lastMentioned?: Landmark): Landmark | undefined {
  if (ref.kind !== "keyword") return resolvePlaceRef(ref, list, lastMentioned);
  const text = ref.text.toLowerCase();
  const squashed = text.replace(/\s+/g, "");
  const byName = list.find((l) => {
    const n = l.name.toLowerCase().replace(/\s+/g, "");
    if (n.length >= 2 && squashed.includes(n)) return true;
    return l.name
      .toLowerCase()
      .split(/[\s\-]+/)
      .some((tok) => tok.length >= 4 && !GENERIC_TOKENS.has(tok) && text.includes(tok));
  });
  if (byName) return byName;
  for (const k of KEYWORD_REFS) {
    if (!k.ask.test(text)) continue;
    const found = list.filter((l) => k.name.test(l.name));
    if (found.length === 1) return found[0];
    if (found.length > 1) return lastMentioned && found.includes(lastMentioned) ? lastMentioned : found[0];
  }
  return undefined;
}

const GENERIC_TOKENS = new Set(["palace", "temple", "gate", "street", "stream", "tower", "the", "park", "area", "road", "square"]);

/** Resolve a place reference against the last list spoken to the user. */
export function resolvePlaceRef<T>(ref: PlaceRef, lastList: readonly T[], lastMentioned?: T): T | undefined {
  if (ref.kind === "ordinal") {
    return ref.index < 0 ? lastList[lastList.length - 1] : lastList[ref.index];
  }
  if (ref.kind === "keyword") return undefined;
  if (ref.kind === "last_mentioned") return lastMentioned ?? (lastList.length === 1 ? lastList[0] : undefined);
  return lastList[0];
}
