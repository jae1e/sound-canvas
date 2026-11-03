import { describe, expect, it } from "vitest";
import { composeGpsWeak, composeNearbyAnswer, composeProgressAnswer, composeRoutePreview, composeWhereAnswer } from "../src/answers";
import { formatDistance, formatDuration } from "../src/text";
import { createRouteTracker } from "../src/tracker";
import { makeRoute, mkPlace } from "./helpers";

const places = [mkPlace("4", "D", 900), mkPlace("2", "B", 200), mkPlace("1", "A", 120), mkPlace("3", "C", 350), mkPlace("9", "Pharm", 50, "PM9")];

describe("answers", () => {
  it("formats distance and duration", () => {
    expect(formatDistance(123, "ko")).toBe("120미터");
    expect(formatDistance(1234, "en")).toBe("1.2 kilometers");
    expect(formatDuration(600, "ko")).toBe("10분");
    expect(formatDuration(3900, "en")).toBe("1 hour 5 minutes");
  });

  it("nearby answer: top 3 by distance, category-filtered, ko", () => {
    const a = composeNearbyAnswer(places, { lang: "ko", category: "cafe" });
    expect(a.places.map((p) => p.name)).toEqual(["A", "B", "C"]);
    expect(a.text).toContain("120미터 거리의 A");
    expect(a.text).not.toContain("Pharm");
    expect(a.text).not.toContain("D");
    expect(a.text).toContain("카카오");
  });

  it("nearby answer in English and with one result", () => {
    const a = composeNearbyAnswer(places, { lang: "en", category: "CE7", max: 2 });
    expect(a.text).toBe("Closest 2 cafes: A, 120 meters; B, 200 meters. Based on Kakao place data.");
    const one = composeNearbyAnswer([mkPlace("1", "A", 80)], { lang: "en", category: "cafe" });
    expect(one.text.startsWith("Closest cafes: A, 80 meters")).toBe(true);
  });

  it("caps at three even when asked for more, never invents facts", () => {
    const a = composeNearbyAnswer(places, { lang: "ko", category: "cafe", max: 10 });
    expect(a.places).toHaveLength(3);
    expect(a.text).not.toMatch(/영업|별점|open|rating/i);
  });

  it("empty result", () => {
    expect(composeNearbyAnswer([], { lang: "ko", category: "cafe", radiusM: 500 }).text).toBe("근처 500미터 안에 카페 결과가 없어요.");
    expect(composeNearbyAnswer([], { lang: "en", radiusM: 500 }).text).toBe("I could not find any places within 500 meters.");
  });

  it("where am I, including weak GPS", () => {
    const w = { area: "서울 강남구 역삼동", roadAddress: "서울 강남구 테헤란로 1", source: "kakao" as const };
    expect(composeWhereAnswer(w, "ko", 10)).toContain("테헤란로 1");
    expect(composeWhereAnswer(w, "en", 40)).toContain("slightly off");
    expect(composeWhereAnswer(w, "ko", 120)).toContain("GPS 신호가 약해서");
    expect(composeGpsWeak("en", null)).toBe("I do not have a GPS fix yet.");
  });

  it("route preview and progress", () => {
    const r = makeRoute();
    expect(composeRoutePreview(r, "스타벅스", "ko")).toContain("스타벅스까지 걸어서 약 6분");
    const t = createRouteTracker(r);
    t.update({ lat: r.polyline[0]!.lat, lng: r.polyline[0]!.lng, accuracyM: 5, timestampMs: 1 });
    expect(composeProgressAnswer(t.current(), "en")).toContain("to go");
    expect(composeProgressAnswer(t.current(), "ko")).toContain("남은 거리");
  });
});
