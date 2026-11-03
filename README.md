# sound-canvas

A workspace for market studies and product prototypes. The first product implementation is **Voice Life Companion**, a hands-free voice companion for walking navigation, cooking and workout sessions, vocal practice, and journaling, in Korean and English.

- Product brief: [docs/products/voice-life-companion/README.md](docs/products/voice-life-companion/README.md)
- Technical decisions: [docs/products/voice-life-companion/technical-decisions.md](docs/products/voice-life-companion/technical-decisions.md)
- Market studies: [docs/market-studies/](docs/market-studies/)

## Workspace

| Path | Contents |
| --- | --- |
| `packages/session-engine` | Pure TypeScript session engine: state, validated actions, scheduler, Korean/English Tier 0 command parser, spoken message templates |
| `apps/mobile` | Expo (React Native) app, Android first |
| `apps/mobile/modules/vlc-session-service` | Local Expo module (Kotlin; Swift later): combined foreground service, audio capture and routing, sherpa-onnx VAD/STT, TTS, cue timer, location, diagnostics log. Week-1 spike: see [apps/mobile/SPIKE.md](apps/mobile/SPIKE.md) |
| `services/` | Cloudflare Worker proxy for cloud providers. Not yet created |
| `scripts/android-env.sh` | Environment for the locally installed JDK 17 and Android SDK |

## Commands

```bash
pnpm install
pnpm test        # all package tests
pnpm typecheck   # all packages

# Android development build on a connected phone
source scripts/android-env.sh
cd apps/mobile && npx expo run:android
```

Requirements: Node.js 24, pnpm (via corepack), JDK 17, and the Android SDK (`scripts/android-env.sh` expects `~/.local/jdk-17` and `~/Android/Sdk`).
