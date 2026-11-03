import { describe, expect, it } from "vitest";
import { parseTravelIntent, resolvePlaceRef } from "../src/intents";

const p = parseTravelIntent;

describe("parseTravelIntent", () => {
  it("nearby with category (ko)", () => {
    expect(p("근처 카페")).toMatchObject({ type: "nearby", lang: "ko", category: "cafe" });
    expect(p("가까운 편의점")).toMatchObject({ type: "nearby", category: "convenience" });
    expect(p("근처에 조용한 카페 있어?")).toMatchObject({ type: "nearby", category: "cafe" });
    expect(p("주변에 약국 어디 있어")).toMatchObject({ type: "nearby", category: "pharmacy" });
  });

  it("nearby with category (en)", () => {
    expect(p("find a cafe nearby")).toMatchObject({ type: "nearby", lang: "en", category: "cafe" });
    expect(p("nearest convenience store")).toMatchObject({ type: "nearby", category: "convenience" });
    expect(p("is there a pharmacy around here?")).toMatchObject({ type: "nearby", category: "pharmacy" });
  });

  it("nearby without category", () => {
    expect(p("what's around here?")).toEqual({ type: "nearby", lang: "en" });
    expect(p("근처에 뭐 있어")).toEqual({ type: "nearby", lang: "ko" });
    expect(p("근처 서점")).toEqual({ type: "nearby", lang: "ko", query: "서점" });
  });

  it("nearby with a walking-time radius", () => {
    expect(p("10분 안에 갈 만한 곳 추천해줘")).toMatchObject({ type: "nearby", radiusM: 800 });
    expect(p("cafes within 5 minutes")).toMatchObject({ type: "nearby", category: "cafe", radiusM: 400 });
  });

  it("where am I", () => {
    expect(p("지금 어디야?")).toEqual({ type: "where_am_i", lang: "ko" });
    expect(p("where am I")).toEqual({ type: "where_am_i", lang: "en" });
    expect(p("what is my current location")).toMatchObject({ type: "where_am_i" });
  });

  it("how much farther", () => {
    expect(p("얼마나 남았어?")).toMatchObject({ type: "how_far", lang: "ko" });
    expect(p("how much farther?")).toMatchObject({ type: "how_far", lang: "en" });
    expect(p("how long until I get there")).toMatchObject({ type: "how_far" });
  });

  it("navigate to ordinal / last mentioned / nearest", () => {
    expect(p("take me to the second one")).toEqual({ type: "navigate_to", lang: "en", ref: { kind: "ordinal", index: 1 } });
    expect(p("두 번째 곳으로 안내해줘")).toMatchObject({ ref: { kind: "ordinal", index: 1 } });
    expect(p("첫번째로 가자")).toMatchObject({ ref: { kind: "ordinal", index: 0 } });
    expect(p("마지막 거기로 가자")).toMatchObject({ ref: { kind: "ordinal", index: -1 } });
    expect(p("거기로 가자")).toEqual({ type: "navigate_to", lang: "ko", ref: { kind: "last_mentioned" } });
    expect(p("let's go there")).toMatchObject({ ref: { kind: "last_mentioned" } });
    expect(p("가장 가까운 카페로 안내해줘")).toMatchObject({ ref: { kind: "nearest", category: "cafe" } });
  });

  it("stop navigation", () => {
    expect(p("stop navigation")).toEqual({ type: "stop_navigation", lang: "en" });
    expect(p("안내 종료")).toEqual({ type: "stop_navigation", lang: "ko" });
    expect(p("길안내 그만")).toMatchObject({ type: "stop_navigation" });
    expect(p("cancel the route")).toMatchObject({ type: "stop_navigation" });
  });

  it("next turn", () => {
    expect(p("what's next")).toMatchObject({ type: "next_turn" });
    expect(p("다음에 어떻게 가?")).toMatchObject({ type: "next_turn" });
  });

  it("returns null for unrelated speech", () => {
    expect(p("오늘 날씨 어때")).toBeNull();
    expect(p("set a timer for ten minutes")).toBeNull();
    expect(p("")).toBeNull();
  });

  it("resolves place refs", () => {
    const list = ["a", "b", "c"];
    expect(resolvePlaceRef({ kind: "ordinal", index: 1 }, list)).toBe("b");
    expect(resolvePlaceRef({ kind: "ordinal", index: -1 }, list)).toBe("c");
    expect(resolvePlaceRef({ kind: "ordinal", index: 5 }, list)).toBeUndefined();
    expect(resolvePlaceRef({ kind: "last_mentioned" }, list)).toBeUndefined();
    expect(resolvePlaceRef({ kind: "last_mentioned" }, ["x"])).toBe("x");
    expect(resolvePlaceRef({ kind: "last_mentioned" }, list, "b")).toBe("b");
    expect(resolvePlaceRef({ kind: "nearest" }, list)).toBe("a");
  });
});
