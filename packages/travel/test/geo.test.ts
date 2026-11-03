import { describe, expect, it } from "vitest";
import {
  bearingDeg,
  cumulativeDistances,
  destinationPoint,
  haversineM,
  pointAlong,
  pointToPolylineDistanceM,
  projectOnPolyline,
} from "../src/geo";
import { ORIGIN, makeRoute } from "./helpers";

describe("geo", () => {
  it("haversine matches known distances", () => {
    // One degree of latitude is about 111.2 km.
    expect(haversineM({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111195, -2);
    expect(haversineM(ORIGIN, ORIGIN)).toBe(0);
    // Seoul City Hall to Gangnam Station is roughly 9 km.
    const d = haversineM({ lat: 37.5663, lng: 126.9779 }, { lat: 37.4979, lng: 127.0276 });
    expect(d).toBeGreaterThan(8500);
    expect(d).toBeLessThan(9500);
  });

  it("bearing covers the cardinal directions", () => {
    expect(bearingDeg(ORIGIN, { lat: 37.51, lng: 127.0 })).toBeCloseTo(0, 3);
    expect(bearingDeg(ORIGIN, { lat: 37.5, lng: 127.01 })).toBeCloseTo(90, 0);
    expect(bearingDeg(ORIGIN, { lat: 37.49, lng: 127.0 })).toBeCloseTo(180, 3);
    expect(bearingDeg(ORIGIN, { lat: 37.5, lng: 126.99 })).toBeCloseTo(270, 0);
  });

  it("destinationPoint round-trips with haversine and bearing", () => {
    const p = destinationPoint(ORIGIN, 45, 500);
    expect(haversineM(ORIGIN, p)).toBeCloseTo(500, 1);
    expect(bearingDeg(ORIGIN, p)).toBeCloseTo(45, 1);
  });

  it("point to polyline distance", () => {
    const route = makeRoute();
    const side = destinationPoint(route.polyline[10]!, 270, 25); // 25 m west of the north leg
    expect(pointToPolylineDistanceM(side, route.polyline)).toBeCloseTo(25, 0);
    expect(pointToPolylineDistanceM(route.polyline[30]!, route.polyline)).toBeLessThan(0.01);
  });

  it("projection reports along distance and respects the range", () => {
    const route = makeRoute();
    const cum = cumulativeDistances(route.polyline);
    expect(cum[cum.length - 1]).toBeCloseTo(450, 0);
    const pr = projectOnPolyline(destinationPoint(route.polyline[10]!, 270, 5), route.polyline, cum)!;
    expect(pr.alongM).toBeCloseTo(100, 0);
    const ranged = projectOnPolyline(route.polyline[10]!, route.polyline, cum, [300, 400])!;
    expect(ranged.alongM).toBeGreaterThanOrEqual(290);
    expect(projectOnPolyline(ORIGIN, [])).toBeNull();
  });

  it("pointAlong interpolates and clamps", () => {
    const route = makeRoute();
    const cum = cumulativeDistances(route.polyline);
    const mid = pointAlong(route.polyline, cum, 105);
    expect(haversineM(mid, route.polyline[10]!)).toBeCloseTo(5, 0);
    expect(pointAlong(route.polyline, cum, -5)).toEqual(route.polyline[0]);
    expect(pointAlong(route.polyline, cum, 99999)).toEqual(route.polyline[45]);
  });
});
