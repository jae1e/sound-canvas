# Voice Life Companion: First-Version Specification

Status: Proposed by the assistant on 2026-11-03, based on the user's mode definitions from the same day. Read [README.md](README.md) (product handoff) and [technical-decisions.md](technical-decisions.md) first. This document turns them into a buildable first version.

## 0. User Decisions Captured Here (2026-11-03)

- **Mode names:** Travel Guide / 여행 가이드, Work Partner / 작업 파트너 (the intended feel is a copilot, like Jarvis in Iron Man), Voice Coach / 보이스 코치. Shared: Journal / 기록.
- **Travel Guide scope:** based on GPS, the user can ask what is around and where to go, and gets walking guidance. Nearby discovery and Q&A are first-version features, not follow-ons. This supersedes README §10 "Rich travel narration, discovery" for the basic nearby Q&A.
- **Work Partner scope:** a copilot for any activity: task management, Q&A during the task, and active nudges. Start small: short in-task interactions only. Requests outside a task, such as general reminders or a daily overview, are deferred.
- **Voice Coach scope:** analyze tone, pitch and speech. Basic pitch and speech analysis are first-version features; this supersedes README §6's "candidate enhancement" wording. Detailed medical or physiological assessment remains out of scope, both for product reasons and because of the Supertonic OpenRAIL-M restriction (l).
- **Platform and stack:** Android first on the user's Galaxy S25, Expo/React Native + TypeScript with local Kotlin modules. Korean and English. On-device first, cloud fallback. Latency and cost are top priorities.
- **Speech engines:**
  - TTS: Supertonic 3 int8 for ko and en, with Google platform TTS as the low-latency fallback.
  - STT: the Android on-device recognizer with automatic ko/en detection, with sherpa-onnx as the offline fallback. Soniox is a possible cloud tier later.

## 1. Shared Foundation

### 1.1 Session model
Every mode runs inside one explicitly started **session**, using the existing `@vlc/session-engine`:
- tasks, timers, check-ins and due events
- validated actions
- `parseUtterance`, `chooseHypothesis` and `handleUtterance`

Mode adapters add mode-specific state on top. They never bypass the engine's validation.

### 1.2 Voice loop
1. The STT final and n-best list go to `chooseHypothesis`.
2. `parseUtterance` turns the chosen hypothesis into an action.
3. The engine applies the action and the app speaks a short acknowledgement.
4. If the deterministic path is ambiguous or out of grammar, the request escalates to the LLM tier (technical-decisions §5.1 and §5.5).

Recognition is half-duplex: the recognizer pauses while the app speaks. Quiet mode suppresses everything except user-requested speech and critical cues.

### 1.3 Persistence
- Use expo-sqlite with Drizzle on the device. Tables: sessions, tasks, timers, events, journal entries, takes (audio files), places, routes and settings.
- Persist the session state after every applied action, so the app can resume after it is killed.
- Do not sync to the cloud in the first version.

### 1.4 Journal
A cross-mode list of entries. Each entry has:
- the text as spoken and an editable version
- a source label: user note, transcript or generated summary
- the mode and session
- optional links to a task, take or place, and an optional location

Users can browse, search, edit and delete entries, and export them to Markdown or JSON through the share sheet.

### 1.5 App structure (expo-router)
- **Home:** three large mode cards (Travel Guide, Work Partner, Voice Coach), a quick Journal button, a resume card when a session is active, and the audio route and mic status.
- **Active session screen per mode:** state, timers, the next intervention, the mic and its partial transcript, and big controls (quiet, pause, end, correct).
- **Journal:** list and detail/edit.
- **Settings:** language (Auto/ko/en), voice (Supertonic voice and steps), output route, nudge level (quiet/normal/chatty), and the diagnostics screen. The spike screen moves here.

### 1.6 Cloud (Cloudflare Worker proxy, `services/worker`)
- Exposes `/llm` (provider-agnostic: chosen by the §5.2 bake-off, initially configurable), `/places` (Kakao Local) and `/route/walk`.
- API keys are Worker secrets and never ship in the app.
- Each install gets a token; requests are rate-limited.
- The Worker logs request metadata only.

## 2. Work Partner / 작업 파트너 (first-version scope)

**Purpose:** an always-on copilot for a hands-busy activity. It keeps track of the work, answers short questions and nudges at the right moments.

**Start a session:**
- "작업 시작" or "start working on assembling the shelf"
- an optional plan: "steps: unpack, frame, shelves, doors"
- or pick a saved template

**Short commands (deterministic first):**
- **Timers:** "파스타 3분", "pasta 3 minutes", "타이머 5분", "2분 더", "cancel the pasta timer"
- **Tasks and steps:**
  - "next step", "다음", "done", "다 됐어", "not yet", "아직", "skip", "go back"
  - "what's left?", "뭐 남았어?", "where was I?"
- **Check-ins:** "check on the mushrooms in 3 minutes", "3분 뒤에 확인해줘"
- **Notes:** "메모: 긴 나사 사용", "note: use the longer screws". These go to the Journal, linked to the step.
- **Control:** "조용히 10분", "quiet for 10 minutes", "pause", "resume", "end session"

**Quick Q&A** (LLM tier, with session context): "how much is 3/4 cup in grams?", "이 단계 얼마나 걸려?" Answers are one or two spoken sentences, with more detail if the user asks.

**Active nudges** (bounded, following the nudge level):
- milestone and expiry cues for timers
- check-ins when a step overruns its estimate
- a break suggestion after a long focus block (default 50 minutes, optional)
- "you skipped step 3, was that intentional?" at most once per step

The LLM must never invent nudges about safety or health. Nudge copy for the frequent cues is generated ahead of time and cached as audio, which hides Supertonic's ~1.8 s latency.

**Example activities to test:**
- a focus work session
- furniture assembly or a repair
- a stretching routine
- cooking: two dishes in parallel (already covered by engine tests)

**Not in the first version:**
- requests outside a session: reminders, the daily overview, calendar
- long planning conversations
- camera or vision

## 3. Travel Guide / 여행 가이드 (first-version scope)

**Purpose:** walking guidance and "what's around here / where should I go" by voice, using GPS.

**Nearby discovery (Kakao Local through the Worker):**
- "근처에 조용한 카페 있어?", "what's around here?", "가까운 편의점", "10분 안에 갈 만한 곳 추천해줘"
- The app searches by category or keyword within a radius and ranks results by distance (and rating where the data has it). The LLM turns the results into a two- or three-item spoken answer and only describes facts it was given.
- The answer says which place data it used and never invents opening hours.

**Walking navigation:**
- "거기로 가자", "take me to the second one", or a destination picked in the UI
- The walking route comes from `/route/walk`: Kakao walking route, with TMAP as the backup provider (technical-decisions §6).
- Show a route preview on screen before starting.
- During the walk: concise turn cues at route points, "얼마나 남았어?" / "how much farther?" (distance and ETA), and off-route detection followed by a reroute after confirmation.

**Location awareness:**
- "지금 어디야?" or "where am I?" gives a reverse-geocoded address or area.
- If the GPS fix is stale or inaccurate, the app says so instead of guessing.

**Notes:** "메모: 여기 다시 오고 싶다" saves a Journal entry with the location. The walk log (route, distance, time, notes) is saved to the Journal.

**Not in the first version:**
- offline maps
- rich narration of history or landmarks
- trails or hiking
- international providers

## 4. Voice Coach / 보이스 코치 (first-version scope)

**Purpose:** practice sessions with objective feedback on pitch, tone and speech.

**Practice structure** (from README §6): blocks, durations, rest, repeats, recorded takes, playback, notes per take, and an end-of-session reflection.

**Analysis (on device, native):**
- **Pitch:** a real-time f0 tracker (YIN/MPM) with the current note, the cents deviation from the nearest note or a target note, pitch stability (standard deviation in cents over sustained notes) and range (lowest/highest stable note). A target can be a note ("hold A3") or a short note sequence.
- **Speech:**
  - speaking rate (syllables per second for ko, words per minute for en, from STT timestamps or energy peaks)
  - pause count and lengths
  - filler words from the transcript ("음", "어", "그", "um", "uh", "like")
  - loudness level and its consistency (RMS dBFS)
- **Tone (heuristic and labelled as such):** brightness (spectral centroid) and a breathiness proxy (harmonics-to-noise ratio). They are shown as relative trends between takes, not as a diagnosis.

**Feedback timing:** feedback comes only after a take or at block boundaries, never during a take. It is short and spoken, with a detailed chart on screen (pitch contour against the target, metrics table).

**Commands:** "녹음 시작" / "start take", "다시 들려줘" / "play it back", "이 테이크 메모: 두 번째 구절 박자 놓침", "same block again", "how was my pitch?", "compare with the last take"

**Not in the first version:**
- automatic song or melody import
- singing-style grading
- any medical or voice-health advice

## 5. Milestones

| Milestone | Content | Needs from the user |
| --- | --- | --- |
| M0 (in progress) | Spike gate: screen-locked cues and STT, 30-minute walk, route/mic stability | Run the tests on the phone and share the log |
| M1 | App shell, persistence, Journal, settings, and Work Partner first version on the existing engine and voice loop | Install and try it |
| M2 | Voice Coach: native pitch and speech analysis, takes, review screen | Try a practice session |
| M3 | Travel Guide: Worker with Kakao Local and walking route, nearby Q&A, navigation | A Kakao Developers REST API key (and later a TMAP key). Deploy the Worker to the user's Cloudflare account |
| M4 | LLM tier (§5.5 alignment and confirmation, Q&A) after the bake-off | LLM provider API keys stored as Worker secrets |
| M5 | Dogfooding: the user uses all three modes for 1–2 weeks, then we tune them | Daily use and feedback |

M1–M3 can be built in parallel. They are released together as the first version, so simultaneous delivery of all three modes remains the completion target.

### M1 status (2026-11-03)

Built and verified by unit tests and a release build; **not yet run on a device**. Session TTS engine selection is described in [apps/mobile/SPIKE.md](../../../apps/mobile/SPIKE.md).

- Engine (`packages/session-engine`): plan steps with estimates, next/back/skip, `what's left?` / `where was I?` answers, notes linked to the current step, quiet for N minutes, step-overrun check-in, focus break (default off, 50 min), skipped-step question (once per step), cue planner for the native scheduler, zod session schema, four example templates.
- App (`apps/mobile`): expo-router shell, Home, Settings (+ Diagnostics = the spike screen), Journal (list, search, edit, delete, Markdown/JSON export), Work Partner screen and controller, SQLite persistence (state saved after every applied action and restored at start), `askLlm()` stub in `src/llm/` (M4).
- Travel Guide and Voice Coach are placeholder routes; M2 and M3 replace `app/voice-coach/index.tsx` / `app/travel/index.tsx` and add `src/voice-coach/**` / `src/travel/**`.

