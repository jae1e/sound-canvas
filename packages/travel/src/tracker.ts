import { cumulativeDistances, haversineM, projectOnPolyline } from "./geo";
import type { GpsFix, WalkRoute } from "./types";

export interface TrackerOptions {
  /** Fixes older than this (relative to `nowMs`) are ignored. */
  maxFixAgeMs: number;
  /** Fixes with worse horizontal accuracy are ignored. */
  maxAccuracyM: number;
  /** Base off-route distance; widened to 1.5x the fix accuracy when that is larger. */
  offRouteThresholdM: number;
  /** Consecutive good fixes beyond the threshold before off-route is declared. */
  offRouteFixes: number;
  /** Distance below which a fix counts as back on the route. */
  backOnRouteThresholdM: number;
  /** Consecutive good fixes within `backOnRouteThresholdM` to clear off-route. */
  backOnRouteFixes: number;
  arriveRadiusM: number;
  /** Walking pace used when nothing better is known, m/s. */
  fallbackPaceMps: number;
}

export const DEFAULT_TRACKER_OPTIONS: TrackerOptions = {
  maxFixAgeMs: 5000,
  maxAccuracyM: 30,
  offRouteThresholdM: 35,
  offRouteFixes: 3,
  backOnRouteThresholdM: 20,
  backOnRouteFixes: 2,
  arriveRadiusM: 20,
  fallbackPaceMps: 1.3,
};

export type TrackStatus = "on_route" | "off_route" | "arrived" | "uncertain";
export type IgnoredReason = "stale" | "poor_accuracy" | "no_fix";

export interface Progress {
  status: TrackStatus;
  /** Set when the last fix was not used. The values below then come from the last good fix. */
  ignored?: IgnoredReason;
  /** True when no good fix has been received yet. */
  noFixYet: boolean;
  alongM: number;
  /** Distance from the route at the last good fix. */
  offsetM: number;
  /** Index of the last maneuver passed (0 is the start step). */
  stepIndex: number;
  /** Index of the upcoming maneuver, or null when only the end remains. */
  nextStepIndex: number | null;
  /** Distance to the upcoming maneuver (the end when no maneuver is left). */
  distanceToNextManeuverM: number;
  remainingM: number;
  etaS: number;
  paceMps: number;
  /** Accuracy of the last good fix. */
  accuracyM: number | null;
}

export interface RouteTracker {
  update(fix: GpsFix, nowMs?: number): Progress;
  /** Progress as of the last good fix without feeding a new one. */
  current(): Progress;
  readonly route: WalkRoute;
  /** Along-route distance of each step. */
  readonly stepAlongM: readonly number[];
  readonly totalM: number;
}

export function createRouteTracker(route: WalkRoute, overrides: Partial<TrackerOptions> = {}): RouteTracker {
  const opt = { ...DEFAULT_TRACKER_OPTIONS, ...overrides };
  const cum = cumulativeDistances(route.polyline);
  const totalM = cum[cum.length - 1] ?? 0;
  const stepAlongM = route.steps.map((s) => cum[Math.min(Math.max(0, s.pathIndex), cum.length - 1)] ?? 0);
  const nominalPace =
    route.distanceM > 0 && route.durationS > 0 ? route.distanceM / route.durationS : opt.fallbackPaceMps;

  let status: TrackStatus = "on_route";
  let alongM = 0;
  let offsetM = 0;
  let accuracyM: number | null = null;
  let hasFix = false;
  let badCount = 0;
  let goodCount = 0;
  let arrived = false;
  const history: Array<{ t: number; along: number }> = [];

  const pace = (): number => {
    const newest = history[history.length - 1];
    const oldest = history[0];
    if (newest && oldest && newest.t - oldest.t >= 8000) {
      const v = ((newest.along - oldest.along) / (newest.t - oldest.t)) * 1000;
      if (v >= 0.3) return Math.min(2.2, Math.max(0.6, v));
    }
    return nominalPace;
  };

  const build = (ignored?: IgnoredReason): Progress => {
    let stepIndex = 0;
    let nextStepIndex: number | null = null;
    for (let i = 0; i < route.steps.length; i++) {
      const along = stepAlongM[i]!;
      if (along <= alongM + 1) stepIndex = i;
      else if (nextStepIndex === null && route.steps[i]!.turn !== "start") nextStepIndex = i;
    }
    const remainingM = arrived ? 0 : Math.max(0, totalM - alongM);
    const nextAlong = nextStepIndex === null ? totalM : stepAlongM[nextStepIndex]!;
    const p = pace();
    const out: Progress = {
      status: arrived ? "arrived" : ignored ? "uncertain" : status,
      noFixYet: !hasFix,
      alongM,
      offsetM,
      stepIndex,
      nextStepIndex,
      distanceToNextManeuverM: arrived ? 0 : Math.max(0, nextAlong - alongM),
      remainingM,
      etaS: remainingM / p,
      paceMps: p,
      accuracyM,
    };
    if (ignored) out.ignored = ignored;
    return out;
  };

  return {
    route,
    stepAlongM,
    totalM,
    current: () => build(),
    update(fix, nowMs = fix.timestampMs) {
      if (arrived) return build();
      if (!Number.isFinite(fix.lat) || !Number.isFinite(fix.lng)) return build("no_fix");
      if (nowMs - fix.timestampMs > opt.maxFixAgeMs) return build("stale");
      if (!(fix.accuracyM <= opt.maxAccuracyM)) return build("poor_accuracy");

      hasFix = true;
      accuracyM = fix.accuracyM;
      const p = { lat: fix.lat, lng: fix.lng };
      // Prefer a window around the last position so loops and parallel streets do not jump us along.
      const windowed = projectOnPolyline(p, route.polyline, cum, [alongM - 40, alongM + 400]);
      const global = projectOnPolyline(p, route.polyline, cum);
      const proj = windowed && windowed.distanceM <= opt.offRouteThresholdM ? windowed : global;
      if (!proj) return build("no_fix");

      const threshold = Math.max(opt.offRouteThresholdM, fix.accuracyM * 1.5);
      offsetM = proj.distanceM;

      if (status === "on_route") {
        if (proj.distanceM > threshold) {
          if (++badCount >= opt.offRouteFixes) {
            status = "off_route";
            goodCount = 0;
          }
        } else {
          badCount = 0;
        }
      } else if (status === "off_route") {
        if (proj.distanceM <= opt.backOnRouteThresholdM) {
          if (++goodCount >= opt.backOnRouteFixes) {
            status = "on_route";
            badCount = 0;
          }
        } else {
          goodCount = 0;
        }
      }

      // Only advance along-route progress while we are (or are about to be) on the route.
      if (status === "on_route" && proj.distanceM <= threshold) {
        alongM = proj.alongM;
        history.push({ t: fix.timestampMs, along: alongM });
        while (history.length > 1 && fix.timestampMs - history[0]!.t > 30000) history.shift();
      }

      const end = route.polyline[route.polyline.length - 1];
      const nearEnd = end ? haversineM(p, end) <= opt.arriveRadiusM : false;
      if (status === "on_route" && (totalM - alongM <= opt.arriveRadiusM || nearEnd) && proj.distanceM <= threshold) {
        arrived = true;
        alongM = totalM;
      }
      return build();
    },
  };
}
