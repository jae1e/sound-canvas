import { destinationPoint, haversineM } from "../src/geo";
import type { LatLng, Place, RouteStep, WalkRoute } from "../src/types";

export const ORIGIN: LatLng = { lat: 37.5, lng: 127.0 };

/** Seeded PRNG so noise is reproducible. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
export function gauss(r: () => number): number {
  return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
}

/** North 200 m, east 150 m, north 100 m, vertices every 10 m. Total 450 m. */
export function makeRoute(): WalkRoute {
  const pts: LatLng[] = [ORIGIN];
  const leg = (bearing: number, m: number) => {
    for (let i = 0; i < m / 10; i++) pts.push(destinationPoint(pts[pts.length - 1]!, bearing, 10));
  };
  leg(0, 200);
  leg(90, 150);
  leg(0, 100);
  const steps: RouteStep[] = [
    { point: pts[0]!, pathIndex: 0, instruction: "출발", turn: "start", distanceToNextM: 200 },
    { point: pts[20]!, pathIndex: 20, instruction: "우회전 후 150m 직진", turn: "right", distanceToNextM: 150 },
    { point: pts[35]!, pathIndex: 35, instruction: "좌회전 후 100m 직진", turn: "left", distanceToNextM: 100 },
    { point: pts[45]!, pathIndex: 45, instruction: "도착", turn: "arrive", distanceToNextM: 0 },
  ];
  return { provider: "mock", polyline: pts, distanceM: 450, durationS: 450 / 1.3, steps };
}

export function mkPlace(id: string, name: string, distanceM: number, code = "CE7"): Place {
  return {
    id,
    name,
    category: "카페",
    categoryCode: code,
    distanceM,
    lat: 37.5,
    lng: 127.0,
    address: "서울",
    source: "kakao",
  };
}

export { haversineM };
