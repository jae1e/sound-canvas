# sound-canvas

A workspace for market studies and product prototypes. The first product implementation is **Voice Life Companion**, a hands-free voice companion for walking navigation, cooking and workout sessions, vocal practice, and journaling, in Korean and English.

- Product brief: [docs/products/voice-life-companion/README.md](docs/products/voice-life-companion/README.md)
- Technical decisions: [docs/products/voice-life-companion/technical-decisions.md](docs/products/voice-life-companion/technical-decisions.md)
- Market studies: [docs/market-studies/](docs/market-studies/)

## Workspace

| Path | Contents |
| --- | --- |
| `packages/session-engine` | Pure TypeScript session engine: state, validated actions, plan steps and navigation, scheduler, nudges and cue planner, Korean/English Tier 0 command parser, deterministic spoken summaries, spoken message templates, zod session schema, example plan templates |
| `apps/mobile` | Expo (React Native) app, Android first. expo-router screens in `app/` (Home, Work Partner, Journal, Settings, Settings/Diagnostics; Travel Guide and Voice Coach are placeholders until M3/M2). Code in `src/`: `db/` (expo-sqlite + Drizzle schema, migrations, repositories), `work/` (Work Partner controller and UI), `settings/`, `journal/`, `i18n/` (ko/en), `llm/` (M4 stub) |
| `apps/mobile/modules/vlc-session-service` | Local Expo module (Kotlin; Swift later): combined foreground service, audio capture and routing, sherpa-onnx VAD/STT, TTS, cue timer, location, diagnostics log. Week-1 spike: see [apps/mobile/SPIKE.md](apps/mobile/SPIKE.md) |
| `services/` | Cloudflare Worker proxy for cloud providers. Not yet created |
| `scripts/android-env.sh` | Environment for the locally installed JDK 17 and Android SDK |

## Commands

```bash
pnpm install
pnpm test        # all package tests (engine, and the app's pure logic with sql.js)
pnpm typecheck   # all packages

# After changing apps/mobile/src/db/schema.ts, generate a migration (committed under src/db/migrations)
cd apps/mobile && pnpm db:generate

# Android development build on a connected phone
source scripts/android-env.sh
cd apps/mobile && npx expo run:android
```

Requirements: Node.js 24, pnpm (via corepack), JDK 17, and the Android SDK (`scripts/android-env.sh` expects `~/.local/jdk-17` and `~/Android/Sdk`).
