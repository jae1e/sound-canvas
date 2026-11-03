import { cumulativeDistances, haversineM, turnPhrase, type LatLng, type RouteStep, type TurnType, type WalkRoute } from "@vlc/travel";
import type { Deps } from "../env";
import type { WalkRequest } from "../schemas";
import { fetchJson, ProviderError, type WalkProvider } from "./types";

const URL = "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1";

/**
 * TMAP turnType codes. From the SK Open API reference as remembered at implementation time;
 * not re-verified against the official table (see PROVIDERS.md). Unknown codes map to "other".
 */
export function mapTurnType(code: number | undefined): TurnType {
  switch (code) {
    case 11: case 233: return "straight";
    case 12: return "left";
    case 13: return "right";
    case 14: return "u_turn";
    case 16: return "sharp_left";
    case 17: return "slight_left";
    case 18: return "slight_right";
    case 19: return "sharp_right";
    case 125: return "overpass";
    case 126: return "underpass";
    case 127: case 129: return "stairs";
    case 200: return "start";
    case 201: return "arrive";
    case 211: case 212: case 213: case 214: case 215: case 216: case 217: return "crosswalk";
    case 218: return "elevator";
    default: return "other";
  }
}

interface Feature {
  geometry: { type: "Point"; coordinates: [number, number] } | { type: "LineString"; coordinates: Array<[number, number]> };
  properties: {
    totalDistance?: number;
    totalTime?: number;
    pointType?: string;
    turnType?: number;
    description?: string;
  };
}

const sameLatLng = (a: LatLng, b: LatLng) => a.lat === b.lat && a.lng === b.lng;

/** Normalize a TMAP pedestrian GeoJSON response (WGS84GEO coordinates, [lng, lat]). */
export function normalizeTmap(json: unknown): WalkRoute {
  const features = (json as { features?: Feature[] }).features;
  if (!Array.isArray(features) || features.length === 0) throw new ProviderError("tmap", 200, "no route");

  const polyline: LatLng[] = [];
  for (const f of features) {
    if (f.geometry?.type !== "LineString") continue;
    for (const [lng, lat] of f.geometry.coordinates) {
      const p = { lat, lng };
      const last = polyline[polyline.length - 1];
      if (!last || !sameLatLng(last, p)) polyline.push(p);
    }
  }
  if (polyline.length < 2) throw new ProviderError("tmap", 200, "no route");
  const cum = cumulativeDistances(polyline);
  const total = cum[cum.length - 1] ?? 0;

  const rawSteps: Array<{ point: LatLng; pathIndex: number; instruction: string; turn: TurnType }> = [];
  let prevIdx = 0;
  const keepable = new Set<TurnType>(["crosswalk", "overpass", "underpass", "stairs", "elevator"]);
  for (const f of features) {
    if (f.geometry?.type !== "Point") continue;
    const pt = f.properties.pointType;
    const turn: TurnType = pt === "SP" ? "start" : pt === "EP" ? "arrive" : mapTurnType(f.properties.turnType);
    if (pt === "PP" && !keepable.has(turn)) continue; // pass-through points carry no maneuver
    const [lng, lat] = f.geometry.coordinates;
    const point = { lat, lng };
    // Snap forward to the nearest polyline vertex (steps are ordered along the route).
    let best = prevIdx;
    let bestD = Infinity;
    const hi = pt === "EP" ? polyline.length - 1 : Math.min(polyline.length - 1, prevIdx + 400);
    for (let i = prevIdx; i <= hi; i++) {
      const d = haversineM(point, polyline[i]!);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (pt === "EP") best = polyline.length - 1;
    prevIdx = best;
    rawSteps.push({ point, pathIndex: best, instruction: f.properties.description ?? "", turn });
  }

  const steps: RouteStep[] = rawSteps.map((s, i) => {
    const next = rawSteps[i + 1];
    const endAlong = next ? cum[next.pathIndex]! : total;
    const step: RouteStep = {
      point: s.point,
      pathIndex: s.pathIndex,
      instruction: s.instruction,
      turn: s.turn,
      distanceToNextM: Math.max(0, Math.round(endAlong - cum[s.pathIndex]!)),
    };
    const en = turnPhrase(s.turn, "en");
    step.instructionEn = en.charAt(0).toUpperCase() + en.slice(1);
    return step;
  });

  const first = features[0]?.properties;
  const distanceM = Math.round(first?.totalDistance ?? total);
  const durationS = Math.round(first?.totalTime ?? distanceM / 1.3);
  return { provider: "tmap", polyline, distanceM, durationS, steps };
}

export class TmapWalk implements WalkProvider {
  constructor(
    private readonly appKey: string,
    private readonly deps: Deps,
  ) {}

  async route(req: WalkRequest): Promise<WalkRoute> {
    const body: Record<string, string | number> = {
      startX: req.from.lng,
      startY: req.from.lat,
      endX: req.to.lng,
      endY: req.to.lat,
      reqCoordType: "WGS84GEO",
      resCoordType: "WGS84GEO",
      startName: encodeURIComponent("start"),
      endName: encodeURIComponent("end"),
    };
    if (req.via?.length) body.passList = req.via.map((p) => `${p.lng},${p.lat}`).join("_");
    const json = await fetchJson("tmap", this.deps.fetch, URL, {
      method: "POST",
      headers: { appKey: this.appKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    return normalizeTmap(json);
  }
}
