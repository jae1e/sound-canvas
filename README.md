# sound-canvas

A workspace for market studies and product prototypes. The first product implementation is **Voice Life Companion**, a hands-free voice companion for walking navigation, cooking and workout sessions, vocal practice, and journaling, in Korean and English.

- Product brief: [docs/products/voice-life-companion/README.md](docs/products/voice-life-companion/README.md)
- Technical decisions: [docs/products/voice-life-companion/technical-decisions.md](docs/products/voice-life-companion/technical-decisions.md)
- Market studies: [docs/market-studies/](docs/market-studies/)

## Workspace

| Path | Contents |
| --- | --- |
| `packages/session-engine` | Pure TypeScript session engine: state, validated actions, plan steps and navigation, scheduler, nudges and cue planner, workout/poomsae routines (model, pacing timeline, setup and live-command parsers, correction notes, Taegeuk 1), Korean/English Tier 0 command parser, deterministic spoken summaries, spoken message templates, zod session schema, example plan templates |
| `apps/mobile` | Expo (React Native) app, Android first. expo-router screens in `app/` (Home, Work Partner, Travel Guide, Voice Coach, Journal, Settings, Settings/Diagnostics). Code in `src/`: `db/` (expo-sqlite + Drizzle schema, migrations, repositories), `work/` (Work Partner controller and UI), `routine/` (routine controller, pacing, screens), `settings/`, `journal/`, `i18n/` (ko/en), `llm/` (task routing through the Worker `/llm` route, confirmation, fallback) |
| `apps/mobile/modules/vlc-session-service` | Local Expo module (Kotlin; Swift later): combined foreground service, audio capture and routing, sherpa-onnx VAD/STT, TTS, cue timer, location, diagnostics log. Week-1 spike: see [apps/mobile/SPIKE.md](apps/mobile/SPIKE.md) |
| `apps/mobile/modules/vlc-voice-coach` | Local Expo module (Kotlin): own `AudioRecord`, real-time f0 tracker, WAV takes, offline analysis, playback |
| `packages/voice-analysis` | Pure TypeScript pitch/speech metrics and take summaries (ko/en) |
| `packages/llm` | `@vlc/llm`, pure TypeScript LLM tier shared by the app, the Worker and the simulator: `LlmBackend` interface, five tasks (`align`, `command`, `routine_setup`, `correction`, `travel_qa`) with prompts, JSON schemas and validators mapped to engine actions, routing, Anthropic and llama-server backends |
| `tools/llm-sim` | Eval set (174 labelled cases), scenario simulations and an optional local llama.cpp stand-in; see [tools/llm-sim/README.md](tools/llm-sim/README.md) |
| `packages/travel` | Pure TypeScript travel logic: geo, route tracker, cues, intents, spoken answers |
| `apps/field-log` | **Field Voice Log** (industrial voice logging MVP, slice 1): Expo app with memo chooser (take photo / pick image / voice only), recording screen with live grey draft and final per-segment text, settings and enrolment. `src/core/` pure logic (canonical JSON, hash-chained outbox events, sync planner, draft/final merge), `src/db/` expo-sqlite outbox, `src/sync/` client. Native module `modules/fl-native` (Kotlin): microphone foreground service, crash-safe 16 kHz WAV segments with SHA-256 and signal-quality metrics, journal, live WebSocket draft streamer. Contract: [api-v0.md](docs/products/industrial-voice-logging/api-v0.md) |
| `services/field-log-server` | Field Voice Log server (Python, uv, FastAPI, SQLite), bound to the tailnet address only, device-token auth. Final ASR Qwen3-ASR-1.7B on the GPU, live draft Nemotron 3.5 streaming (sherpa-onnx) on the CPU. See its [README](services/field-log-server/README.md) |
| `services/worker` | Cloudflare Worker proxy for Kakao Local / walking routes (not deployed yet; the app uses mock data until configured) |
| `apps/mobile/TESTING.md` | On-device test checklist for the three modes |
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
