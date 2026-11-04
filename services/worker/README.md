# @vlc/worker: Voice Life Companion Cloudflare Worker

A thin proxy that keeps API keys off the device. Endpoints (all `POST`, JSON, `Authorization: Bearer <token>`, except `GET /health`):

| Path | Request | Response |
| --- | --- | --- |
| `/places/search` | `{lat, lng, query?, category?, radiusM=500, limit=5}` (`category` is a key such as `cafe` or a Kakao code such as `CE7`; with neither, it searches cafes, restaurants, convenience stores, attractions and subway stations) | `{places: Place[]}` sorted by distance |
| `/places/where` | `{lat, lng}` | `{where: {area, roadAddress?, address?, source}}` |
| `/route/walk` | `{from, to, via?}` (each `{lat, lng}`, up to 5 via points) | `{route: {provider, polyline, distanceM, durationS, steps[]}}` |
| `/landmarks/nearby` | `{lat, lng, radiusM=1500, lang='ko', limit=3, theme='historic'}` (`theme` is `historic` or `any`) | `{landmarks: Landmark[]}`: `id`, `name`, `category`, `distanceM`, `lat`, `lng`, `oneLine`, `source`, `attribution`; nearest first. TourAPI plus Kakao AT4 |
| `/landmarks/detail` | `{id, lang='ko', name?}` (`id` from `/landmarks/nearby`; `name` enables the Wikipedia fallback) | `{detail: {id, lang, overview, facts[], source, attribution, sourceUrl?}}`; `overview` is plain text |
| `/llm` | `{task, input}` where `task` is one of `align`, `command`, `routine_setup`, `correction`, `travel_qa` and `input` is that task's structured input (see `packages/llm`) | `{text, promptTokens, completionTokens, ms}`: the model's JSON output as text. The app validates it with the same `@vlc/llm` task validator and applies nothing the engine rejects. `503` without `ANTHROPIC_API_KEY`, `504` on provider timeout, `502` on provider error |

Types live in `@vlc/travel` (`Place`, `WalkRoute`, `WhereAmI`). Provider facts and verification dates are in [PROVIDERS.md](PROVIDERS.md). Providers sit behind the `PlacesProvider` and `WalkProvider` interfaces in `src/providers/types.ts`.

## Security model

- **Tokens:** `<installId>.<hex HMAC-SHA256(installId, TOKEN_SIGNING_SECRET)>`. The Worker is stateless: no allowlist to maintain. Mint a token with `TOKEN_SIGNING_SECRET=... pnpm --filter @vlc/worker mint-token [installId]`. A future registration endpoint can mint tokens per install; for now mint one by hand and put it in the app config. To revoke everything, rotate the secret.
- **Rate limit:** fixed-window counters per install id (30 per minute and 2000 per day by default, `RATE_LIMIT_PER_MIN` / `RATE_LIMIT_PER_DAY`), stored in the `RATE_LIMIT` KV namespace. Chosen because it is the simplest option; KV is not atomic, so heavy concurrency can overshoot slightly. Without the binding, an in-memory per-isolate counter is used (dev and tests only).
- **Logging:** one line per request with `path`, `status` and `ms`. Never coordinates, queries, tokens or keys. Error bodies never echo input values.
- Provider responses are not stored or cached, with one exception: `/landmarks/detail` keeps TourAPI and Wikipedia description text for 1 hour (max 200 entries, per Worker isolate, memory only). Their terms allow reuse (see PROVIDERS.md). Kakao results and anything keyed by coordinates are never cached.

## LLM route design

- **Prompt location:** the Worker builds the prompt and JSON schema from `@vlc/llm`; the client sends only `{task, input}`. One source of truth for prompts, the eval measures what ships, and a stolen install token cannot be used as a generic model proxy (the system prompt and output schema are fixed per task, inputs are length-limited).
- **Provider adapter:** `src/providers/llm.ts` returns an `LlmBackend`. The first adapter is Anthropic (`@anthropic-ai/sdk`, structured JSON output via `output_config.format`, thinking disabled, effort low, no sampling parameters because Claude Haiku 5.5 rejects non-default ones). Model: `LLM_MODEL` (default `claude-haiku-5-5`). Upstream timeout: `LLM_TIMEOUT_MS` (default 5000; the app gives up after about 2.5 s on its own).
- **Logging:** per request `task`, `provider`, `promptTokens`, `completionTokens`, `backendMs`, `ms`. Never the question, answer or key.

## Local development

```
pnpm install
cp services/worker/.dev.vars.example services/worker/.dev.vars   # fill in keys
pnpm --filter @vlc/worker dev          # wrangler dev on http://localhost:8787
pnpm --filter @vlc/worker test         # Vitest with mocked fetch, no network
```

## Deploy to your Cloudflare account (nothing here has been deployed)

1. Create a Cloudflare account (free plan is enough) and run `npx wrangler login`.
2. Create the KV namespace: `npx wrangler kv namespace create RATE_LIMIT`, then uncomment the `[[kv_namespaces]]` block in `wrangler.toml` and paste the id.
3. Set secrets from `services/worker`:
   ```
   npx wrangler secret put KAKAO_REST_KEY        # Kakao Developers > app > REST API key
   npx wrangler secret put TOUR_API_KEY         # data.go.kr service key for Korea Tourism Organization TourAPI (the "Decoding" key; an "Encoding" key is accepted too)
   npx wrangler secret put TMAP_APP_KEY          # SK Open API (openapi.sk.com) app key
   npx wrangler secret put ANTHROPIC_API_KEY     # console.anthropic.com API key, for /llm only
   npx wrangler secret put TOKEN_SIGNING_SECRET  # long random string, e.g. openssl rand -hex 32
   ```
4. `npx wrangler deploy`. Note the `https://vlc-worker.<subdomain>.workers.dev` URL.
5. Mint an app token: `TOKEN_SIGNING_SECRET=<same secret> pnpm --filter @vlc/worker mint-token`.
6. Put the URL and token into the mobile app config (`extra.travel` in `apps/mobile/app.json`; see `apps/mobile/src/travel/config.ts`).
7. Smoke test: `curl -H "Authorization: Bearer <token>" -d '{"lat":37.4979,"lng":127.0276}' https://<worker>/places/where`.

TourAPI setup: on https://www.data.go.kr search "한국관광공사_국문 관광정보 서비스_GW" and "한국관광공사_영문 관광정보서비스_GW", click the application button (활용신청) for each, and use the issued key. Without `TOUR_API_KEY` the landmark endpoints still work from Kakao AT4 alone, with descriptions only from the Wikipedia fallback.

Kakao setup: enable the Kakao Local API for the app in Kakao Developers and check the quota page. TMAP: create an SK Open API app and enable the pedestrian route API.
