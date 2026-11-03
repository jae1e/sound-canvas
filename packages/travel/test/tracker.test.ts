import { describe, expect, it } from "vitest";
import { initialCueState, planCues, approachDistanceM, nowDistanceM, type Cue, type CueState } from "../src/cues";
import { cumulativeDistances, destinationPoint, pointAlong } from "../src/geo";
import { createRouteTracker, type Progress } from "../src/tracker";
import type { GpsFix, LatLng } from "../src/types";
import { gauss, makeRoute, rng } from "./helpers";

const T0 = 1_700_000_000_000;

function fixAt(p: LatLng, t: number, accuracyM = 8): GpsFix {
  return { lat: p.lat, lng: p.lng, accuracyM, timestampMs: T0 + t * 1000 };
}

describe("route tracker basics", () => {
  const route = makeRoute();

  it("starts at zero progress with the route totals", () => {
    const tr = createRouteTracker(route);
    const c = tr.current();
    expect(c.noFixYet).toBe(true);
    expect(c.remainingM).toBeCloseTo(450, 0);
    expect(c.nextStepIndex).toBe(1);
  });

  it("reports step, distance to next maneuver, remaining and ETA", () => {
    const tr = createRouteTracker(route);
    const cum = cumulativeDistances(route.polyline);
    const p = tr.update(fixAt(pointAlong(route.polyline, cum, 150), 0));
    expect(p.status).toBe("on_route");
    expect(p.stepIndex).toBe(0);
    expect(p.nextStepIndex).toBe(1);
    expect(p.distanceToNextManeuverM).toBeCloseTo(50, 0);
    expect(p.remainingM).toBeCloseTo(300, 0);
    expect(p.etaS).toBeCloseTo(300 / (450 / (450 / 1.3)), 0);
    const q = tr.update(fixAt(pointAlong(route.polyline, cum, 250), 60));
    expect(q.stepIndex).toBe(1);
    expect(q.nextStepIndex).toBe(2);
  });

  it("ignores stale and inaccurate fixes and reports uncertainty", () => {
    const tr = createRouteTracker(route);
    const cum = cumulativeDistances(route.polyline);
    const good = tr.update(fixAt(pointAlong(route.polyline, cum, 100), 0));
    const stale = tr.update(fixAt(pointAlong(route.polyline, cum, 300), 0), T0 + 9000);
    expect(stale.status).toBe("uncertain");
    expect(stale.ignored).toBe("stale");
    expect(stale.alongM).toBe(good.alongM);
    const poor = tr.update(fixAt(pointAlong(route.polyline, cum, 300), 10, 80));
    expect(poor.ignored).toBe("poor_accuracy");
    expect(poor.alongM).toBe(good.alongM);
    expect(tr.update({ lat: NaN, lng: 0, accuracyM: 5, timestampMs: T0 }).ignored).toBe("no_fix");
  });

  it("off-route needs consecutive good fixes (hysteresis) and clears when back", () => {
    const tr = createRouteTracker(route);
    const cum = cumulativeDistances(route.polyline);
    const on = pointAlong(route.polyline, cum, 100);
    const off = destinationPoint(on, 270, 60);
    let t = 0;
    tr.update(fixAt(on, t++));
    expect(tr.update(fixAt(off, t++)).status).toBe("on_route"); // one bad fix is tolerated
    expect(tr.update(fixAt(on, t++)).status).toBe("on_route"); // resets the counter
    tr.update(fixAt(off, t++));
    tr.update(fixAt(off, t++));
    expect(tr.update(fixAt(off, t++)).status).toBe("off_route");
    // 30 m away is still not back (needs < 20 m).
    const near = destinationPoint(on, 270, 30);
    expect(tr.update(fixAt(near, t++)).status).toBe("off_route");
    expect(tr.update(fixAt(on, t++)).status).toBe("off_route"); // 1 of 2
    expect(tr.update(fixAt(on, t++)).status).toBe("on_route");
  });

  it("poor fixes do not count toward off-route", () => {
    const tr = createRouteTracker(route);
    const cum = cumulativeDistances(route.polyline);
    const off = destinationPoint(pointAlong(route.polyline, cum, 100), 270, 90);
    tr.update(fixAt(pointAlong(route.polyline, cum, 100), 0));
    for (let i = 1; i < 8; i++) tr.update(fixAt(off, i, 100));
    expect(tr.current().status).toBe("on_route");
  });

  it("arrives near the end and stays arrived", () => {
    const tr = createRouteTracker(route);
    const end = route.polyline[route.polyline.length - 1]!;
    tr.update(fixAt(destinationPoint(end, 180, 100), 0));
    const p = tr.update(fixAt(destinationPoint(end, 180, 10), 5));
    expect(p.status).toBe("arrived");
    expect(p.remainingM).toBe(0);
    expect(tr.update(fixAt(destinationPoint(end, 180, 300), 10)).status).toBe("arrived");
  });
});

describe("cue planner", () => {
  const route = makeRoute();
  it("scales approach distance with pace", () => {
    expect(approachDistanceM(0.8)).toBe(40);
    expect(approachDistanceM(1.3)).toBe(50);
    expect(approachDistanceM(2.2)).toBe(80);
    expect(nowDistanceM(1.3)).toBe(8);
  });

  it("does not speak when fixes are missing; speaks GPS weakness only after a sustained stretch", () => {
    const tr = createRouteTracker(route);
    let st = initialCueState();
    const weak = tr.update(fixAt(route.polyline[0]!, 0, 99));
    let r = planCues(weak, tr, st, T0, {});
    expect(r.cues).toHaveLength(0);
    st = r.state;
    r = planCues(weak, tr, st, T0 + 11000);
    expect(r.cues.map((c) => c.kind)).toEqual(["gps_uncertain"]);
    r = planCues(weak, tr, r.state, T0 + 20000);
    expect(r.cues).toHaveLength(0); // bounded: repeats at most every 60 s
  });
});

describe("replay: noisy walk with an off-route excursion", () => {
  const route = makeRoute();
  const cum = cumulativeDistances(route.polyline);
  const total = cum[cum.length - 1]!;
  const rand = rng(42);
  const speed = 1.3;

  it("tracks progress, cues each maneuver once, detects the excursion, and arrives", () => {
    const tr = createRouteTracker(route);
    let cueState: CueState = initialCueState();
    const all: Array<{ t: number; cue: Cue }> = [];
    const statuses: Array<{ t: number; p: Progress }> = [];
    let maxAlongErr = 0;
    let t = 0;

    for (; t < 600; t++) {
      const along = Math.min(total, speed * t);
      const onRoute = pointAlong(route.polyline, cum, along);
      // Excursion between t=60 and t=100: walk up to 80 m west of the route and come back.
      let offset = 0;
      if (t >= 60 && t <= 100) offset = 80 * Math.sin(((t - 60) / 40) * Math.PI);
      const truth = offset > 0 ? destinationPoint(onRoute, 270, offset) : onRoute;
      const sd = 4;
      const noisy = destinationPoint(destinationPoint(truth, 0, gauss(rand) * sd), 90, gauss(rand) * sd);
      let fix = fixAt(noisy, t, 6 + rand() * 6);
      // Sprinkle degraded fixes.
      if (t % 17 === 5) fix = { ...fix, accuracyM: 70 };
      let now = fix.timestampMs;
      if (t % 23 === 7) now += 8000; // stale
      const p = tr.update(fix, now);
      statuses.push({ t, p });
      if (!p.ignored && offset === 0 && p.status === "on_route") maxAlongErr = Math.max(maxAlongErr, Math.abs(p.alongM - along));
      const r = planCues(p, tr, cueState, now);
      cueState = r.state;
      for (const cue of r.cues) all.push({ t, cue });
      if (p.status === "arrived") break;
    }

    // Arrived near the true end time (450 / 1.3 = 346 s).
    expect(t).toBeGreaterThan(315);
    expect(t).toBeLessThan(375);
    expect(tr.current().status).toBe("arrived");

    // Tracking error stays small with 4 m noise.
    expect(maxAlongErr).toBeLessThan(20);

    // Off-route declared during the excursion, never before it, and cleared afterwards.
    const firstOff = statuses.find((s) => s.p.status === "off_route");
    expect(firstOff).toBeDefined();
    expect(firstOff!.t).toBeGreaterThanOrEqual(60);
    expect(firstOff!.t).toBeLessThanOrEqual(100);
    expect(statuses.filter((s) => s.t < 60).every((s) => s.p.status !== "off_route")).toBe(true);
    expect(statuses.find((s) => s.t > 120 && s.p.status === "on_route")).toBeDefined();

    // Cues: no duplicate ids, bounded, ordered, each maneuver spoken, off-route announced.
    const ids = all.map((a) => a.cue.id);
    expect(new Set(ids).size).toBe(ids.length);
    const kinds = all.map((a) => a.cue.kind);
    expect(kinds.filter((k) => k === "arrived")).toHaveLength(1);
    expect(kinds.filter((k) => k === "off_route").length).toBeGreaterThanOrEqual(1);
    expect(kinds.filter((k) => k === "off_route").length).toBeLessThanOrEqual(3);
    const turnCues = all.filter((a) => a.cue.stepIndex !== null);
    for (const step of [1, 2]) {
      const mine = turnCues.filter((a) => a.cue.stepIndex === step);
      expect(mine.map((a) => a.cue.kind)).toEqual(["approach", "now"]);
      expect(mine[0]!.t).toBeLessThan(mine[1]!.t);
    }
    const right = turnCues.find((a) => a.cue.id === "1:approach")!.cue;
    expect(right.text.ko).toMatch(/^\d+미터 앞에서 우회전하세요$/);
    expect(right.text.en).toMatch(/^In \d+ meters, turn right$/);
    // Never more than one ordinary cue per tick, and spaced at least minGap apart.
    const times = turnCues.map((a) => a.t);
    for (let i = 1; i < times.length; i++) expect(times[i]! - times[i - 1]!).toBeGreaterThanOrEqual(3);
  });
});
