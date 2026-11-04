import { beforeEach, describe, expect, it, vi } from "vitest";
import { mintToken } from "../src/auth";
import type { Deps, Env } from "../src/env";
import { handle } from "../src/index";
import { clearLandmarkCache, isHistoric } from "../src/providers/landmarks";

const SECRET = "test-signing-secret";
const env = (over: Partial<Env> = {}): Env => ({ KAKAO_REST_KEY: "kakao-key", TMAP_APP_KEY: "tmap-key", TOUR_API_KEY: "tour-key-abc", TOKEN_SIGNING_SECRET: SECRET, ...over });

const tourEnvelope = (items: unknown) => ({ response: { header: { resultCode: "0000", resultMsg: "OK" }, body: { items: items === null ? "" : { item: items }, numOfRows: 30, pageNo: 1, totalCount: 1 } } });

// Invented sample data in the documented shape (not real provider text).
const list12 = [
  { contentid: "111", contenttypeid: "12", title: "샘터궁", addr1: "서울 어딘가", dist: "250.4", mapx: "126.9770", mapy: "37.5800" },
  { contentid: "222", contenttypeid: "12", title: "한강 놀이공원", addr1: "서울", dist: "100.0", mapx: "126.9", mapy: "37.5" },
];
const list14 = [{ contentid: "333", contenttypeid: "14", title: "나무사", addr1: "서울", dist: "600", mapx: "126.9790", mapy: "37.5730" }];
const kakaoAt4 = {
  documents: [
    // Same place as 샘터궁 (dedup by name)
    { id: "1001", place_name: "샘터궁", category_name: "여행 > 관광,명소 > 고궁", category_group_code: "AT4", category_group_name: "관광명소", x: "126.9771", y: "37.5801", distance: "252" },
    { id: "1002", place_name: "옛우물 터", category_name: "여행 > 관광,명소 > 문화유적", category_group_code: "AT4", category_group_name: "관광명소", x: "126.98", y: "37.571", distance: "400" },
    { id: "1003", place_name: "전망 타워", category_name: "여행 > 관광,명소 > 전망대", category_group_code: "AT4", category_group_name: "관광명소", x: "126.99", y: "37.55", distance: "300" },
  ],
};
const overview = (txt: string) => tourEnvelope([{ contentid: "111", contenttypeid: "12", title: "샘터궁", overview: txt }]);

type Responder = (u: URL) => unknown | Response;
function setup(responder: Responder) {
  const fetchMock = vi.fn(async (url: string | URL | Request) => {
    const r = responder(new URL(String(url)));
    return r instanceof Response ? r : new Response(JSON.stringify(r), { status: 200 });
  });
  let t = 1_700_000_000_000;
  const deps: Deps = { fetch: fetchMock as unknown as typeof fetch, now: () => (t += 5) };
  return { fetchMock, deps };
}
async function call(path: string, body: unknown, deps: Deps, e: Env = env()) {
  const tok = await mintToken(SECRET, "install-0001");
  return handle(new Request(`https://w.example${path}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` }, body: JSON.stringify(body) }), e, deps);
}

const standard: Responder = (u) => {
  if (u.hostname === "dapi.kakao.com") return kakaoAt4;
  if (u.pathname.endsWith("/locationBasedList2")) return tourEnvelope(u.searchParams.get("contentTypeId") === "12" ? list12 : list14);
  if (u.pathname.endsWith("/detailCommon2")) {
    const id = u.searchParams.get("contentId");
    if (id === "111") return overview("<p>샘터궁(寶山宮)은 오래된 궁궐이다.<br />1395년에 처음 지어졌다.</p>");
    if (id === "333") return tourEnvelope([{ contentid: "333", title: "나무사", overview: "" }]);
  }
  if (u.hostname.endsWith("wikipedia.org")) return { type: "standard", extract: "나무사는 산자락에 자리한 작은 절로, 위키백과 요약문이다.", content_urls: { desktop: { page: "https://ko.wikipedia.org/wiki/x" } } };
  return tourEnvelope(null);
};

beforeEach(() => clearLandmarkCache());

describe("/landmarks/nearby", () => {
  it("merges TourAPI and Kakao AT4, filters to historic, dedups, and adds one-liners", async () => {
    const { deps, fetchMock } = setup(standard);
    const res = await call("/landmarks/nearby", { lat: 37.578, lng: 126.977, radiusM: 1500, lang: "ko", limit: 3 }, deps);
    expect(res.status).toBe(200);
    const { landmarks } = (await res.json()) as { landmarks: Array<Record<string, unknown>> };
    expect(landmarks.map((l) => l.name)).toEqual(["샘터궁", "옛우물 터", "나무사"]); // 놀이공원 and 타워 are not historic; the Kakao duplicate is dropped
    expect(landmarks[0]).toMatchObject({ id: "tourapi:111:12", category: "관광지", distanceM: 250, source: "tourapi", oneLine: "샘터궁은 오래된 궁궐이다.", attribution: "출처: 한국관광공사 TourAPI (공공데이터포털)" });
    expect(landmarks[1]).toMatchObject({ id: "kakao:1002", source: "kakao", category: "문화유적", attribution: "출처: 카카오 로컬" });
    // 나무사 had no TourAPI overview: one-liner from Wikipedia, attribution says so.
    expect(landmarks[2]!.oneLine).toContain("작은 절");
    expect(String(landmarks[2]!.attribution)).toContain("CC BY-SA");

    const tourCalls = fetchMock.mock.calls.map((c) => new URL(String(c[0]))).filter((u) => u.hostname === "apis.data.go.kr");
    const list = tourCalls.filter((u) => u.pathname === "/B551011/KorService2/locationBasedList2");
    expect(list.map((u) => u.searchParams.get("contentTypeId")).sort()).toEqual(["12", "14"]);
    const q = list[0]!.searchParams;
    expect(q.get("serviceKey")).toBe("tour-key-abc");
    expect(q.get("mapX")).toBe("126.977");
    expect(q.get("mapY")).toBe("37.578");
    expect(q.get("radius")).toBe("1500");
    expect(q.get("MobileOS")).toBe("ETC");
    expect(q.get("_type")).toBe("json");
    const kakao = fetchMock.mock.calls.map((c) => new URL(String(c[0]))).find((u) => u.hostname === "dapi.kakao.com")!;
    expect(kakao.searchParams.get("category_group_code")).toBe("AT4");
  });

  it("theme any keeps non-historic places; english uses EngService2", async () => {
    const { deps, fetchMock } = setup(standard);
    const res = await call("/landmarks/nearby", { lat: 37.578, lng: 126.977, lang: "en", limit: 5, theme: "any" }, deps);
    const { landmarks } = (await res.json()) as { landmarks: Array<{ name: string; category: string }> };
    expect(landmarks.map((l) => l.name)).toContain("한강 놀이공원");
    expect(landmarks.find((l) => l.name === "샘터궁")!.category).toBe("Tourist attraction");
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("/EngService2/locationBasedList2"))).toBe(true);
  });

  it("uses a percent-encoded key once", async () => {
    const { deps, fetchMock } = setup(standard);
    await call("/landmarks/nearby", { lat: 37.5, lng: 127 }, deps, env({ TOUR_API_KEY: "ab%2Bcd%3D%3D" }));
    const u = new URL(String(fetchMock.mock.calls.find((c) => String(c[0]).includes("locationBasedList2"))![0]));
    expect(u.searchParams.get("serviceKey")).toBe("ab+cd==");
  });

  it("falls back to Kakao when TourAPI fails or has no key", async () => {
    const failing = setup((u) => (u.hostname === "apis.data.go.kr" ? new Response("x", { status: 500 }) : standard(u)));
    let res = await call("/landmarks/nearby", { lat: 37.5, lng: 127 }, failing.deps);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { landmarks: Array<{ source: string }> }).landmarks.every((l) => l.source === "kakao")).toBe(true);
    const noKey = setup(standard);
    res = await call("/landmarks/nearby", { lat: 37.5, lng: 127 }, noKey.deps, env({ TOUR_API_KEY: undefined }));
    expect(res.status).toBe(200);
    expect(noKey.fetchMock.mock.calls.every((c) => new URL(String(c[0])).hostname === "dapi.kakao.com")).toBe(true);
  });

  it("returns 502 when every provider fails and 503 with no keys", async () => {
    const { deps } = setup(() => new Response("x", { status: 500 }));
    expect((await call("/landmarks/nearby", { lat: 37.5, lng: 127 }, deps)).status).toBe(502);
    expect((await call("/landmarks/nearby", { lat: 37.5, lng: 127 }, deps, env({ TOUR_API_KEY: undefined, KAKAO_REST_KEY: "" }))).status).toBe(503);
  });

  it("treats an empty result and a TourAPI error code", async () => {
    const empty = setup((u) => (u.hostname === "dapi.kakao.com" ? { documents: [] } : tourEnvelope(null)));
    const res = await call("/landmarks/nearby", { lat: 37.5, lng: 127 }, empty.deps);
    expect(await res.json()).toEqual({ landmarks: [] });
    const bad = setup((u) => (u.hostname === "dapi.kakao.com" ? new Response("x", { status: 500 }) : { response: { header: { resultCode: "30", resultMsg: "SERVICE_KEY_IS_NOT_REGISTERED_ERROR" } } }));
    expect((await call("/landmarks/nearby", { lat: 37.5, lng: 127 }, bad.deps)).status).toBe(502);
  });

  it("validates input and never echoes values", async () => {
    const { deps } = setup(standard);
    const res = await call("/landmarks/nearby", { lat: 999, lng: 127 }, deps);
    expect(res.status).toBe(400);
    expect(JSON.stringify(await res.json())).not.toContain("999");
    expect((await call("/landmarks/nearby", { lat: 37, lng: 127, extra: 1 }, deps)).status).toBe(400);
  });
});

describe("/landmarks/detail", () => {
  const intro = tourEnvelope([{ contentid: "111", contenttypeid: "12", usetime: "09:00~18:00", restdate: "<b>화요일</b>", usefee: "0", heritage1: "1" }]);
  const detailResponder: Responder = (u) => {
    if (u.pathname.endsWith("/detailIntro2")) return intro;
    return standard(u);
  };

  it("returns stripped overview, facts and attribution; sends contentTypeId to intro", async () => {
    const { deps, fetchMock } = setup(detailResponder);
    const res = await call("/landmarks/detail", { id: "tourapi:111:12", lang: "ko" }, deps);
    expect(res.status).toBe(200);
    const { detail } = (await res.json()) as { detail: Record<string, unknown> };
    expect(detail).toMatchObject({
      id: "tourapi:111:12",
      lang: "ko",
      source: "tourapi",
      attribution: "출처: 한국관광공사 TourAPI (공공데이터포털)",
    });
    expect(detail.overview).toBe("샘터궁(寶山宮)은 오래된 궁궐이다.\n1395년에 처음 지어졌다.");
    expect(detail.facts).toEqual([
      { key: "hours", value: "09:00~18:00" },
      { key: "closed", value: "화요일" },
      { key: "heritage", value: "세계문화유산" },
    ]);
    const introUrl = fetchMock.mock.calls.map((c) => new URL(String(c[0]))).find((u) => u.pathname.endsWith("/detailIntro2"))!;
    expect(introUrl.searchParams.get("contentTypeId")).toBe("12");
    expect(introUrl.searchParams.get("contentId")).toBe("111");
  });

  it("caches TourAPI detail for a short time", async () => {
    const { deps, fetchMock } = setup(detailResponder);
    await call("/landmarks/detail", { id: "tourapi:111:12", lang: "ko" }, deps);
    const n = fetchMock.mock.calls.length;
    await call("/landmarks/detail", { id: "tourapi:111:12", lang: "ko" }, deps);
    expect(fetchMock.mock.calls.length).toBe(n);
    await call("/landmarks/detail", { id: "tourapi:111:12", lang: "en" }, deps); // another language is another entry
    expect(fetchMock.mock.calls.length).toBeGreaterThan(n);
  });

  it("falls back to Wikipedia only when TourAPI has no overview, and labels it", async () => {
    const { deps, fetchMock } = setup(detailResponder);
    const res = await call("/landmarks/detail", { id: "tourapi:333:14", lang: "ko" }, deps);
    const { detail } = (await res.json()) as { detail: Record<string, unknown> };
    expect(detail).toMatchObject({ source: "wikipedia", sourceUrl: "https://ko.wikipedia.org/wiki/x" });
    expect(String(detail.attribution)).toContain("위키백과 (CC BY-SA 4.0)");
    const wiki = fetchMock.mock.calls.map((c) => new URL(String(c[0]))).find((u) => u.hostname === "ko.wikipedia.org")!;
    expect(decodeURIComponent(wiki.pathname)).toBe("/api/rest_v1/page/summary/나무사");
    // TourAPI with an overview never touches Wikipedia.
    const second = setup(detailResponder);
    await call("/landmarks/detail", { id: "tourapi:111:12", lang: "ko" }, second.deps);
    expect(second.fetchMock.mock.calls.some((c) => String(c[0]).includes("wikipedia"))).toBe(false);
  });

  it("returns an empty overview when nothing has text, and uses Wikipedia for Kakao ids with a name", async () => {
    const { deps } = setup((u) => (u.hostname.endsWith("wikipedia.org") ? new Response("nf", { status: 404 }) : detailResponder(u)));
    const res = await call("/landmarks/detail", { id: "kakao:1002", lang: "ko", name: "옛우물 터" }, deps);
    expect(await res.json()).toMatchObject({ detail: { overview: "", source: "kakao" } });
    const wiki = setup(detailResponder);
    const r2 = await call("/landmarks/detail", { id: "kakao:1002", lang: "ko", name: "나무사" }, wiki.deps);
    expect(await r2.json()).toMatchObject({ detail: { source: "wikipedia" } });
  });

  it("validates ids and maps upstream errors", async () => {
    const { deps } = setup(detailResponder);
    expect((await call("/landmarks/detail", { id: "foo:1", lang: "ko" }, deps)).status).toBe(400);
    expect((await call("/landmarks/detail", { id: "tourapi:1:12", lang: "xx" }, deps)).status).toBe(400);
    const bad = setup(() => new Response("x", { status: 500 }));
    expect((await call("/landmarks/detail", { id: "tourapi:9:12", lang: "ko" }, bad.deps)).status).toBe(502);
    expect((await call("/landmarks/detail", { id: "tourapi:9:12", lang: "ko" }, deps, env({ TOUR_API_KEY: undefined, KAKAO_REST_KEY: "" }))).status).toBe(503);
  });
});

describe("isHistoric", () => {
  it("recognises historic names and categories", () => {
    expect(isHistoric("경복궁")).toBe(true);
    expect(isHistoric("Gyeongbokgung Palace")).toBe(true);
    expect(isHistoric("한강 놀이공원")).toBe(false);
    expect(isHistoric("전망 타워", "여행 > 관광,명소 > 문화유적")).toBe(true);
  });
});
