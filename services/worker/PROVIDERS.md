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
