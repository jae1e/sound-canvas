import type { Lang } from "./types";

/** Kakao Local category group codes used by the app, with bilingual names and match patterns. */
export interface CategoryInfo {
  key: string;
  code: string;
  ko: string;
  en: string;
  /** Lowercased en names for display, singular and plural. */
  enPlural: string;
  koPattern: RegExp;
  enPattern: RegExp;
}

export const CATEGORIES: readonly CategoryInfo[] = [
  { key: "cafe", code: "CE7", ko: "카페", en: "cafe", enPlural: "cafes", koPattern: /카페|커피/, enPattern: /\b(cafes?|coffee( shops?)?)\b/ },
  { key: "convenience", code: "CS2", ko: "편의점", en: "convenience store", enPlural: "convenience stores", koPattern: /편의점/, enPattern: /\bconvenience stores?\b|\b7-?eleven\b/ },
  { key: "restaurant", code: "FD6", ko: "식당", en: "restaurant", enPlural: "restaurants", koPattern: /식당|맛집|음식점|밥집|밥\s*먹을/, enPattern: /\b(restaurants?|places to eat|food)\b/ },
  { key: "pharmacy", code: "PM9", ko: "약국", en: "pharmacy", enPlural: "pharmacies", koPattern: /약국/, enPattern: /\b(pharmac(y|ies)|drugstores?)\b/ },
  { key: "hospital", code: "HP8", ko: "병원", en: "hospital", enPlural: "hospitals", koPattern: /병원|의원|응급실/, enPattern: /\b(hospitals?|clinics?|er)\b/ },
  { key: "subway", code: "SW8", ko: "지하철역", en: "subway station", enPlural: "subway stations", koPattern: /지하철|전철/, enPattern: /\b(subway|metro)( stations?)?\b/ },
  { key: "bank", code: "BK9", ko: "은행", en: "bank", enPlural: "banks", koPattern: /은행|atm|현금\s*인출/, enPattern: /\b(banks?|atms?)\b/ },
  { key: "parking", code: "PK6", ko: "주차장", en: "parking lot", enPlural: "parking lots", koPattern: /주차장|주차/, enPattern: /\bparking( lots?)?\b/ },
  { key: "gas", code: "OL7", ko: "주유소", en: "gas station", enPlural: "gas stations", koPattern: /주유소|충전소/, enPattern: /\b(gas stations?|petrol|ev charg\w*)\b/ },
  { key: "attraction", code: "AT4", ko: "관광명소", en: "attraction", enPlural: "attractions", koPattern: /관광|명소|구경할/, enPattern: /\b(attractions?|sights?|tourist)\b/ },
  { key: "mart", code: "MT1", ko: "마트", en: "supermarket", enPlural: "supermarkets", koPattern: /마트|슈퍼/, enPattern: /\b(supermarkets?|grocery|groceries|marts?)\b/ },
  { key: "lodging", code: "AD5", ko: "숙소", en: "lodging", enPlural: "lodgings", koPattern: /숙소|숙박|호텔|모텔/, enPattern: /\b(hotels?|lodging|accommodations?)\b/ },
  { key: "culture", code: "CT1", ko: "문화시설", en: "cultural venue", enPlural: "cultural venues", koPattern: /문화시설|미술관|박물관|공연장/, enPattern: /\b(museums?|galler(y|ies)|theat(er|re)s?)\b/ },
];

/** Resolve a category key (`cafe`) or provider code (`CE7`) to its info. */
export function categoryInfo(keyOrCode: string | undefined): CategoryInfo | undefined {
  if (!keyOrCode) return undefined;
  const v = keyOrCode.trim();
  return CATEGORIES.find((c) => c.key === v.toLowerCase() || c.code === v.toUpperCase());
}

export function categoryCodeFor(keyOrCode: string | undefined): string | undefined {
  return categoryInfo(keyOrCode)?.code;
}

export function categoryName(keyOrCode: string | undefined, lang: Lang, plural = false): string | undefined {
  const c = categoryInfo(keyOrCode);
  if (!c) return undefined;
  return lang === "ko" ? c.ko : plural ? c.enPlural : c.en;
}

/** Find the first category mentioned in a lowercase utterance. */
export function findCategory(text: string): CategoryInfo | undefined {
  return CATEGORIES.find((c) => c.koPattern.test(text) || c.enPattern.test(text));
}
