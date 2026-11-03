# Technical Decisions and Stack Proposal

Updated: November 3, 2026
Authority: [product brief](README.md) and [implementation handoff](implementation-handoff.md)
Status: user constraints and test devices recorded. Framework decided: Expo / React Native with TypeScript, Android first, iPhone later. Other choices are proposed, pending bake-offs or user facts. No code has been written.

Labels used below:

- **Decided (user):** explicitly stated by the user.
- **Proposed:** assistant recommendation; adopt unless the user objects or a bake-off disproves it.
- **Open:** needs a user fact or a physical-device test.

Evidence labels for facts: **[V]** vendor documentation or pricing page, **[VC]** vendor claim (marketing/benchmark), **[3P]** third-party source, **[Est]** assistant estimate, **[U]** unverified. Research date for all sources: November 3, 2026.

## 1. User Constraints (Decided)

| ID | Constraint |
| --- | --- |
| T01 | Android only for development and testing (Samsung Galaxy class). No iOS work in the first build. |
| T02 | App framework must be Flutter (Dart) or React Native (TypeScript). The user asked which is easier to deploy to their own phone with GPS, audio, and background support. |
| T03 | Korean and English for voice and UI. |
| T04 | Prefer on-device speech and processing; use cloud when needed. |
| T05 | Speed (latency) and cost efficiency are very important. |
| T06 | Consider non-Claude LLMs, including GPT and cheaper providers, and on-device STT/TTS. |
| T07 | iPhone support comes later, not in the first build. Keep the architecture portable to iOS. |
| T08 | Use Expo (React Native, TypeScript), because it is the better fit once later iPhone support is considered. The user previously found downloading builds from Cloudflare convenient. |

| T09 | Development phone: Samsung Galaxy S25, model SM-S931N (Korean domestic variant), **Android 17 (API 37)**, build CP2A.260605.016.S931NKSSDDZJ2 (read via adb on 2026-11-03). The research above covered Android 14–16 behavior; re-check Android 17 background, audio, and foreground-service changes during the spike. |
| T10 | Earbuds: a QCY model the user owns (exact model not recorded), and Galaxy Buds that the user plans to buy (model not chosen). |
| T11 | Primary walking area: South Korea. |
| T12 | The user can create the needed accounts: Expo, Kakao Developers, cloud LLM providers, and Cloudflare. |

### 1.1 Device implications for the Galaxy S25 (from the November 3, 2026 research)

| Capability | Status on S25 | Consequence |
| --- | --- | --- |
| ML Kit GenAI Text-to-Speech (ko-KR) | S25 listed as supported [V] | Primary TTS candidate |
| ML Kit GenAI Speech Recognition | Basic mode works on API 31+, and ko-KR is beta there. Advanced mode needs Gemini Nano devices (S26, Fold8/Flip8), so not the S25 [V] | Basic mode joins the STT bake-off. Advanced mode is unavailable |
| Gemini Nano Prompt API | S25 not listed (only summarize, proofread, rewrite, and describe APIs) [V] | No free system on-device LLM. Tier 1 would mean Gemma 4 E2B via LiteRT-LM, or Qwen3 via ExecuTorch |
| Gemma 4 E2B | No S25 benchmark found. On the S26 Ultra GPU: 52 tokens/s, first token 0.3 s [V] | Measure on the S25 (Snapdragon 8 Elite for Galaxy). Tier 1 stays optional |
| Android on-device `SpeechRecognizer` (ko-KR) | Unknown [U] | Check `RecognitionSupport` at runtime during the spike |
| QCY earbuds | Classic Bluetooth headset profile is likely, so the mic is narrowband [U] | Test conversation STT accuracy over the QCY mic against the phone mic. Use the phone mic for vocal takes |
| Galaxy Buds | Assistant gesture (pinch and hold) documented on recent models [V]. LE Audio support depends on the model [U] | Prefer a model with LE Audio support if the purchase is still open. Test both the assistant gesture and in-session media buttons |

## 2. Framework: Expo / React Native with TypeScript (Decided)

History: the assistant first recommended Flutter for an Android-only build. That recommendation rested mostly on Android-specific points. Once the user said iPhone support would come later and asked about TypeScript, the assistant recommended Expo, and the user accepted on that basis (T08).

What Expo is: a framework and toolchain on top of React Native. It provides prebuilt native modules, generates the native projects from configuration (prebuild and config plugins), and offers cloud build and update services (EAS). Expo Go, the store sandbox app, cannot load this app's custom native code, so development uses a **development build** of our own app.

Why Expo here:

1. **One language** across the app, the Cloudflare Worker proxy, and the evaluation tools. The session engine, tool schemas, and types are shared directly.
2. **iOS from Linux.** EAS Build compiles iOS on cloud macOS workers. The free plan includes 15 Android and 15 iOS builds; the page does not state the period [V: expo.dev/pricing, 2026-11-03]. Flutter iOS builds require a Mac or a third-party CI.
3. **Updates without reinstalling.** `expo-updates` ships JavaScript changes over the air. Use Expo's hosted service (free plan: 1,000 monthly active users [V]) or a self-hosted server that implements the Expo Updates protocol [V: docs.expo.dev/distribution/custom-updates-server]. Self-hosting needs request handling, not just static files [V: the docs mention selecting updates by headers], so on Cloudflare it would be a Worker plus R2. Expo's example server: [expo/custom-expo-updates-server](https://github.com/expo/custom-expo-updates-server).
4. **Native modules in Kotlin and Swift.** The Expo Modules API covers the native pieces this app needs on either OS.

Architecturally, Flutter and Expo are equivalent for this app. Both call Kotlin/Swift through wrappers: Flutter plugins over platform channels, Pigeon, or FFI, and Expo modules over JSI. Background capability comes from that native layer in both. The practical difference is which wrappers already exist: Flutter has an official sherpa-onnx plugin, and neither framework has a ready-made combined foreground service, Bluetooth input routing, or ML Kit GenAI speech bridge. The user confirmed Expo after this comparison.

Costs accepted with this choice:

- There is no official sherpa-onnx React Native binding. Wrap the official sherpa-onnx Kotlin (and later Swift) APIs in our own Expo module. The community TurboModule [XDcobra/react-native-sherpa-onnx](https://github.com/XDcobra/react-native-sherpa-onnx) (streaming STT and TTS, Expo config plugin, breaking changes at 0.3.0) can be evaluated for speed of prototyping [3P].
- Expo's location and audio modules each start their own foreground service. This app needs one combined service, so we write it ourselves (see §2.1).
- Notifee is archived [3P]; use `expo-notifications`.
- No `flutter_gemma` equivalent for Gemma 4. The optional on-device LLM tier uses `react-native-executorch` (Qwen3, Llama 3.2, LFM2.5) [V] or a custom LiteRT-LM Kotlin module.

### 2.1 Native/JS split (Proposed)

Real-time audio and anything that must keep running with the screen locked lives in native code. TypeScript is the "brain".

| Layer | Location | Responsibility |
| --- | --- | --- |
| `vlc-session-service` (Expo module, Kotlin) | Native | One foreground service with types `location|microphone|mediaPlayback`, started from a visible activity or notification action. Hosts audio capture, VAD, streaming STT, the TTS playback queue, fused location updates, and a native due-event timer that wakes JS. Emits events (partial/final transcript, location fix, route changes, TTS done) to JS |
| `vlc-audio-route` (Expo module, Kotlin) | Native | Input/output device listing and selection (`setCommunicationDevice`), route-change events, capture modes: conversation (`VOICE_COMMUNICATION`, 16 kHz PCM) and vocal take (`MIC`/unprocessed, 48 kHz AAC/WAV file) |
| `vlc-speech` (Expo module, Kotlin) | Native | sherpa-onnx (Silero VAD, Korean/English streaming zipformer), ML Kit GenAI STT/TTS bridges, Android `TextToSpeech` fallback, phrase cache |
| Session engine (`packages/session-engine`) | TypeScript, pure | Entities, validated operations, revisions, scheduler logic, Tier 0 parser. No React Native imports; tested with fake timers |
| App (`apps/mobile`) | TypeScript, React Native | UI, intent router, speech coordinator, persistence, provider adapters |

Each native module exposes the interface on both platforms. The Swift versions are written when iPhone support starts (§2.3).

### 2.2 Core packages (Proposed; pin versions at setup)

| Concern | Package / API |
| --- | --- |
| App framework | Expo SDK (current: SDK 57 on React Native 0.86, released 2026-06-30 [V]), New Architecture, TypeScript strict |
| Navigation | `expo-router` |
| UI state | Zustand (domain state lives in the session engine) |
| Database | `expo-sqlite` + Drizzle ORM (typed schema, migrations) |
| Foreground service, location, audio pipeline | Custom Expo modules (§2.1). `expo-location` used only for permission prompts and one-off foreground fixes |
| Vocal take playback, reference audio | `expo-audio` |
| Notifications | `expo-notifications` (backup reminders; inexact when exact alarms are denied) |
| On-device speech | Own module over sherpa-onnx Kotlin API; ML Kit GenAI bridges |
| On-device LLM (optional) | `react-native-executorch` or custom LiteRT-LM module |
| Schemas | `zod`, shared by app, engine, and proxy for tool/action validation |
| Maps display | Depends on provider terms; see §6. `@maplibre/maplibre-react-native` v11 (New Architecture only) is one candidate [V] |
| i18n | `i18next` + `expo-localization` (`ko`, `en`) |
| Tests | Vitest (engine, parser), Jest/React Native Testing Library (UI), device test checklist (§10) |

### 2.3 iPhone later (Decided: deferred)

Kept portable by design: pure TypeScript engine, provider adapters, and native modules defined by interfaces. iOS work then covers background modes (`audio`, `location`), `AVAudioSession` routing, Apple speech recognition/synthesis or sherpa-onnx Swift, Foundation Models as an optional on-device LLM, App Intents/App Shortcuts (see [earbud-compatibility.md](earbud-compatibility.md)), and TestFlight distribution with an Apple Developer Program membership. iOS-specific capabilities (for example Korean availability of on-device speech APIs) were not verified in this research.

## 3. Build, Install, and Deployment (Proposed)

| Stage | Method |
| --- | --- |
| Workstation | Linux, Node.js LTS, pnpm, Android SDK, JDK 17, EAS CLI |
| First install (development build) | Either local `npx expo run:android` (builds and installs over adb), or cloud `eas build --profile development` and open the download link on the phone |
| Daily iteration | `npx expo start`; the development build connects over Wi-Fi and reloads JavaScript instantly. Rebuild only when native modules or config change |
| Personal release build | APK from `eas build --profile preview` or a local Gradle release build, signed with our keystore |
| Phone install from Cloudflare | Upload the APK to Cloudflare R2 or Pages and open the link on the phone. Allow "install unknown apps" once for the browser. Works for Android only |
| JavaScript updates | `expo-updates` to the installed release build, through Expo's hosted service at first. Optional later: self-hosted protocol server on a Cloudflare Worker + R2 |
| iPhone (later) | EAS Build on cloud macOS, TestFlight distribution. iOS cannot install an app from a plain download link |
| Later sharing | Google Play internal testing (requires a developer account and foreground-service type declarations) |
| CI (optional) | GitHub Actions: typecheck, tests, and EAS build triggers |
| Large models | Not bundled in the APK. Downloaded on first run from Cloudflare R2 (or Hugging Face) with SHA-256 verification |
| Cloud keys | Never in the app bundle. A Cloudflare Worker (TypeScript) holds provider keys, issues per-device tokens, and enforces rate and cost limits. Cloudflare has a Seoul edge, so the extra hop should be small [Est] |

A web build (PWA) on Cloudflare Pages is not a substitute. It cannot keep the microphone, GPS, and spoken cues running on a locked phone, which the core scenarios need.

Repository layout (Proposed, pnpm workspace):

```
apps/mobile/                    Expo app (UI, router, coordinator, adapters)
modules/vlc-session-service/    Expo module: combined foreground service, timers, location
modules/vlc-audio-route/        Expo module: device routing and capture modes
modules/vlc-speech/             Expo module: sherpa-onnx, ML Kit GenAI, TTS
packages/session-engine/        Pure TypeScript: entities, operations, scheduler, Tier 0 parser
packages/schemas/               zod schemas shared by app, engine, and proxy
services/proxy/                 Cloudflare Worker: LLM/STT/TTS key proxy
tools/bakeoff/                  Node/TypeScript STT and LLM evaluation scripts and fixtures
```

The repository is not currently under git. Initialize it before implementation.

## 4. Speech Pipeline

### 4.1 Turn workflow (Proposed)

```
[Earbud button / big on-screen button / VAD during active session]
        │
   Audio capture (16 kHz mono PCM, VOICE_COMMUNICATION source for AEC)
        │
   Silero VAD ── speech start → (if TTS is playing: barge-in → duck/stop TTS)
        │
   Streaming STT (on-device) → partial text (shown in UI)
        │  endpoint: ~600–800 ms trailing silence (tune for Korean)
   Final transcript + confidence
        │
   Intent router
     ├─ Tier 0: deterministic ko/en grammar with session context  (~ms, free)
     ├─ Tier 1: on-device LLM with tool schema (optional, device-dependent)
     └─ Tier 2: cloud LLM with tool schema (fallback / open-ended requests)
        │
   Candidate action(s) with expected revision
        │
   Session engine validates → commits → scheduler updates
        │
   Speech coordinator: ack text from the *committed* result (templates)
        │  priority queue; defer during vocal takes; route cues > chit-chat
   TTS (on-device) → earbuds
        │
   Event log (utterance, transcript, provider, latency, action result)
```

Rules carried from the handoff: the LLM proposes, the engine commits; acknowledgements describe committed changes only; app speech must not be recognized as user commands.

**Listening policy (Proposed):** during an active session, VAD-gated listening is on; outside sessions the mic is off. Push-to-talk is always available (screen button, earbud media button when our media session owns it). There is no reliable free Korean wake word: sherpa-onnx KWS has no Korean model [V], Porcupine supports Korean but reportedly ended its free tier on 2026-06-30 [3P], and openWakeWord has no stock Korean model [V]. A spoken prefix (for example "컴패니언," / "Companion,") can be matched in the streaming transcript as an optional filter.

**Self-echo:** default half-duplex. Suppress STT finalization while TTS plays unless AEC is active (headset or `VOICE_COMMUNICATION` source); allow barge-in on VAD speech start. Log the actual input route.

### 4.2 Latency budget (Proposed targets, to be measured)

| Segment | Target |
| --- | --- |
| End of speech → endpoint detected | 500–800 ms |
| Final STT result after endpoint | ≤ 150 ms (on-device streaming) |
| Tier 0 parse + commit | ≤ 20 ms |
| Cloud LLM (Tier 2) round trip from Korea | ≤ 800 ms p50 |
| TTS first audio | ≤ 300 ms |
| **Total, deterministic command** | **≤ 1.0 s** |
| **Total, LLM-routed request** | **≤ 2.0 s** |

### 4.3 STT (Proposed: adapter with three on-device candidates and a cloud fallback; pick by bake-off)

| Candidate | Notes |
| --- | --- |
| A. sherpa-onnx streaming zipformer, Korean (`kangkyu/icefall-asr-ko-streaming-zipformer-174m`, Apache-2.0, int8) | 7.53% CER claimed on its eval [3P]; true streaming; Korean only. Pair with an English streaming zipformer from sherpa-onnx for English sessions |
| B. ML Kit GenAI Speech Recognition (`genai-speech-recognition` alpha) | ko-KR basic mode is beta; advanced mode requires Gemini Nano devices (S26, Fold8/Flip8) [V]. Alpha API |
| C. Android `createOnDeviceSpeechRecognizer` | Korean offline availability on Galaxy must be checked at runtime (`RecognitionSupport`) [V]; unknown on hardware [U] |
| Journal re-transcription (offline, not real-time) | Moonshine tiny-ko (27M; 8.9% FLEURS CER claimed [VC]) or SenseVoice ko via sherpa-onnx, or cloud |
| Cloud fallback | `gpt-4o-mini-transcribe` per utterance, ~$0.003/min [V]: cheapest. Streaming alternatives: Deepgram Nova-3 $0.0077/min [V], ElevenLabs Scribe v2 Realtime $0.0065/min [V], Google Chirp 3 (ko-KR streaming GA) [V]. Use when on-device confidence is low or the user opts in |

Avoid providers that bill idle socket time (AssemblyAI streaming bills socket duration [3P]) unless sockets are closed between turns.

**Language selection (Proposed):** explicit per-user default with a one-tap/voice toggle per session. Automatic language identification is not in the first build. Korean speech with English loanwords is handled by the Korean model; verify on fixtures.

### 4.4 TTS (Proposed)

| Tier | Choice |
| --- | --- |
| Primary | ML Kit GenAI Text-to-Speech (ko-KR supported; Galaxy S25/S26/Fold8/Flip8; alpha) [V] if the device qualifies |
| Fallback | Android `TextToSpeech` with Samsung or Google Korean/English voices (free, offline) |
| Cache | Pre-render frequent templated phrases ("3분 지났어요", "One minute left") per voice to remove synthesis latency |
| Optional cloud voice | Azure Neural $15/1M chars (~$0.02 per session of 1,500 chars) [V] as the cheapest natural Korean option; ElevenLabs Flash $40/1M (~75 ms claimed) [V/VC] if latency matters more |
| Not adopted | Supertonic 3: Korean-capable and in sherpa-onnx, but the repository was archived 2026-09-09 and Supertone dissolved [V]; OpenRAIL-M restrictions. Kokoro has no Korean [V]. MeloTTS-Korean has no mobile port found |

## 5. Intent Understanding and LLM

### 5.1 Tiered routing (Proposed)

1. **Tier 0 — deterministic grammar (always on).** Covers the frequent, safety-critical commands in both languages, using active-session context:
   - completion/status: "다 됐어", "아직", "done", "not yet"
   - extensions: "2분 더", "이 분만 더", "thirty more seconds"
   - control: "조용히", "잠깐 멈춰", "quiet", "pause the timer", "skip"
   - navigation queries: "얼마나 남았어?", "how much farther?"
   - journal: "메모:", "기록해줘", "journal note"
   - recording: "녹음 시작/멈춰", "다시 들려줘", "play it back"
   Korean number and time expressions (native and Sino-Korean numerals, 반/half, 초/분) need dedicated tests. Ambiguous targets (two active dishes) produce a clarification, not a guess.
2. **Tier 1: on-device LLM (optional, device-dependent).** Gemma 4 E2B via LiteRT-LM, wrapped in a custom Kotlin module: 2.58 GB, native function calling. On the S26 Ultra GPU it decodes 52 tokens/s with a 0.3 s first token [V]. Alternative: Qwen3 small models via `react-native-executorch`. Gemini Nano Prompt API only on S26 / Fold7+ / Flip8 class devices; S24/S25 are not listed [V]. Enable only if the bake-off shows acceptable Korean tool-call accuracy and memory/battery impact alongside STT.
3. **Tier 2 — cloud LLM with JSON-schema tools.** Plan creation, free-form requests, summaries, next-session notes.

### 5.2 Cloud LLM candidates (Proposed: bake-off, then pick one default and one backup)

Per-session cost assumes 15 calls × (1,800 cached + 200 new input + 150 output tokens) [Est].

| Model | $/1M in / cached / out | Est. per session | Note |
| --- | --- | --- | --- |
| Claude Haiku 5.5 (`claude-haiku-5-5`) | $0.10 / — / $0.50 [V, Anthropic model table cached 2026-10-06] | ~$0.004 without cache discount | Prompt caching available; thinking defaults on, lower effort or disable for latency |
| OpenAI gpt-5-nano | $0.05 / $0.005 / $0.40 [V] | ~$0.001 | Reasoning model; use minimal reasoning; check latency |
| OpenAI gpt-4.1-mini | $0.40 / $0.10 / $1.60 [V] | ~$0.008 | Non-reasoning, low first-token latency |
| Gemini 3.1 Flash-Lite | $0.25 / $0.025 / $1.50 [V] | ~$0.005 | |
| Upstage Solar Mini 4 | $0.10 / $0.01 / $0.40 [V] | ~$0.0015 | Korean-focused vendor; tools and structured output [VC] |
| Groq gpt-oss-20b | $0.075 / — / $0.30 [V] | ~$0.003 | ~1,000 tok/s claimed [VC] |
| Qwen flash, DeepSeek flash | ~$0.05 / $0.40; $0.15 / $0.60 (off-peak) [V] | ~$0.001–0.004 | DeepSeek peak pricing overlaps Korean daytime; data-location considerations |

All candidates cost under one cent per session, so **selection should be driven by p95 latency measured from Korea and Korean tool-call accuracy**, not price. Proposed bake-off set: Claude Haiku 5.5, gpt-4.1-mini, gpt-5-nano, Gemini 3.1 Flash-Lite, Solar Mini 4 (add Groq gpt-oss-20b if latency dominates). Keep a provider-neutral adapter so the default can change.

### 5.3 Realtime speech-to-speech APIs (Not adopted for v1)

gpt-realtime-mini (~$0.11 per 30-minute session if used only during turns; more if kept open) and Gemini Live (cumulative per-turn billing reported, up to ~$1.5–2 per session if kept open) [V/3P/Est]. They duplicate the on-device pipeline, cost more, add a network clock to timing, and weaken the "app commits state" rule. Reconsider for an optional free-conversation feature later.

### 5.4 Cost envelope (Est)

| Path | Per 30-minute session |
| --- | --- |
| Fully on-device (Tier 0/1, on-device STT/TTS) | ≈ $0 (battery only) |
| Plus cloud LLM fallback | + $0.001–0.01 |
| Plus cloud STT fallback on all speech (~3–4.5 min) | + $0.01–0.04 |
| Plus cloud TTS for all speech (~1,500 chars) | + $0.02–0.06 |

Daily personal use should stay well under a few dollars per month with on-device primaries [Est].

## 6. Walking Navigation

| Concern | Proposal |
| --- | --- |
| Korea routing (primary) | Kakao walking directions `GET dapi.kakao.com/v2/routing/walk`, effective 2026-07-21; 1,000 free calls/day then 10 KRW/call; steps include guidance text, distance, time, geometry; route modes `SHORTEST`, `BROAD_FIRST`, `ACCESSIBLE` [V] |
| Korea routing (backup) | TMAP pedestrian route (SK Open API); free tier reportedly 1,000/day [3P]; terms restrict storing API results beyond 24 hours [V, possibly dated] |
| Not usable in Korea | Google walking directions (Navigation SDK lists KR unavailable [V]; Google Maps Korea data export conditionally approved Feb 2026 but no launch [news]) |
| Place search | Kakao local keyword/category search (100,000/day each) [V] |
| Outside Korea (later) | OSM-based: OpenRouteService (2,000 directions/day free) [V] or Stadia (Valhalla) [VC]. Korean OSM sidewalk quality is unproven |
| Map display | **Open.** Candidates: Kakao or Naver map SDKs (React Native wrapper maturity not yet checked; a custom Expo module may be needed), or MapLibre (`@maplibre/maplibre-react-native`) + OpenFreeMap tiles. Must verify whether Kakao route geometry may be drawn on another provider's map before choosing |
| English guidance | Build instructions from step geometry and turn data with ko/en templates; do not depend on provider guidance language |
| Saved routes | Store our own GPS trace and user-confirmed route metadata; follow provider caching terms for provider responses |

On-device navigation engine (Proposed): fused location at ~1 Hz during a walk; gate statements on fix age and horizontal accuracy (for example, discard fixes older than 5 s or worse than 30 m for precise claims); snap to route; off-route after N consecutive good fixes beyond a threshold distance; reroute only through the provider; announcement points at approach distances tuned for walking (for example 50 m and at the turn); remaining distance/ETA from route geometry and measured pace.

## 7. Timers and Background Execution

- During an active session, the combined foreground service keeps the process (and the JavaScript runtime) alive. The native module holds the next due-event timer on monotonic elapsed time and wakes the TypeScript engine, which revalidates the event against current state and revision before speaking. Deadlines are persisted as wall-clock times.
- Time-critical cues have a native fallback: if JavaScript does not acknowledge a due event within a short window, the service speaks a pre-rendered phrase. Measure JavaScript wake latency with the screen locked.
- Android 14+: microphone/location foreground services cannot be started from the background; start the session from a visible activity or notification action [V]. Android 15: audio focus requires foreground or an audio FGS [V].
- `SCHEDULE_EXACT_ALARM` is denied by default on Android 14+ new installs, and `USE_EXACT_ALARM` is restricted to alarm/calendar apps [V]. Use an inexact `AlarmManager` notification backup, plus `setAlarmClock` if the user grants exact alarms. The backup is a recovery signal, not a guarantee of speech.
- On recovery, reconstruct due events from deadlines and revisions; mark missed events as expired instead of replaying a backlog.

## 8. Audio Routing and Vocal Recording

- Conversation capture: `VOICE_COMMUNICATION` source, Bluetooth headset mic when selected via `setCommunicationDevice` (SCO/LE Audio). Show the actual route.
- Vocal takes: phone mic with an unprocessed/`MIC` source at 48 kHz preferred, since classic Bluetooth headset mics are narrowband [3P]; store AAC (playback) and optionally WAV (future pitch analysis).
- Recording a take pauses conversational STT and defers routine cues (handoff V03).
- Metronome/backing playback uses the audio engine clock, never the network loop.

## 9. Data and Privacy (Proposed)

- Local-only storage in the first build: drift database plus app-private audio files. No cloud sync.
- Raw conversational audio is not retained by default; transcripts are. Vocal takes and explicitly dictated journal audio are retained until deleted.
- Cloud requests send minimal context: compact session state and the current utterance, not the full journal.
- Export: ZIP of JSON (state), Markdown (journal), and audio files.

## 10. Verification Plan (Proposed)

1. **Week 1 feasibility spike and framework gate (Decided by user).** Before full implementation, build a minimal Expo development build that includes the combined foreground service, VAD + on-device STT, TTS cues, and fused location. Run it on the user's Galaxy with the screen locked during a 30-minute outdoor walk, once with earbuds and once with the phone mic. Pass criteria (proposed thresholds, adjust after the first run):
   - STT and VAD run for the whole walk without silent stops. Restarts are logged and recovered.
   - Scheduled cues start within 1 s of their due time, measured from native timer fire to audible TTS. JavaScript wake latency is recorded separately.
   - Location fixes continue at the configured rate. Gaps and accuracy are logged.
   - Battery use for the 30 minutes is recorded and judged acceptable by the user.
   - The actual input route (Bluetooth or phone mic) matches the selection and survives a disconnect/reconnect.

   Also record: which TTS engines are available, ML Kit GenAI availability, and one Kakao walking-route call.

   If the spike fails, keep Expo but move more logic into native code first (for example, cue selection for due events). Only if that is insufficient, switch Android to fully native Kotlin + Jetpack Compose, reusing the Kotlin modules and porting the TypeScript engine against its tests.
2. **STT bake-off:** 60–100 recorded utterances (ko/en, commands and journal sentences, quiet room, outdoor walk, kitchen noise; earbud mic and phone mic). Measure CER, end-of-speech-to-final latency, and battery for candidates A–C.
3. **LLM bake-off:** ~150 labelled utterances with session-state snapshots; measure tool-call exact-match, clarification correctness, p50/p95 latency from Korea, and cost.
4. **Engine tests:** deterministic fake-clock tests covering the acceptance scenarios in the handoff (A01–A07, V01–V04, C01–C03, J01–J02).

## 11. Open Items for the User

1. Exact QCY model, and which Galaxy Buds model is purchased.
2. Whether use abroad is planned (it would affect the OSM routing work).
3. Account creation as each becomes necessary: Expo (EAS) and Kakao Developers first, then the cloud LLM providers for the bake-off, then Cloudflare. An Apple Developer Program membership is needed only when iPhone work starts.
