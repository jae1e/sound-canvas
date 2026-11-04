import { describe, expect, it } from "vitest";
import {
  askLlm,
  composeLandmarkFollowup,
  composeLandmarkList,
  composeLandmarkNarration,
  estimateSpeechSeconds,
  oneLineFrom,
  prepareSentences,
  speechNumbers,
  splitSentences,
  stripHtml,
  yearToWords,
} from "../src/narration";
import type { Landmark, LandmarkDetail } from "../src/types";

// Original test text (not copied from any provider).
const KO =
  "<p>샘터궁(寶山宮, Saemteo Palace)은 서울 한복판에 있는 옛 궁궐이다.<br />1395년에 처음 지어졌으며 조선 왕조의 첫 번째 궁궐로 쓰였다.</p>" +
  "<p>대표 건물인 가운데 전각은 약 5,000㎡ 넓이의 마당에 둘러싸여 있다. 임진왜란 때 불에 타 오랫동안 비어 있었다. " +
  "1867년에 다시 지어 나라의 중심 궁궐로 되살렸다. 이곳은 세계에서 손꼽히는 목조 건축 유산으로 평가받는다. " +
  "해마다 봄과 가을에 야간 개방 행사가 열린다. 입구 앞 광장에서는 문을 지키는 의식을 볼 수 있다. 정원 연못 가운데에는 누각이 하나 있다.</p>";
const EN =
  "Saemteo Palace (宮, built 1395) is an old royal palace in central Seoul. It was first built in 1395 as the main palace of the dynasty. " +
  "The central hall stands in a courtyard of about 5,000 m² and is the most important building. It burned down in 1592 and stood empty for centuries. " +
  "It was rebuilt in 1867 and is now a symbol of the capital. Visitors can watch a gate guard ceremony every day. A small pavilion sits in the middle of the pond.";

const detail = (overview: string, lang: "ko" | "en" = "ko", facts: LandmarkDetail["facts"] = []): LandmarkDetail => ({
  id: "t:1",
  lang,
  overview,
  facts,
  source: "fixture",
  attribution: "test",
});

describe("text cleaning", () => {
  it("strips html and entities", () => {
    expect(stripHtml("a<br />b &amp; c&nbsp;d<p>e</p>")).toBe("a\nb & c d\ne");
  });
  it("splits sentences without breaking decimals or abbreviations", () => {
    expect(splitSentences("It is 3.5 km long. St. Paul is near. Done!")).toEqual(["It is 3.5 km long.", "St. Paul is near.", "Done!"]);
  });
  it("removes parentheses and hanja", () => {
    const s = prepareSentences(KO, "ko");
    expect(s[0]).toBe("샘터궁은 서울 한복판에 있는 옛 궁궐이다.");
    expect(s.join(" ")).not.toMatch(/[()（）]|[一-鿿]/);
  });
});

describe("number reading", () => {
  it("handles units, commas, ranges", () => {
    expect(speechNumbers("넓이 5,000㎡, 길이 10.9km, 1395~1400년, 50%", "ko")).toBe("넓이 5000제곱미터, 길이 10.9킬로미터, 1395에서 1400년, 50퍼센트");
    expect(speechNumbers("about 5,000 m² and 3 km, 10–20 people, 50%", "en")).toBe("about 5000 square meters and 3 kilometers, 10 to 20 people, 50 percent");
  });
  it("reads english years as words but not other numbers", () => {
    expect(yearToWords(1395)).toBe("thirteen ninety-five");
    expect(yearToWords(1405)).toBe("fourteen oh five");
    expect(yearToWords(1900)).toBe("nineteen hundred");
    expect(yearToWords(2005)).toBe("two thousand five");
    expect(yearToWords(2018)).toBe("twenty eighteen");
    expect(speechNumbers("Burned in the 1590s, rebuilt in 1867, and again in 1907, then 2,500 people", "en")).toBe("Burned in the fifteen nineties, rebuilt in eighteen sixty-seven, and again in nineteen oh seven, then 2500 people");
    expect(speechNumbers("Built in 1395 and 1,500 people came", "en")).toBe("Built in thirteen ninety-five and 1500 people came");
  });
});

describe("composeLandmarkNarration", () => {
  it("builds a 30-60 s korean script from source sentences only", () => {
    const n = composeLandmarkNarration("샘터궁", detail(KO), "ko");
    expect(n.seconds).toBeGreaterThanOrEqual(30);
    expect(n.seconds).toBeLessThanOrEqual(60);
    expect(n.chunks[0]).toBe("샘터궁에 대해 알려 드릴게요.");
    expect(n.chunks.at(-1)).toBe("앱에 들어 있는 샘플 설명이에요.");
    // First sentence (what it is) and the period sentence are present; no clutter.
    expect(n.text).toContain("옛 궁궐이다");
    expect(n.text).toContain("1395년");
    expect(n.text).not.toMatch(/[()]|[一-鿿]|<|&/);
    expect(n.text).toContain("5000제곱미터");
    // Every body sentence comes from the source.
    const source = prepareSentences(KO, "ko");
    for (const u of n.used) expect(source).toContain(u);
  });

  it("builds an english script and says the source", () => {
    const n = composeLandmarkNarration("Saemteo Palace", detail(EN, "en"), "en");
    expect(n.seconds).toBeLessThanOrEqual(60);
    expect(n.text).toContain("thirteen ninety-five");
    expect(n.text).toContain("5000 square meters");
    expect(n.text).not.toMatch(/\(|宮/);
    expect(n.chunks.at(-1)).toBe("This is sample text bundled with the app.");
  });

  it("uses everything when the source is short and never pads", () => {
    const n = composeLandmarkNarration("A", detail("작은 정자이다. 연못 옆에 있다.", "ko"), "ko");
    expect(n.used).toHaveLength(2);
    expect(n.hasMore).toBe(false);
    expect(n.seconds).toBeLessThan(30);
  });

  it("handles empty text and reports leftovers", () => {
    expect(composeLandmarkNarration("X", detail(""), "ko").text).toBe("X에 대해 읽어 드릴 설명 자료가 없어요.");
    const long = Array.from({ length: 14 }, (_, i) => `이것은 ${i}번째로 길게 이어지는 설명 문장이며 충분히 긴 내용을 담고 있어요.`).join(" ");
    const n = composeLandmarkNarration("L", detail(long), "ko");
    expect(n.hasMore).toBe(true);
    expect(n.seconds).toBeLessThanOrEqual(60);
  });

  it("estimates speech time", () => {
    expect(estimateSpeechSeconds("가".repeat(55), "ko")).toBeCloseTo(10);
    expect(estimateSpeechSeconds("one two three four five", "en")).toBeCloseTo(2);
  });
});

describe("composeLandmarkFollowup", () => {
  const d = detail(KO, "ko", [{ key: "closed", value: "화요일 휴관" }]);
  it("answers the period from the source", () => {
    const a = composeLandmarkFollowup("샘터궁", d, "period", "ko");
    expect(a.text).toContain("1395년");
    expect(a.chunks.at(-1)).toBe("앱에 들어 있는 샘플 설명이에요.");
  });
  it("says when the source does not know", () => {
    expect(composeLandmarkFollowup("X", detail("그냥 연못이 있는 작은 공원이에요."), "period", "ko").text).toBe("X이 언제 지어졌는지는 제가 가진 자료에 나와 있지 않아요.");
    expect(composeLandmarkFollowup("X", detail("A small park by a pond.", "en"), "fee", "en").text).toBe("Admission for X is not in my source.");
  });
  it("answers hours from facts", () => {
    expect(composeLandmarkFollowup("샘터궁", d, "hours", "ko").text).toContain("화요일 휴관");
  });
  it("continues with unused sentences for 'more'", () => {
    const first = composeLandmarkNarration("샘터궁", d, "ko");
    const more = composeLandmarkFollowup("샘터궁", d, "more", "ko", first.used);
    for (const u of more.used) expect(first.used).not.toContain(u);
    const done = composeLandmarkFollowup("샘터궁", d, "more", "ko", prepareSentences(KO, "ko"));
    expect(done.text).toContain("더 나와 있는 내용은 없어요");
  });
});

describe("landmark list", () => {
  const mk = (name: string, distanceM: number, oneLine: string): Landmark => ({ id: name, name, category: "", distanceM, lat: 0, lng: 0, oneLine, source: "tourapi", attribution: "" });
  const ls = [mk("나무절", 640, "산자락에 있는 오래된 절이에요 (木)"), mk("샘터궁", 120, "옛 궁궐이에요"), mk("종각", 300, ""), mk("먼곳", 900, "멀어요")];
  it("lists the nearest three with distance and one line, in ko and en", () => {
    const a = composeLandmarkList(ls, "ko");
    expect(a.landmarks.map((l) => l.name)).toEqual(["샘터궁", "종각", "나무절"]);
    expect(a.text).toContain("첫 번째, 샘터궁, 120미터 거리예요. 옛 궁궐이에요.");
    expect(a.text).toContain("세 번째, 나무절, 640미터 거리예요. 산자락에 있는 오래된 절이에요.");
    expect(a.text).toContain("한국관광공사 자료 기준");
    const e = composeLandmarkList(ls.map((l) => ({ ...l, oneLine: "An old place" })), "en");
    expect(e.text).toContain("First, 샘터궁, 120 meters away. An old place.");
    expect(e.chunks.length).toBe(5);
  });
  it("handles none", () => {
    expect(composeLandmarkList([], "en", { radiusM: 1500 }).text).toBe("I could not find a historic landmark within 1.5 kilometers.");
  });
  it("shortens one-liners", () => {
    expect(oneLineFrom("A".repeat(10) + " " + "word ".repeat(30), "en", 40).endsWith(".")).toBe(true);
  });
});

describe("askLlm hook", () => {
  it("is a stub until M4", async () => {
    await expect(askLlm({ lang: "ko", question: "q", landmarkName: "n", sourceText: "s", source: "fixture" })).rejects.toThrow(/not implemented/);
  });
});
