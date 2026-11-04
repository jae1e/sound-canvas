import { describe, expect, it, vi } from "vitest";
import { mintToken } from "../src/auth";
import type { Deps, Env } from "../src/env";
import { handle } from "../src/index";
import { mapTurnType, normalizeTmap } from "../src/providers/tmap";

const SECRET = "test-signing-secret";
const env = (over: Partial<Env> = {}): Env => ({
  KAKAO_REST_KEY: "kakao-key-xyz",
  TMAP_APP_KEY: "tmap-key-xyz",
  TOKEN_SIGNING_SECRET: SECRET,
  ...over,
});

const kakaoSearch = {
  documents: [
    { id: "2", place_name: "B Cafe", category_name: "음식점 > 카페 > 커피전문점", category_group_code: "CE7", category_group_name: "카페", phone: "02-1", address_name: "서울 a", road_address_name: "서울 road", x: "127.001", y: "37.501", place_url: "http://place.map.kakao.com/2", distance: "200" },
    { id: "1", place_name: "A Cafe", category_name: "음식점 > 카페", category_group_code: "CE7", category_group_name: "카페", phone: "", address_name: "서울 b", road_address_name: "", x: "127.0005", y: "37.5005", place_url: "", distance: "70" },
  ],
};

// TMAP-like GeoJSON: start, a right turn, end. 3 vertices-ish line strings.
const tmapResp = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", geometry: { type: "Point", coordinates: [127.0, 37.5] }, properties: { totalDistance: 330, totalTime: 250, pointType: "SP", turnType: 200, description: "출발" } },
    { type: "Feature", geometry: { type: "LineString", coordinates: [[127.0, 37.5], [127.0, 37.501], [127.0, 37.502]] }, properties: { distance: 222 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [127.0, 37.502] }, properties: { pointType: "GP", turnType: 13, description: "우회전 후 100m 이동" } },
    { type: "Feature", geometry: { type: "Point", coordinates: [127.0005, 37.502] }, properties: { pointType: "PP", turnType: 0, description: "" } },
    { type: "Feature", geometry: { type: "LineString", coordinates: [[127.0, 37.502], [127.0005, 37.502], [127.001, 37.502]] }, properties: { distance: 88 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [127.001, 37.502] }, properties: { pointType: "EP", turnType: 201, description: "도착" } },
  ],
};

function setup(responder: (url: string, init?: RequestInit) => unknown, status = 200) {
  const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const body = responder(String(url), init);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  });
  let t = 1_700_000_000_000;
  const deps: Deps = { fetch: fetchMock as unknown as typeof fetch, now: () => (t += 5) };
  return { fetchMock, deps };
}

async function call(path: string, body: unknown, deps: Deps, e: Env = env(), token?: string | null) {
  const tok = token === undefined ? await mintToken(SECRET, "install-0001") : token;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (tok) headers.Authorization = `Bearer ${tok}`;
  return handle(new Request(`https://w.example${path}`, { method: "POST", headers, body: JSON.stringify(body) }), e, deps);
}

describe("auth and routing", () => {
  it("rejects missing, malformed and forged tokens", async () => {
    const { deps } = setup(() => ({}));
    expect((await call("/places/where", { lat: 37, lng: 127 }, deps, env(), null)).status).toBe(401);
    expect((await call("/places/where", { lat: 37, lng: 127 }, deps, env(), "abc")).status).toBe(401);
    expect((await call("/places/where", { lat: 37, lng: 127 }, deps, env(), "install-0001." + "0".repeat(64))).status).toBe(401);
    const other = await mintToken("other-secret", "install-0001");
    expect((await call("/places/where", { lat: 37, lng: 127 }, deps, env(), other)).status).toBe(401);
  });

  it("health is open; unknown paths 404; wrong method 405", async () => {
    const { deps } = setup(() => ({}));
    expect((await handle(new Request("https://w.example/health"), env(), deps)).status).toBe(200);
    expect((await call("/nope", {}, deps)).status).toBe(404);
    expect((await handle(new Request("https://w.example/llm"), env(), deps)).status).toBe(405);
  });

  it("rate limits per token", async () => {
    const { deps } = setup(() => kakaoSearch);
    const e = env({ RATE_LIMIT_PER_MIN: "2" });
    const tok = await mintToken(SECRET, "rate-limited-install");
    const body = { lat: 37.5, lng: 127, category: "cafe", radiusM: 500, limit: 3 };
    expect((await call("/places/search", body, deps, e, tok)).status).toBe(200);
    expect((await call("/places/search", body, deps, e, tok)).status).toBe(200);
    const res = await call("/places/search", body, deps, e, tok);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    // A different install is unaffected.
    expect((await call("/places/search", body, deps, e, await mintToken(SECRET, "another-install-1"))).status).toBe(200);
  });
});

describe("/places/search", () => {
  it("normalizes Kakao results and sends key, coords, radius and distance sort", async () => {
    const { deps, fetchMock } = setup(() => kakaoSearch);
    const res = await call("/places/search", { lat: 37.5, lng: 127.0, category: "cafe", radiusM: 800, limit: 5 }, deps);
    expect(res.status).toBe(200);
    const { places } = (await res.json()) as { places: Array<Record<string, unknown>> };
    expect(places.map((p) => p.name)).toEqual(["A Cafe", "B Cafe"]); // sorted by distance
    expect(places[1]).toMatchObject({ id: "kakao:2", category: "카페", categoryCode: "CE7", distanceM: 200, address: "서울 road", phone: "02-1", url: "http://place.map.kakao.com/2", source: "kakao", lat: 37.501, lng: 127.001 });
    expect(places[0]!.phone).toBeUndefined();
    expect(places[0]!.address).toBe("서울 b");

    const [url, init] = fetchMock.mock.calls[0]!;
    const u = new URL(String(url));
    expect(u.pathname).toBe("/v2/local/search/category.json");
    expect(u.searchParams.get("category_group_code")).toBe("CE7");
    expect(u.searchParams.get("x")).toBe("127");
    expect(u.searchParams.get("y")).toBe("37.5");
    expect(u.searchParams.get("radius")).toBe("800");
    expect(u.searchParams.get("sort")).toBe("distance");
    expect((init!.headers as Record<string, string>).Authorization).toBe("KakaoAK kakao-key-xyz");
  });

  it("uses keyword search when a query is given", async () => {
    const { deps, fetchMock } = setup(() => kakaoSearch);
    await call("/places/search", { lat: 37.5, lng: 127, query: "조용한 카페", category: "CE7" }, deps);
    const u = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(u.pathname).toBe("/v2/local/search/keyword.json");
    expect(u.searchParams.get("query")).toBe("조용한 카페");
    expect(u.searchParams.get("category_group_code")).toBe("CE7");
    expect(u.searchParams.get("radius")).toBe("500"); // default
  });

  it("fans out over default categories and de-duplicates when nothing is specified", async () => {
    const { deps, fetchMock } = setup(() => kakaoSearch);
    const res = await call("/places/search", { lat: 37.5, lng: 127, limit: 3 }, deps);
    expect(fetchMock.mock.calls.length).toBe(5);
    expect(((await res.json()) as { places: unknown[] }).places).toHaveLength(2);
  });

  it("validates input", async () => {
    const { deps, fetchMock } = setup(() => kakaoSearch);
    for (const bad of [{ lat: 200, lng: 127 }, { lat: 37, lng: 127, category: "spaceport" }, { lat: 37, lng: 127, radiusM: 99999 }, { lat: 37, lng: 127, limit: 99 }, { lat: 37, lng: 127, extra: 1 }]) {
      const res = await call("/places/search", bad, deps);
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: string }).error).toBe("invalid_request");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps upstream failures to 502 without leaking keys", async () => {
    const { deps } = setup(() => ({ msg: "no" }), 401);
    const res = await call("/places/search", { lat: 37.5, lng: 127, category: "cafe" }, deps);
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).toContain("upstream_error");
    expect(text).not.toContain("kakao-key-xyz");
  });

  it("returns 503 when the key is not configured", async () => {
    const { deps } = setup(() => kakaoSearch);
    const res = await call("/places/search", { lat: 37.5, lng: 127, category: "cafe" }, deps, env({ KAKAO_REST_KEY: "" }));
    expect(res.status).toBe(503);
  });
});

describe("/places/where", () => {
  it("combines address and region", async () => {
    const { deps, fetchMock } = setup((url) =>
      url.includes("coord2address")
        ? { documents: [{ address: { address_name: "서울 강남구 역삼동 1-1" }, road_address: { address_name: "서울 강남구 테헤란로 1" } }] }
        : { documents: [{ region_type: "B", region_3depth_name: "x" }, { region_type: "H", region_1depth_name: "서울특별시", region_2depth_name: "강남구", region_3depth_name: "역삼1동" }] },
    );
    const res = await call("/places/where", { lat: 37.5, lng: 127 }, deps);
    expect(await res.json()).toEqual({
      where: { area: "서울특별시 강남구 역삼1동", roadAddress: "서울 강남구 테헤란로 1", address: "서울 강남구 역삼동 1-1", source: "kakao" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("/route/walk", () => {
  it("calls TMAP with the app key and normalizes the route", async () => {
    const { deps, fetchMock } = setup(() => tmapResp);
    const res = await call("/route/walk", { from: { lat: 37.5, lng: 127.0 }, to: { lat: 37.502, lng: 127.001 }, via: [{ lat: 37.501, lng: 127.0 }] }, deps);
    expect(res.status).toBe(200);
    const { route } = (await res.json()) as { route: ReturnType<typeof normalizeTmap> };
    expect(route.provider).toBe("tmap");
    expect(route.distanceM).toBe(330);
    expect(route.durationS).toBe(250);
    expect(route.polyline).toHaveLength(5); // duplicate joints removed
    expect(route.steps.map((s) => s.turn)).toEqual(["start", "right", "arrive"]); // PP dropped
    expect(route.steps[1]).toMatchObject({ instruction: "우회전 후 100m 이동", instructionEn: "Turn right", pathIndex: 2 });
    expect(route.steps[1]!.distanceToNextM).toBeGreaterThan(80);
    expect(route.steps[0]!.distanceToNextM).toBeGreaterThan(200);
    expect(route.steps[2]!.pathIndex).toBe(4);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("apis.openapi.sk.com/tmap/routes/pedestrian");
    expect((init!.headers as Record<string, string>).appKey).toBe("tmap-key-xyz");
    const sent = JSON.parse(String(init!.body));
    expect(sent).toMatchObject({ startX: 127, startY: 37.5, endX: 127.001, endY: 37.502, reqCoordType: "WGS84GEO", resCoordType: "WGS84GEO", passList: "127,37.501" });
  });

  it("validates input and handles empty provider output", async () => {
    const { deps } = setup(() => ({ features: [] }));
    expect((await call("/route/walk", { from: { lat: 37, lng: 127 } }, deps)).status).toBe(400);
    expect((await call("/route/walk", { from: { lat: 37, lng: 127 }, to: { lat: 37.1, lng: 127 } }, deps)).status).toBe(502);
  });

  it("maps turn types", () => {
    expect(mapTurnType(12)).toBe("left");
    expect(mapTurnType(211)).toBe("crosswalk");
    expect(mapTurnType(9999)).toBe("other");
  });
});

describe("/llm", () => {
  const anthropicReply = (text: string, usage = { input_tokens: 412, output_tokens: 57 }) => ({
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-haiku-5-5",
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage,
  });
  const keyed = (over: Partial<Env> = {}) => env({ ANTHROPIC_API_KEY: "sk-ant-test-key", ...over });
  const qa = { task: "travel_qa", input: { question: "언제 지었어요?", lang: "ko", landmarkName: "경복궁", sourceText: "경복궁은 1395년에 지었어요." } };

  it("needs a token, a known task and a valid input; answers 503 without a key", async () => {
    const { deps, fetchMock } = setup(() => ({}));
    expect((await call("/llm", qa, deps, keyed(), null)).status).toBe(401);
    expect((await call("/llm", { task: "chat", input: {} }, deps, keyed())).status).toBe(400);
    expect((await call("/llm", { messages: [] }, deps, keyed())).status).toBe(400);
    expect((await call("/llm", { task: "travel_qa", input: { question: 1 } }, deps, keyed())).status).toBe(400);
    expect((await call("/llm", qa, deps, env())).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("builds the prompt server-side and sends a structured-output request to Anthropic", async () => {
    const out = JSON.stringify({ answerable: true, answer: "1395년에 지었어요.", quote: "경복궁은 1395년에 지었어요." });
    const { deps, fetchMock } = setup(() => anthropicReply(out));
    const res = await call("/llm", qa, deps, keyed());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ text: out, promptTokens: 412, completionTokens: 57 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/messages");
    const headers = new Headers(init.headers);
    expect(headers.get("authorization") ?? headers.get("x-api-key")).toContain("sk-ant-test-key");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("claude-haiku-5-5");
    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body.temperature).toBeUndefined();
    expect(body.output_config.format.type).toBe("json_schema");
    expect(body.output_config.format.schema.properties.answerable).toBeTruthy();
    expect(body.system).toContain("ONLY the source text");
    expect(body.messages[0].content).toContain("question: 언제 지었어요?");
  });

  it("honours LLM_MODEL", async () => {
    const { deps, fetchMock } = setup(() => anthropicReply("{}"));
    await call("/llm", qa, deps, keyed({ LLM_MODEL: "claude-sonnet-5-5" }));
    expect(JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string).model).toBe("claude-sonnet-5-5");
  });

  it("maps upstream failures to 502 and never leaks the key or the input", async () => {
    const { deps } = setup(() => ({ type: "error", error: { type: "api_error", message: "boom sk-ant-test-key" } }), 500);
    const res = await call("/llm", qa, deps, keyed());
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).not.toContain("sk-ant");
    expect(text).not.toContain("경복궁");
  });

  it("maps a 429 from the provider to 502 with the upstream status", async () => {
    const { deps } = setup(() => ({ type: "error", error: { type: "rate_limit_error", message: "slow down" } }), 429);
    const res = await call("/llm", qa, deps, keyed());
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ error: "upstream_error", status: 429 });
  });

  it("logs task, tokens and latency but not the question, the answer or the key", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { deps } = setup(() => anthropicReply('{"answerable":false,"answer":"","quote":""}'));
    await call("/llm", qa, deps, keyed());
    const logged = spy.mock.calls.map((c) => String(c[0])).join("\n");
    spy.mockRestore();
    expect(logged).toContain('"task":"travel_qa"');
    expect(logged).toContain('"promptTokens":412');
    expect(logged).toContain('"completionTokens":57');
    expect(logged).toMatch(/"ms":\d+/);
    expect(logged).not.toContain("언제");
    expect(logged).not.toContain("sk-ant");
  });
});

describe("logging", () => {
  it("logs metadata only", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { deps } = setup(() => kakaoSearch);
    await call("/places/search", { lat: 37.123456, lng: 127.654321, category: "cafe", query: "secret-query" }, deps);
    const logged = spy.mock.calls.map((c) => String(c[0])).join("\n");
    spy.mockRestore();
    expect(logged).toContain('"path":"/places/search"');
    expect(logged).toContain('"status":200');
    expect(logged).not.toMatch(/37\.123|127\.654|secret-query|kakao-key|Bearer/);
  });
});
