import { haversineM, oneLineFrom, stripHtml, type Lang, type Landmark, type LandmarkDetail, type LandmarkSource } from "@vlc/travel";
import type { Deps } from "../env";
import type { LandmarkDetailRequest, LandmarksNearbyRequest } from "../schemas";
import { KakaoPlaces, type KakaoDoc } from "./kakao";
import { TourApi, type TourItem } from "./tourapi";
import { ProviderError } from "./types";
import { wikipediaSummary } from "./wikipedia";

export interface LandmarksProvider {
  nearby(req: LandmarksNearbyRequest): Promise<Landmark[]>;
  detail(req: LandmarkDetailRequest): Promise<LandmarkDetail>;
}

const ATTRIBUTION: Record<LandmarkSource, Record<Lang, string>> = {
  tourapi: { ko: "출처: 한국관광공사 TourAPI (공공데이터포털)", en: "Source: Korea Tourism Organization TourAPI (data.go.kr)" },
  kakao: { ko: "출처: 카카오 로컬", en: "Source: Kakao Local" },
  wikipedia: { ko: "출처: 위키백과 (CC BY-SA 4.0)", en: "Source: Wikipedia (CC BY-SA 4.0)" },
  fixture: { ko: "샘플 데이터", en: "Sample data" },
};
export const attributionFor = (s: LandmarkSource, lang: Lang): string => ATTRIBUTION[s][lang];

// ---------- cache ----------
// Only text whose terms allow reuse is cached: TourAPI (data.go.kr "no restrictions") and Wikipedia (CC BY-SA).
// Kakao results and anything keyed by coordinates are never cached. The cache is per Worker isolate, short-lived and bounded.
const TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 200;
const cache = new Map<string, { at: number; value: LandmarkDetail }>();
export const clearLandmarkCache = (): void => cache.clear();
function cacheGet(key: string, now: number): LandmarkDetail | undefined {
  const e = cache.get(key);
  if (!e) return undefined;
  if (now - e.at > TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return e.value;
}
function cacheSet(key: string, value: LandmarkDetail, now: number): void {
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: now, value });
}

// ---------- historic ranking ----------
const HISTORIC_KO = /궁|사찰|성곽|읍성|산성|향교|서원|유적|고택|한옥|고분|왕릉|릉$|묘$|종묘|사직|사당|궐|문화재|역사|옛|봉수|탑$|사$|사\s|문$|각$|정$|비$/;
const HISTORIC_EN = /palace|temple|fortress|fort\b|gate|tomb|shrine|heritage|histor|hanok|pavilion|belfry|bell\b|ancient|castle|pagoda|confucian|seowon|hyanggyo|jongmyo|-?(gung|sa|mun|gak)\b/i;
const HISTORIC_KAKAO = /문화유적|고궁|사찰|유적|역사|성곽|유물/;

export function isHistoric(name: string, ...extra: Array<string | undefined>): boolean {
  if (HISTORIC_KO.test(name) || HISTORIC_EN.test(name)) return true;
  return extra.some((e) => !!e && (HISTORIC_KAKAO.test(e) || e === "A0201" || e.startsWith("A02010")));
}

interface Candidate {
  landmark: Landmark;
  historic: boolean;
  tour?: { contentId: string; typeId: string };
}

const squash = (s: string) => s.toLowerCase().replace(/[\s\-·()]+/g, "");

function fromTour(it: TourItem, lang: Lang, here: { lat: number; lng: number }): Candidate | null {
  const id = it.contentid;
  const typeId = it.contenttypeid;
  const lat = Number(it.mapy);
  const lng = Number(it.mapx);
  if (!id || !typeId || !it.title || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const dist = it.dist !== undefined && it.dist !== "" ? Number(it.dist) : NaN;
  const category = typeId === "14" ? (lang === "ko" ? "문화시설" : "Cultural facility") : lang === "ko" ? "관광지" : "Tourist attraction";
  return {
    landmark: {
      id: `tourapi:${id}:${typeId}`,
      name: it.title.trim(),
      category,
      distanceM: Math.round(Number.isFinite(dist) ? dist : haversineM(here, { lat, lng })),
      lat,
      lng,
      oneLine: "",
      source: "tourapi",
      attribution: attributionFor("tourapi", lang),
    },
    historic: isHistoric(it.title, it.cat2, it.cat3),
    tour: { contentId: id, typeId },
  };
}

function fromKakao(d: KakaoDoc, lang: Lang, here: { lat: number; lng: number }): Candidate {
  const lat = Number(d.y);
  const lng = Number(d.x);
  const dist = d.distance !== undefined && d.distance !== "" ? Number(d.distance) : NaN;
  const leaf = d.category_name?.split(">").pop()?.trim() ?? "";
  return {
    landmark: {
      id: `kakao:${d.id}`,
      name: d.place_name,
      category: leaf || d.category_group_name || "",
      distanceM: Math.round(Number.isFinite(dist) ? dist : haversineM(here, { lat, lng })),
      lat,
      lng,
      oneLine: leaf && leaf !== "관광명소" ? leaf : "",
      source: "kakao",
      attribution: attributionFor("kakao", lang),
    },
    historic: isHistoric(d.place_name, d.category_name),
  };
}

export class LandmarkService implements LandmarksProvider {
  private readonly tour?: TourApi;
  private readonly kakao?: KakaoPlaces;
  constructor(
    keys: { tour?: string; kakao?: string },
    private readonly deps: Deps,
  ) {
    if (keys.tour) this.tour = new TourApi(keys.tour, deps);
    if (keys.kakao) this.kakao = new KakaoPlaces(keys.kakao, deps);
  }

  get configured(): boolean {
    return !!(this.tour || this.kakao);
  }

  async nearby(req: LandmarksNearbyRequest): Promise<Landmark[]> {
    const here = { lat: req.lat, lng: req.lng };
    const [tourRes, kakaoRes] = await Promise.allSettled([
      this.tour ? this.tour.nearby({ ...req, rows: 30 }) : Promise.resolve([] as TourItem[]),
      this.kakao
        ? this.kakao.docs("search/category.json", { x: req.lng, y: req.lat, radius: req.radiusM, sort: "distance", size: 15, category_group_code: "AT4" })
        : Promise.resolve([] as KakaoDoc[]),
    ]);
    // Both providers failing is an error; one failing degrades to the other.
    if (tourRes.status === "rejected" && kakaoRes.status === "rejected") {
      throw tourRes.reason instanceof ProviderError ? tourRes.reason : new ProviderError("tourapi", 0);
    }
    const cands: Candidate[] = [];
    if (tourRes.status === "fulfilled") {
      for (const it of tourRes.value) {
        const c = fromTour(it, req.lang, here);
        if (c) cands.push(c);
      }
    }
    const tourCands = cands.slice();
    if (kakaoRes.status === "fulfilled") {
      for (const d of kakaoRes.value) {
        const c = fromKakao(d, req.lang, here);
        const dup = tourCands.some((t) => {
          const a = squash(t.landmark.name);
          const b = squash(c.landmark.name);
          return (a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a))) || haversineM(t.landmark, c.landmark) < 60;
        });
        if (!dup) cands.push(c);
      }
    }
    const seen = new Set<string>();
    const unique = cands.filter((c) => (seen.has(c.landmark.id) ? false : (seen.add(c.landmark.id), true)));
    let pool = unique;
    if (req.theme === "historic") {
      const hist = unique.filter((c) => c.historic);
      if (hist.length > 0) pool = hist;
    }
    const top = pool.sort((a, b) => a.landmark.distanceM - b.landmark.distanceM).slice(0, req.limit);
    // One short line per landmark from the cached overview (best effort).
    await Promise.all(
      top.map(async (c) => {
        if (!c.tour) return;
        try {
          const d = await this.tourDetail(c.tour.contentId, c.tour.typeId, req.lang, c.landmark.name, false);
          c.landmark.oneLine = oneLineFrom(d.overview, req.lang);
          if (d.source === "wikipedia") c.landmark.attribution = `${attributionFor("tourapi", req.lang)}; ${attributionFor("wikipedia", req.lang)}`;
        } catch {
          // Leave the line empty; the list still works.
        }
      }),
    );
    return top.map((c) => c.landmark);
  }

  async detail(req: LandmarkDetailRequest): Promise<LandmarkDetail> {
    const now = this.deps.now();
    const hit = cacheGet(`${req.lang}:${req.id}`, now);
    if (hit) return hit;
    if (req.id.startsWith("tourapi:")) {
      if (!this.tour) throw new ProviderError("tourapi", 0, "not configured");
      const [, contentId, typeId] = req.id.split(":") as [string, string, string];
      return this.tourDetail(contentId, typeId, req.lang, req.name, true, req.id);
    }
    // Kakao places carry no text; Wikipedia by name is the only description source.
    const wiki = req.name ? await wikipediaSummary(this.deps, req.lang, req.name) : null;
    const out: LandmarkDetail = wiki
      ? { id: req.id, lang: req.lang, overview: wiki.extract, facts: [], source: "wikipedia", attribution: attributionFor("wikipedia", req.lang), ...(wiki.pageUrl ? { sourceUrl: wiki.pageUrl } : {}) }
      : { id: req.id, lang: req.lang, overview: "", facts: [], source: "kakao", attribution: attributionFor("kakao", req.lang) };
    if (wiki) cacheSet(`${req.lang}:${req.id}`, out, now);
    return out;
  }

  /** TourAPI overview (and optionally intro facts), with Wikipedia only when TourAPI has no overview. */
  private async tourDetail(contentId: string, typeId: string, lang: Lang, name: string | undefined, withFacts: boolean, fullId?: string): Promise<LandmarkDetail> {
    const id = fullId ?? `tourapi:${contentId}:${typeId}`;
    const key = `${lang}:${id}`;
    const now = this.deps.now();
    const cached = cacheGet(key, now);
    // The one-line path accepts a cached entry with or without facts; the detail path only a complete one.
    if (cached && (!withFacts || cached.facts.length > 0 || cached.source === "wikipedia")) return cached;
    const tour = this.tour!;
    const [common, facts] = await Promise.all([
      tour.common(lang, contentId),
      withFacts ? tour.facts(lang, contentId, typeId).catch(() => []) : Promise.resolve([]),
    ]);
    const overview = stripHtml(typeof common?.overview === "string" ? common.overview : "");
    let out: LandmarkDetail;
    if (overview.length >= 20) {
      out = { id, lang, overview, facts, source: "tourapi", attribution: attributionFor("tourapi", lang) };
    } else {
      const title = common?.title ?? name;
      const wiki = title ? await wikipediaSummary(this.deps, lang, title) : null;
      out = wiki
        ? {
            id,
            lang,
            overview: wiki.extract,
            facts,
            source: "wikipedia",
            attribution: facts.length ? `${attributionFor("wikipedia", lang)}; ${attributionFor("tourapi", lang)}` : attributionFor("wikipedia", lang),
            ...(wiki.pageUrl ? { sourceUrl: wiki.pageUrl } : {}),
          }
        : { id, lang, overview: "", facts, source: "tourapi", attribution: attributionFor("tourapi", lang) };
    }
    if (out.overview) cacheSet(key, out, now);
    return out;
  }
}
