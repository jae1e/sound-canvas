import { categoryCodeFor, haversineM, type Place, type WhereAmI } from "@vlc/travel";
import type { Deps } from "../env";
import type { SearchRequest, WhereRequest } from "../schemas";
import { fetchJson, ProviderError, type PlacesProvider } from "./types";

const BASE = "https://dapi.kakao.com/v2/local";
/** Used for "what's around" with no query and no category. */
const DEFAULT_CATEGORIES = ["CE7", "FD6", "CS2", "AT4", "SW8"];

export interface KakaoDoc {
  id: string;
  place_name: string;
  category_name?: string;
  category_group_code?: string;
  category_group_name?: string;
  phone?: string;
  address_name?: string;
  road_address_name?: string;
  x: string;
  y: string;
  place_url?: string;
  distance?: string;
}

export class KakaoPlaces implements PlacesProvider {
  constructor(
    private readonly key: string,
    private readonly deps: Deps,
  ) {}

  private get(path: string, params: Record<string, string | number | undefined>): Promise<unknown> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v));
    return fetchJson("kakao", this.deps.fetch, `${BASE}/${path}?${qs}`, {
      headers: { Authorization: `KakaoAK ${this.key}` },
    });
  }

  async search(req: SearchRequest): Promise<Place[]> {
    const base = { x: req.lng, y: req.lat, radius: req.radiusM, sort: "distance", size: req.limit };
    const code = categoryCodeFor(req.category);
    let docs: KakaoDoc[];
    if (req.query) {
      docs = await this.docs("search/keyword.json", { ...base, query: req.query, category_group_code: code });
    } else if (code) {
      docs = await this.docs("search/category.json", { ...base, category_group_code: code });
    } else {
      const lists = await Promise.all(
        DEFAULT_CATEGORIES.map((c) => this.docs("search/category.json", { ...base, category_group_code: c })),
      );
      docs = lists.flat();
    }
    const here = { lat: req.lat, lng: req.lng };
    const seen = new Set<string>();
    return docs
      .map((d) => normalizePlace(d, here))
      .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, req.limit);
  }

  async docs(path: string, params: Record<string, string | number | undefined>): Promise<KakaoDoc[]> {
    const json = (await this.get(path, params)) as { documents?: KakaoDoc[] };
    return Array.isArray(json.documents) ? json.documents : [];
  }

  async where(req: WhereRequest): Promise<WhereAmI> {
    const p = { x: req.lng, y: req.lat };
    const [addr, region] = await Promise.allSettled([
      this.get("geo/coord2address.json", p),
      this.get("geo/coord2regioncode.json", p),
    ]);
    if (addr.status === "rejected" && region.status === "rejected") {
      throw addr.reason instanceof ProviderError ? addr.reason : new ProviderError("kakao", 0);
    }
    const a = addr.status === "fulfilled" ? (addr.value as { documents?: Array<{ address?: { address_name?: string }; road_address?: { address_name?: string } }> }).documents?.[0] : undefined;
    const regions = region.status === "fulfilled" ? ((region.value as { documents?: Array<{ region_type: string; region_1depth_name?: string; region_2depth_name?: string; region_3depth_name?: string; address_name?: string }> }).documents ?? []) : [];
    const h = regions.find((r) => r.region_type === "H") ?? regions[0];
    const area = h ? [h.region_1depth_name, h.region_2depth_name, h.region_3depth_name].filter(Boolean).join(" ") || (h.address_name ?? "") : "";
    const out: WhereAmI = { area: area || a?.address?.address_name || "", source: "kakao" };
    if (a?.road_address?.address_name) out.roadAddress = a.road_address.address_name;
    if (a?.address?.address_name) out.address = a.address.address_name;
    return out;
  }
}

export function normalizePlace(d: KakaoDoc, here: { lat: number; lng: number }): Place {
  const lat = Number(d.y);
  const lng = Number(d.x);
  const dist = d.distance !== undefined && d.distance !== "" ? Number(d.distance) : NaN;
  const catName = d.category_group_name || d.category_name?.split(">").pop()?.trim() || "";
  const place: Place = {
    id: `kakao:${d.id}`,
    name: d.place_name,
    category: catName,
    distanceM: Number.isFinite(dist) ? dist : Math.round(haversineM(here, { lat, lng })),
    lat,
    lng,
    address: d.road_address_name || d.address_name || "",
    source: "kakao",
  };
  if (d.category_group_code) place.categoryCode = d.category_group_code;
  if (d.phone) place.phone = d.phone;
  if (d.place_url) place.url = d.place_url;
  return place;
}
