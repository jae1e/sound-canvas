import { describe, expect, it } from "vitest";
import { parseTravelIntent as p, resolveLandmarkRef } from "../src/intents";
import type { Landmark } from "../src/types";

const lm = (name: string, i = 0): Landmark => ({ id: `x:${i}`, name, category: "", distanceM: 100 * (i + 1), lat: 0, lng: 0, oneLine: "", source: "fixture", attribution: "" });
const list = [lm("경복궁", 0), lm("조계사", 1), lm("보신각", 2)];
const listEn = [lm("Gyeongbokgung Palace", 0), lm("Jogyesa Temple", 1), lm("Bosingak Belfry", 2)];

describe("landmark list intents", () => {
  it("ko", () => {
    for (const u of ["근처에 역사적인 곳 추천해줘", "주변 유적지", "근처 고궁 있어?", "가까운 문화재 알려줘", "역사적인 곳 알려줘"]) {
      expect(p(u), u).toMatchObject({ type: "landmarks_nearby", lang: "ko" });
    }
  });
  it("en", () => {
    for (const u of ["any historic landmarks around here?", "recommend a historic site nearby", "are there any palaces near me", "what's historic around here"]) {
      expect(p(u), u).toMatchObject({ type: "landmarks_nearby", lang: "en" });
    }
  });
  it("keeps the old category and nearby behaviour", () => {
    expect(p("근처 카페")).toMatchObject({ type: "nearby", category: "cafe" });
    expect(p("what's around here?")).toEqual({ type: "nearby", lang: "en" });
    expect(p("근처 관광명소")).toMatchObject({ type: "nearby", category: "attraction" });
  });
});

describe("landmark info and follow-ups", () => {
  it("ordinals and 'there'", () => {
    expect(p("두 번째 거 알려줘")).toEqual({ type: "landmark_info", lang: "ko", ref: { kind: "ordinal", index: 1 } });
    expect(p("거기 어떤 곳이야?")).toEqual({ type: "landmark_info", lang: "ko", ref: { kind: "last_mentioned" } });
    expect(p("tell me about the second one")).toEqual({ type: "landmark_info", lang: "en", ref: { kind: "ordinal", index: 1 } });
    expect(p("tell me about the first one")).toMatchObject({ type: "landmark_info", ref: { kind: "ordinal", index: 0 } });
  });
  it("names and nouns", () => {
    expect(p("경복궁 알려줘")).toMatchObject({ type: "landmark_info", ref: { kind: "keyword" } });
    expect(p("tell me about that palace")).toMatchObject({ type: "landmark_info", ref: { kind: "keyword" } });
  });
  it("follow-ups", () => {
    expect(p("언제 지어졌어?")).toEqual({ type: "landmark_followup", lang: "ko", topic: "period" });
    expect(p("when was it built")).toEqual({ type: "landmark_followup", lang: "en", topic: "period" });
    expect(p("when was it first built")).toEqual({ type: "landmark_followup", lang: "en", topic: "period" }); // "first" is not a reference here
    expect(p("more")).toEqual({ type: "landmark_followup", lang: "en", topic: "more" });
    expect(p("tell me more")).toMatchObject({ type: "landmark_followup", topic: "more" });
    expect(p("더 알려줘")).toMatchObject({ type: "landmark_followup", topic: "more" });
    expect(p("몇 시까지 열어?")).toMatchObject({ topic: "hours" });
    expect(p("입장료 얼마야")).toMatchObject({ topic: "fee" });
    expect(p("왜 유명해?")).toMatchObject({ topic: "why" });
    expect(p("두 번째는 언제 지어졌어")).toMatchObject({ topic: "period", ref: { kind: "ordinal", index: 1 } });
  });
  it("stop words", () => {
    for (const u of ["멈춰", "그만", "stop", "Stop!", "enough"]) expect(p(u), u).toMatchObject({ type: "stop_narration" });
  });
  it("navigation still works and is not hijacked", () => {
    expect(p("거기로 가자")).toEqual({ type: "navigate_to", lang: "ko", ref: { kind: "last_mentioned" } });
    expect(p("take me to the second one")).toMatchObject({ type: "navigate_to", ref: { kind: "ordinal", index: 1 } });
    expect(p("안내 종료")).toMatchObject({ type: "stop_navigation" });
    expect(p("얼마나 남았어")).toMatchObject({ type: "how_far" });
    expect(p("궁금한 게 있어")).toBeNull();
  });
});

describe("resolveLandmarkRef", () => {
  it("resolves by ordinal, last mentioned and name", () => {
    expect(resolveLandmarkRef({ kind: "ordinal", index: 1 }, list)?.name).toBe("조계사");
    expect(resolveLandmarkRef({ kind: "last_mentioned" }, list, list[2])?.name).toBe("보신각");
    expect(resolveLandmarkRef({ kind: "keyword", text: "경복궁 알려줘" }, list)?.name).toBe("경복궁");
    expect(resolveLandmarkRef({ kind: "keyword", text: "tell me about that palace" }, listEn)?.name).toBe("Gyeongbokgung Palace");
    expect(resolveLandmarkRef({ kind: "keyword", text: "tell me about that temple" }, listEn)?.name).toBe("Jogyesa Temple");
    expect(resolveLandmarkRef({ kind: "keyword", text: "tell me about gyeongbokgung" }, listEn)?.name).toBe("Gyeongbokgung Palace");
    expect(resolveLandmarkRef({ kind: "keyword", text: "그 절 알려줘" }, list)?.name).toBe("조계사");
    expect(resolveLandmarkRef({ kind: "keyword", text: "날씨 알려줘" }, list)).toBeUndefined();
  });
});
