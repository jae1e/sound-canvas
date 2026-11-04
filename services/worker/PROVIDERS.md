# Provider verification

Checked on 2026-11-03. Labels: [V] read on an official page during this check, [3P] third-party source, [U] unverified/recalled, to confirm before relying on it.

## Kakao Local (places and "where am I")

Source: https://developers.kakao.com/docs/ko/local/dev-guide (fetched 2026-11-03).

- [V] Keyword search: `GET https://dapi.kakao.com/v2/local/search/keyword.json`. Params: `query` (required), `category_group_code`, `x`, `y`, `radius` (0-20000 m), `rect`, `page` (1-45), `size` (1-15, default 15), `sort` (`accuracy` default or `distance`; `distance` needs `x`,`y`).
- [V] Category search: `GET .../search/category.json`. `category_group_code` required; other params as above.
- [V] Response `documents[]`: `id`, `place_name`, `category_name`, `category_group_code`, `category_group_name`, `phone`, `address_name`, `road_address_name`, `x` (lng), `y` (lat), `place_url`, `distance` (meters, only when `x`,`y` are sent). `meta.pageable_count` is capped at 45.
- [V] `GET .../geo/coord2address.json` (`x`,`y`): `address` (lot number) and `road_address` (may be absent). `GET .../geo/coord2regioncode.json`: `region_type` `H` (administrative) or `B` (legal) with `region_1depth_name`..`region_3depth_name`.
- [V] Category group codes: MT1 mart, CS2 convenience store, PS3 daycare, SC4 school, AC5 academy, PK6 parking, OL7 gas/EV charging, SW8 subway, BK9 bank, CT1 culture, AG2 real estate, PO3 public institution, AT4 tourist attraction, AD5 lodging, FD6 restaurant, CE7 cafe, HP8 hospital, PM9 pharmacy.
- Auth: `Authorization: KakaoAK {REST_API_KEY}` (used by the Worker).
- Quotas: the dev-guide page links to a separate quota page and does not state numbers. Earlier research said 100,000/day for keyword and category search [3P/earlier, unverified here]; check the quota page in the Kakao Developers console.
- Terms: the page states no caching or display/attribution rules and links to the Kakao Business terms and operation policy. [U] Read those before shipping. The Worker does not cache provider responses, and the spoken answer says "Based on Kakao place data" as a precaution.

## Walking route: does a Kakao pedestrian API exist?

Result: **partly**. The path `dapi.kakao.com/v2/routing/walk` from earlier research could not be confirmed and is probably wrong.

- [V] Kakao Mobility publishes an "affiliate" **Walking Directions** API: `GET https://apis-navi.kakaomobility.com/affiliate/walking/v1/directions` (REST key in `Authorization: KakaoAK`, plus a `service` header; `origin`/`destination` as `lng,lat`; up to 5 waypoints; `priority` DISTANCE or MAIN_STREET; `default_speed` default 4 km/h; `summary` flag; response has `trans_id`, `routes`, `result_code`). It needs a Kakao Business account and app registration approved by Kakao Mobility. Docs: https://developers.kakaomobility.com/affiliate-en/walking/directions and https://developers.kakaomobility.com/affiliate-en/walking/start (via search result summaries; the pages redirect to a port-3000 host that the fetch tool could not open, so the nested `sections`/`guides` schema was not read).
- [V] Kakao Developers notice (https://devtalk.kakao.com/t/api-notice-on-new-kakao-map-api-features-and-free-quota-policy/150222): a new "walking route lookup" Kakao Map API takes effect 2026-07-21, 1,000 free requests/day for the first app per developer account, then 10 KRW per request (Biz Wallet required). The notice does not give the endpoint; it says to check the Kakao Developers docs after the effective date.
- Decision: the walking provider sits behind `WalkProvider` (`src/providers/types.ts`). **TMAP pedestrian is implemented as the primary**, as instructed. A Kakao walking provider is a follow-up once the user confirms which Kakao endpoint their account can use (Kakao Developers new walking API vs Kakao Mobility affiliate). Add a class next to `tmap.ts` and select it in `providersFor` in `src/index.ts`.

## TMAP pedestrian route (implemented)

- [3P] Endpoint `POST https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1`, header `appKey`, JSON body `startX,startY,endX,endY` (lng/lat order; a blog author reported swapping them), `passList` (`lng,lat_lng,lat`, up to 5), `reqCoordType`, `resCoordType`, `startName`, `endName`. Source: https://velog.io/@ghenmaru/TMAP-TMAP-API-도보-길찾기 (fetched 2026-11-03). Response is GeoJSON with `LineString` and `Point` features.
- [U] The Point `properties` (`pointType` SP/GP/PP/EP, `turnType`, `description`, first feature `totalDistance`/`totalTime`) and the `turnType` table in `src/providers/tmap.ts` (11 straight, 12 left, 13 right, 14 U-turn, 16-19 oblique turns, 125 overpass, 126 underpass, 127/129 stairs, 200 start, 201 end, 211-217 crosswalk, 218 elevator) are recalled from the SK Open API reference. The official pages (https://openapi.sk.com, https://tmapapi.tmapmobility.com) could not be read by the fetch tool. **Verify against the official table with a real key** and adjust `mapTurnType`.
- [3P] Pricing/quota: https://openapi.sk.com/products/calc?svcSeq=4&menuSeq=5 shows a free tier of about 1,000 calls/day for Road APIs; which row covers the pedestrian API is not stated. Earlier research also noted terms that restrict storing results beyond 24 hours [unverified]. The Worker stores nothing. The app must not persist provider route responses long-term; save only its own GPS trace (see technical-decisions section 6).
- Coordinates: the Worker requests `WGS84GEO` for both request and response, so no projection conversion is needed.

## Google

No walking directions in Korea. Not used.

# Landmark discovery providers (added 2026-11-04)

Checked on 2026-11-04. Labels as above: [V] read on an official page during this check, [3P] third-party reference, [U] unverified/recalled. **No API key was available, so no endpoint was called live.** Response field names are [U] until a key is applied for and one response is saved.

## Korea Tourism Organization TourAPI (KorService2, EngService2)

- [V] Korean service: "한국관광공사_국문 관광정보 서비스_GW", data.go.kr id 15101578, base `https://apis.data.go.kr/B551011/KorService2`, REST, JSON or XML, real-time update, registered 2022-06-24, last modified 2026-02-26. https://www.data.go.kr/data/15101578/openapi.do
- [V] English service: "한국관광공사_영문 관광정보서비스_GW", id 15101753, base `https://apis.data.go.kr/B551011/EngService2`, last modified 2026-02-26. https://www.data.go.kr/data/15101753/openapi.do (Other languages follow the pattern, for example SpnService2 = id 15101811.)
- [V] Operations on the data.go.kr page (names only): location-based list = `locationBasedList2`, common info = `detailCommon2`, intro info = `detailIntro2`. [3P] TourAPI 4.0 manual Ver 4.3 (2025-05-12) per https://skills.sh/2sem/kto-tourapi-korservice2-skill/kto-tourapi-korservice2.
- [V] Parameters on the data.go.kr page. Common: `serviceKey`, `MobileOS` (IOS, AND, WIN, ETC), `MobileApp`, optional `numOfRows`, `pageNo`, `_type=json`. `locationBasedList2`: required `mapX` (WGS84 longitude), `mapY` (latitude), `radius` (m, max 20000); optional `arrange`, `contentTypeId`, `modifiedtime`, `lDongRegnCd`, `lDongSignguCd`, `lclsSystm1..3`. `detailCommon2`: required `contentId`. `detailIntro2`: required `contentId`, `contentTypeId`. [3P] `detailCommon2` no longer accepts the legacy flags `defaultYN`, `firstImageYN`, `areacodeYN`, `catcodeYN`, `addrinfoYN`, `mapinfoYN`, `overviewYN`; the Worker does not send them. [3P] Envelope: `response.header.{resultCode,resultMsg}`, `response.body.{numOfRows,pageNo,totalCount,items.item}`; success `resultCode` is "0000" [3P]; `item` can be an object or an array; an empty result has `items: ""` [U, handled].
- [U] Item fields the Worker reads (TourAPI 4.0 names from memory): list items `contentid`, `contenttypeid`, `title`, `addr1`, `dist` (m, with `arrange=E` meaning distance order), `mapx` (lng), `mapy` (lat), `cat1..cat3`; `detailCommon2` `overview` (may contain `<br />` and entities; the Worker strips HTML); `detailIntro2` type 12: `usetime`, `restdate`, `heritage1..3`, `infocenter`, `expguide`, `spendtime`; type 14: `usetimeculture`, `restdateculture`, `usefee`, `infocenterculture`, `spendtime`. **Verify these and `arrange=E` with a real key** and adjust `src/providers/tourapi.ts` (`INTRO_FIELDS`) and `fromTour` in `src/providers/landmarks.ts`.
- [U] `contentTypeId`: 12 tourist attraction, 14 cultural facility (also 15 event, 25 travel course, 28 leisure sports, 32 lodging, 38 shopping, 39 restaurant). The pages read here did not list the codes, so this is from memory of the TourAPI 4.0 manual. The Worker queries 12 and 14 and ranks "historic" with a name/category heuristic (`isHistoric`), because the list response has no reliable historic flag.
- [V] Auth: the `serviceKey` query parameter. Store it as the Worker secret `TOUR_API_KEY`. data.go.kr issues an "Encoding" key (percent-encoded) and a "Decoding" key; the Worker accepts both (a key containing `%` is decoded once, then URL-encoded by `URLSearchParams`).
- [3P] Key issuance: apply on the data.go.kr listing ("활용신청"); development-stage use is auto-approved, operation-stage use is reviewed. The traffic limit is not shown on the listing pages read here [unverified; a commonly quoted figure is 1,000 calls per day for a development account]. One `/landmarks/nearby` call costs 2 list calls plus up to `limit` overview calls (fewer with the 1 hour cache); one `/landmarks/detail` costs 2 calls.
- Coverage note [U]: the English service has fewer items and often no `overview`; the Wikipedia fallback covers some of that. Korean and English services use different `contentid` values for the same place, so use an id with the same `lang` it came from.

### License (text) and attribution

- [V] The data.go.kr listing states: 이용허락범위 "제한 없음" (no usage restrictions), cost free. The page mentions 공공누리 only for **photos**: "공공누리 1유형, 3유형 이미지 제공됨" (Type 1 = attribution; Type 3 = attribution plus no derivative works). Photos must not defame or infringe the rights of the subject and must not be used for corporate CI/BI. The listing gives no KOGL type for the text fields (overview, intro), so the "no restrictions" statement is what applies to text. **Images are out of scope and not used.**
- Attribution policy used here: none is stated as required for text, but every response and screen label carries "출처: 한국관광공사 TourAPI (공공데이터포털)" / "Source: Korea Tourism Organization TourAPI (data.go.kr)", and the spoken answer says it is based on Korea Tourism Organization data. [U] Re-read the data.go.kr usage policy and the TourAPI operation policy before publishing the app; the policy URL guessed in this check returned 404.
- **Caching decision:** a 1 hour in-memory cache for `/landmarks/detail` description text only (TourAPI and Wikipedia), because "no restrictions" and CC BY-SA allow reuse and it saves the daily quota. Kakao responses and coordinate-keyed lists are not cached. The cache is per isolate and bounded to 200 entries.

## Kakao Local category AT4 (tourist attractions)

- [V] See the Kakao section above: `GET /v2/local/search/category.json` with `category_group_code=AT4`, `x`, `y`, `radius`, `sort=distance` returns `place_name`, `category_name` (for example "여행 > 관광,명소 > 고궁" [U] exact tree text), `x`, `y`, `distance`. Kakao supplements TourAPI: hits within 60 m of, or with a name containing, a TourAPI hit are dropped. Kakao has no description text; the `oneLine` for a Kakao-only hit is its leaf category.
- Same terms caveat as above: caching and display terms were not on the dev-guide page, so nothing from Kakao is cached.

## Wikipedia REST summary (optional fallback)

- [V] `GET https://{ko|en}.wikipedia.org/api/rest_v1/page/summary/{title}` returned JSON with `type`, `title`, `extract`, `extract_html`, `description`, `coordinates`, `content_urls.desktop.page`, `thumbnail` (checked 2026-11-04 with the title 경복궁). https://ko.wikipedia.org/api/rest_v1/page/summary/경복궁
- [3P/U] Text is CC BY-SA 4.0 (attribution and share-alike); the summary response has no license field. Used only when TourAPI has no `overview` (or for a Kakao-only place with a name); labeled "Source: Wikipedia (CC BY-SA 4.0)" with `sourceUrl`, and spoken as "based on a Wikipedia summary". The lookup is by exact title, so it misses some names (best effort, returns null). The Worker sends a descriptive `User-Agent` as Wikimedia asks.
