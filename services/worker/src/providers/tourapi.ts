import { stripHtml, type Lang, type LandmarkFact, type LandmarkFactKey } from "@vlc/travel";
import type { Deps } from "../env";
import { fetchJson, ProviderError } from "./types";

const HOST = "https://apis.data.go.kr/B551011";
const SERVICE: Record<Lang, string> = { ko: "KorService2", en: "EngService2" };

/** contentTypeId: 12 tourist attraction, 14 cultural facility (TourAPI 4.0 code table). */
export const CONTENT_TYPES = { attraction: 12, culture: 14 } as const;

export interface TourItem {
  contentid?: string;
  contenttypeid?: string;
  title?: string;
  addr1?: string;
  dist?: string;
  mapx?: string;
  mapy?: string;
  overview?: string;
  cat1?: string;
  cat2?: string;
  cat3?: string;
  [k: string]: unknown;
}

/** Fields of `detailIntro2` that map to spoken facts, per fact key. Names recalled from the TourAPI 4.0 manual; unverified without a key. */
const INTRO_FIELDS: Array<[LandmarkFactKey, string[]]> = [
  ["hours", ["usetime", "usetimeculture"]],
  ["closed", ["restdate", "restdateculture"]],
  ["fee", ["usefee"]],
  ["duration", ["spendtime"]],
  ["contact", ["infocenter", "infocenterculture"]],
];

export class TourApi {
  private readonly key: string;
  constructor(
    key: string,
    private readonly deps: Deps,
  ) {
    // data.go.kr shows an "Encoding" and a "Decoding" key. URLSearchParams encodes once, so use the decoded form.
    this.key = key.includes("%") ? safeDecode(key) : key;
  }

  private async call(lang: Lang, op: string, params: Record<string, string | number>): Promise<TourItem[]> {
    const qs = new URLSearchParams({ serviceKey: this.key, MobileOS: "ETC", MobileApp: "VoiceLifeCompanion", _type: "json" });
    for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
    const json = (await fetchJson("tourapi", this.deps.fetch, `${HOST}/${SERVICE[lang]}/${op}?${qs}`, { headers: { Accept: "application/json" } })) as {
      response?: { header?: { resultCode?: string }; body?: { items?: unknown } };
    };
    const code = json.response?.header?.resultCode;
    if (code === undefined) throw new ProviderError("tourapi", 0, "unexpected response");
    if (code !== "0000" && code !== "00") {
      if (code === "03") return []; // NODATA_ERROR
      throw new ProviderError("tourapi", Number(code) || 0, "tourapi result code");
    }
    const items = json.response?.body?.items;
    if (!items || typeof items !== "object") return []; // an empty result has items: ""
    const item = (items as { item?: unknown }).item;
    return Array.isArray(item) ? (item as TourItem[]) : item ? [item as TourItem] : [];
  }

  /** Attractions (12) and cultural facilities (14) around a point, nearest first. */
  async nearby(p: { lat: number; lng: number; radiusM: number; lang: Lang; rows: number }): Promise<TourItem[]> {
    const common = { mapX: p.lng, mapY: p.lat, radius: p.radiusM, arrange: "E", numOfRows: p.rows, pageNo: 1 };
    const lists = await Promise.all(Object.values(CONTENT_TYPES).map((t) => this.call(p.lang, "locationBasedList2", { ...common, contentTypeId: t })));
    return lists.flat();
  }

  /** `detailCommon2` for one content id. */
  async common(lang: Lang, contentId: string): Promise<TourItem | undefined> {
    return (await this.call(lang, "detailCommon2", { contentId, numOfRows: 1, pageNo: 1 }))[0];
  }

  /** `detailIntro2`, mapped to facts. Failures are the caller's to ignore. */
  async facts(lang: Lang, contentId: string, contentTypeId: string): Promise<LandmarkFact[]> {
    const item = (await this.call(lang, "detailIntro2", { contentId, contentTypeId, numOfRows: 1, pageNo: 1 }))[0];
    if (!item) return [];
    const out: LandmarkFact[] = [];
    for (const [key, fields] of INTRO_FIELDS) {
      for (const f of fields) {
        const v = typeof item[f] === "string" ? stripHtml(item[f] as string).replace(/\s+/g, " ").trim() : "";
        if (v && v !== "0") {
          out.push({ key, value: v });
          break;
        }
      }
    }
    if (item.heritage1 === "1") out.push({ key: "heritage", value: lang === "ko" ? "세계문화유산" : "UNESCO World Cultural Heritage" });
    else if (item.heritage2 === "1") out.push({ key: "heritage", value: lang === "ko" ? "세계자연유산" : "UNESCO World Natural Heritage" });
    else if (item.heritage3 === "1") out.push({ key: "heritage", value: lang === "ko" ? "세계기록유산" : "UNESCO Memory of the World" });
    return out;
  }
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
