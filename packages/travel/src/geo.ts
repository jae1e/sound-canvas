import type { LatLng } from "./types";

const R = 6371008.8; // mean Earth radius, meters
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Initial bearing from a to b in degrees [0, 360). */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const p1 = toRad(a.lat);
  const p2 = toRad(b.lat);
  const dl = toRad(b.lng - a.lng);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Point at a distance and bearing from a start point. */
export function destinationPoint(a: LatLng, bearing: number, distM: number): LatLng {
  const d = distM / R;
  const br = toRad(bearing);
  const p1 = toRad(a.lat);
  const l1 = toRad(a.lng);
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(br));
  const l2 =
    l1 +
    Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return { lat: toDeg(p2), lng: ((toDeg(l2) + 540) % 360) - 180 };
}

export interface SegmentProjection {
  /** Distance from the point to the segment, meters. */
  distanceM: number;
  /** Fraction along the segment in [0, 1]. */
  t: number;
}

/** Distance from p to segment ab using a local equirectangular projection (fine below a few km). */
export function pointToSegment(p: LatLng, a: LatLng, b: LatLng): SegmentProjection {
  const k = Math.cos(toRad(a.lat));
  const x = (q: LatLng) => toRad(q.lng - a.lng) * k * R;
  const y = (q: LatLng) => toRad(q.lat - a.lat) * R;
  const px = x(p), py = y(p), bx = x(b), by = y(b);
  const len2 = bx * bx + by * by;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / len2));
  return { distanceM: Math.hypot(px - t * bx, py - t * by), t };
}

/** Cumulative distance along a polyline; result[i] is the distance from vertex 0 to vertex i. */
export function cumulativeDistances(line: LatLng[]): number[] {
  const out: number[] = [0];
  for (let i = 1; i < line.length; i++) {
    out.push((out[i - 1] ?? 0) + haversineM(line[i - 1]!, line[i]!));
  }
  return out;
}

export interface PolylineProjection {
  /** Perpendicular distance from the point to the polyline, meters. */
  distanceM: number;
  /** Distance along the polyline from its start to the projected point, meters. */
  alongM: number;
  segmentIndex: number;
}

/**
 * Project a point onto a polyline. `cum` may be passed to avoid recomputation.
 * `alongRange` restricts candidate segments to those overlapping [min, max] along-distance.
 */
export function projectOnPolyline(
  p: LatLng,
  line: LatLng[],
  cum: number[] = cumulativeDistances(line),
  alongRange?: [number, number],
): PolylineProjection | null {
  if (line.length === 0) return null;
  if (line.length === 1) return { distanceM: haversineM(p, line[0]!), alongM: 0, segmentIndex: 0 };
  let best: PolylineProjection | null = null;
  for (let i = 0; i < line.length - 1; i++) {
    const start = cum[i]!;
    const end = cum[i + 1]!;
    if (alongRange && (end < alongRange[0] || start > alongRange[1])) continue;
    const r = pointToSegment(p, line[i]!, line[i + 1]!);
    if (!best || r.distanceM < best.distanceM) {
      best = { distanceM: r.distanceM, alongM: start + r.t * (end - start), segmentIndex: i };
    }
  }
  return best;
}

export function pointToPolylineDistanceM(p: LatLng, line: LatLng[]): number {
  return projectOnPolyline(p, line)?.distanceM ?? Infinity;
}

/** Interpolated point at a distance along the polyline. */
export function pointAlong(line: LatLng[], cum: number[], alongM: number): LatLng {
  if (line.length === 0) throw new Error("empty polyline");
  const total = cum[cum.length - 1] ?? 0;
  const d = Math.max(0, Math.min(total, alongM));
  for (let i = 0; i < line.length - 1; i++) {
    if (d <= cum[i + 1]!) {
      const span = cum[i + 1]! - cum[i]!;
      const t = span === 0 ? 0 : (d - cum[i]!) / span;
      return {
        lat: line[i]!.lat + (line[i + 1]!.lat - line[i]!.lat) * t,
        lng: line[i]!.lng + (line[i + 1]!.lng - line[i]!.lng) * t,
      };
    }
  }
  return line[line.length - 1]!;
}
