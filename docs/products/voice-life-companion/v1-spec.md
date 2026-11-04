# Voice Life Companion: First-Version Specification

Status: Proposed by the assistant on 2026-11-03, based on the user's mode definitions from the same day. Read [README.md](README.md) (product handoff) and [technical-decisions.md](technical-decisions.md) first. This document turns them into a buildable first version.

## 0. User Decisions Captured Here (2026-11-03)

- **Mode names:** Travel Guide / 여행 가이드, Work Partner / 작업 파트너 (the intended feel is a copilot, like Jarvis in Iron Man), Voice Coach / 보이스 코치. Shared: Journal / 기록.
- **Travel Guide scope:** based on GPS, the user can ask what is around and where to go, and gets walking guidance. Nearby discovery and Q&A are first-version features, not follow-ons. This supersedes README §10 "Rich travel narration, discovery" for the basic nearby Q&A.
- **Work Partner scope:** a copilot for any activity: task management, Q&A during the task, and active nudges. Start small: short in-task interactions only. Requests outside a task, such as general reminders or a daily overview, are deferred.
- **Voice Coach scope:** analyze tone, pitch and speech. Basic pitch and speech analysis are first-version features; this supersedes README §6's "candidate enhancement" wording. Detailed medical or physiological assessment remains out of scope, both for product reasons and because of the Supertonic OpenRAIL-M restriction (l).
- **Platform and stack:** Android first on the user's Galaxy S25, Expo/React Native + TypeScript with local Kotlin modules. Korean and English. On-device first, cloud fallback. Latency and cost are top priorities.
- **Speech engines:**
  - TTS: Supertonic 3 int8 for ko and en. **One voice per session** (user decision 2026-11-04): platform TTS is used only as the whole-session voice when Supertonic is unavailable at session start (with an on-screen notice); it is never mixed into a Supertonic session. When a phrase is not ready in time, an earcon plays instead (see 1.9).
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

### 1.9 One voice per session, earcons, and background synthesis (user decision 2026-11-04, untested on a device)

Falling back to Google platform TTS for an urgent uncached phrase was rejected: a sudden change of voice is an awkward experience, and a warning tone is better. Rules:

- **Session voice chosen once** at session start (`session_voice_chosen`): Supertonic if downloaded and loadable, else platform TTS for the whole session with a visible notice on the session screen (Work Partner, Routine, Travel Guide, Voice Coach). No per-utterance engine choice.
- **Synthesize as soon as the text is known**, through a prioritized background queue (`SynthQueue` in `@vlc/session-engine`: priority, then needed-by time, then order; deduplicated by language and text; overdue items dropped; a failed item is retried with the same engine): timers and their "1분 남았어요" pre-warnings when set; every turn instruction and approach cue when a route is fetched or rerouted; new item names and correction cues when a routine is edited mid-session; landmark one-liners and narration sentences (first sentence first); fixed system phrases at session start (GPS weak, off route, arrived, guidance stopped, and so on).
- **Compose from cached fragments**: a turn cue is "50미터 앞에서" + "우회전하세요" (en: "In 50 meters," + "turn left"), played from cached clips back to back with an 80 ms gap. Names and other free text need full synthesis.
- **Earcons when a phrase is due and not ready** (Supertonic sessions; the platform voice answers in 0.1-0.35 s and needs none): attention, timer done, turn left, turn right, arrived, warning (off route, GPS lost), tick (listening or LLM thinking). Natively generated PCM, media usage on the system route, optional vibration, never the forced speaker. Loudness is relative to speech (Settings > Alert tones); vibration defaults to navigation only.
- **Earcon designs** (24 kHz mono, sine plus 1-2 harmonics, raised-cosine attack and release, peak -6 dBFS; source `audio/Earcons.kt`): attention = soft swelling E5+B5 fifth, 260 ms; timer done = rising G5-B5-D6 arpeggio with a held last note, 400 ms; turn left = falling A5 to D5, 290 ms; turn right = rising D5 to A5, 290 ms; arrived = E5, G5, then a held C-major triad, 400 ms; warning = two low pulses of A4+B-flat4 with strong harmonics, 300 ms; tick = two fast-decay pings 1000 and 760 Hz, 150 ms. Vibration patterns match (left long-short, right short-long; none for the tick).
- **Speech follows the earcon** as soon as it is ready unless stale. Each cue carries `staleAfter` (for example a turn already passed, a count no longer current). Logged: `earcon_played`, `speech_late` (with `lateMs`), `speech_dropped_stale`.
- **Session voice fails mid-session** (error, unload, failed load): reload once with earcons meanwhile; if the reload fails the platform voice announces once (ko/en) that the voice will change for the rest of the session, then takes over (`voice_switched`). The only allowed mid-session switch.

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

### 2.1 Concrete first case: home workout, stretching and Taekwondo poomsae (2026-11-04)

**User feedback (2026-11-04).** The user was not sure what voice adds to Work Partner. What would make it worth it, in their words: (1) departing from the planned routine without touching the screen, (2) **voice pacing**, (3) setting up a routine by voice or by text. The user approved workout and stretching as the specific case and suggested poomsae such as 태극 1장. Later the same day the user added a fourth requirement: personal correction notes that turn into voice guidance (example: "오른손 먼저 나가야되는데 자꾸 왼손이 나가요").

The generic task copilot above keeps working; the routine screens sit next to it (`/work/routine`, entered from the Work Partner start screen).

**Routine model** (`packages/session-engine/src/routine`, pure TypeScript). Item kinds: exercise (reps x sets, seconds per rep or a phase pattern, rest between sets), timed hold (seconds, sets, optionally left/right), rest, and poomsae (ordered movements with a count number, stance, technique, facing, optional 기합 flag). The **template** (`RoutineTemplate`) is never changed by a session. A running session (`RunState`) holds a copy of the items, a tempo factor and a deviation log; at the end the app offers "save changes to the template?" (default no; a built-in routine is saved as a copy). Skips, back, pause and "repeat from N" are transient and never count as changes.

**Setup by text or voice.** `parseRoutineText` is a deterministic ko/en parser ("스쿼트 15개 3세트, 플랭크 45초, 세트 사이 휴식 30초", "squats 15 reps 3 sets, plank 45 seconds, rest 30 seconds", "햄스트링 스트레칭 좌우 30초", "태극 1장 3번"). It returns editable items, the parts it did not understand and the defaults it assumed (rest 30 s, 3 s per rep, 2.5 s per movement). Leftovers go to the `askLlm()` stub (`kind: 'routine_setup'`), which stays unimplemented until M4. UI: text box and Parse, a voice "루틴 만들기 / create routine" flow, a preview with edit, save as template. "어제 루틴 시작" / "start my last routine" starts the most recent run.

**Changing the routine during a session** (`parseRoutineIntent` + `applyCommand`, ko and en): skip this exercise; N more reps; one more or one fewer set; change the rest to N seconds; swap X for Y; repeat from movement N; go back one move; slower or faster (x1.15 or x0.85 on rep and movement durations, clamped to 0.5x-2x, so speed 50%-200%); pause and resume; "how many left?", "what's next?"; end early; "mark as fixed" for a correction. Each command is answered with one short sentence and the pacing continues from the right place.

**Voice pacing (the key feature).**
- *Why pre-synthesis.* Supertonic takes about 1.8 s to first audio and is not streaming, so live synthesis cannot keep a rhythm. At routine start the app pre-synthesizes every phrase the routine can say (numbers 1-30, the countdown and hold words, the routine's item and movement names, transition phrases, correction cues and the kihap cue) into WAV files in `filesDir/vlc-pacing/`. Cache key: SHA-1 of `engine|voice|steps|lang|text`. The cache holds only the session voice's clips (Supertonic when its model is ready, otherwise platform TTS with `synthesizeToFile` for the whole session); a clip that fails is retried with the same engine and is never filled by another engine. The first run pays the synthesis time, later runs hit the cache.
- *Timeline.* `planTimeline` flattens the session copy into units (rep, hold, rest, poomsae movement, ...) and produces a beat list with offsets. Unit starts sit on a fixed grid (tempo); phrases never move a beat. A phrase that is longer than its slot is shortened (full to short to count) and reported.
- *Native player.* `PacingPlayer` (in the session service) schedules each beat with `Handler.postAtTime` on a dedicated thread against `SystemClock.uptimeMillis` (the same path as `CueScheduler`, absolute times, no chained delays), so it works with the screen locked. Each beat plays a pre-built `MODE_STATIC` `AudioTrack` (`USAGE_MEDIA`, low-latency), created one or two beats ahead. It follows the system media route and **never forces the phone speaker** (no preferred device, no communication device). It requests `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK` for a segment and releases it shortly after the last clip, so other audio ducks rather than stops.
- *Accuracy logging.* Every beat logs `pace_beat` (scheduled offset, drift = play start minus scheduled, clip length, routed device, source); each set ends with a `pace_segment` summary (mean, p95, max, count of beats later than 50 and 100 ms). A missing clip plays a soft tick earcon (no live TTS, no other voice) and logs `pace_clip_missing` and `speech_dropped_stale`, because a late count is no longer true. The summary screen lists the per-set drift. Expected: handler-path jitter of a few ms plus `AudioTrack.play()` start latency, median drift under about 30 ms and p95 under about 60 ms on the Galaxy S25 (an estimate until measured; see TESTING.md). Bluetooth adds a constant 150-250 ms output latency that the drift number does not include.
- *Half-duplex STT.* The platform recognizer is paused for each clip (existing echo tail), and listens between counts. If the gap to the next clip is under `MIN_LISTEN_GAP_MS` = 700 ms, it stays paused across the gap (a recognizer restart per beat would thrash). Priority stop: a "멈춰 / stop" partial transcript heard in a gap pauses pacing at once, without waiting for the final transcript; the on-screen Pause button is the fallback for fast tempos where the gaps are too short to listen.
- *Pacing levels* (setting, also chips on the active screen): **full** ("하나, 왼발 앞서기 아래막기"), **short** ("하나, 아래막기"), **count only** ("하나"). Reps are counted "하나, 둘, 셋..." or "one, two, three..."; holds say the side, "10초 남았어요" (holds of 25 s or more) and "3, 2, 1"; rests say "휴식 30초", "다음 세트" or "다음: 푸시업 10개 3세트" (rests of 15 s or more) and "3, 2, 1"; a pass change says "다시 한 번". Movement 18 gets a "기합!" reminder before its count at every level.

**Correction notes that become voice cues.** The user can state a problem by voice or text, in practice or in the routine editor ("문제: ...", "고칠 점: ...", "note: I keep ...", or a plain sentence that has both a problem marker such as 자꾸/"I keep" and a side or body-part word). Rules (`corrections.ts`, deterministic, ko and en):
- *Attachment.* A named movement ("5번 동작", "movement 5") wins; then a technique name that matches exactly one movement; then a named exercise; then, in practice, the current movement (or the previous one if the current one started less than 1.2 s ago); then the practiced item; otherwise the whole routine. A technique name that matches several movements (아래막기 appears in five) is ambiguous: the text goes to the `askLlm()` stub (`kind: 'routine_target'`) and the user picks the movement on screen.
- *Cue.* Side and body-part keywords (오른손/왼손/오른발/왼발/몸통/얼굴..., right/left hand/foot...) plus an optional modifier (먼저/first, 높이/higher, ...) give a short cue: "오른손 먼저 나가야되는데 자꾸 왼손이 나가요" gives "오른손 먼저!"; "the right hand should go first but I keep leading with my left" gives "right hand first!". The full note is kept for display.
- *Playback.* The cue is pre-synthesized with the other clips and plays just before the movement's count at every pacing level, including count only. It takes its time from the gap before the movement, never from the beat: if the previous unit is flexible (intro, rest) the gap is widened; otherwise a cue that does not fit is dropped and logged (`cues_dropped`).
- *Persistence.* Notes are stored per template (and per movement or item) in SQLite (`routine_corrections`), carry over to future sessions, can be edited, deleted or marked fixed ("이제 괜찮아", "mark as fixed", or in the editor), which stops the cue. Each note is also saved to the Journal as a user note linked to the routine and movement (`task_id = <template>:<movement>`). The session summary adds one line, for example "오늘 5번 동작 오른손 먼저 큐 3번 나왔어요", and counts are added to the note's `shown` total.

### 2.2 Built-in routines

Stretching (neck, shoulder, hamstring, quad, spinal twist, child's pose), Bodyweight workout (squats 15x3, push-ups 10x3, lunges 12x3, plank 45 s x3), and 태극 1장 (Taegeuk 1 Jang). The stretching and bodyweight contents are plain activity lists with no health guidance.

### 2.3 Status (2026-11-04)

Built and unit-tested (`packages/session-engine` routine tests, `apps/mobile` routine controller, view and DB tests); native player compiles in a release build. **Not run on a device**; the drift numbers above are design expectations, not measurements. Not covered: Supertonic synthesis time for a full poomsae cache on the S25, platform `synthesizeToFile` output on the S25's TTS engine, behaviour with the screen off for a long set, and whether the recognizer restarts cleanly between counts.

### 2.4 Taegeuk 1 Jang (태극 1장): sources and movement list (checked 2026-11-04)

**Sources (web, opened on 2026-11-04):**
- NBTKDA Taegeuk 1 poomsae chart (Kukkiwon terminology, the primary data): https://www.nbtkda.com/s/Taegeuk-1-NBTKDA-Poomsae-Chart.pdf
- NBTKDA page (stances and techniques; kihap on the final punch): https://nbtkda.com/taegeuk-1
- Taekwondo Nation, 18-movement numbering with one kihap on movement 18: https://www.taekwondonation.com/tae-kwon-do-white-belt-form-taegeuk-il-jang/
- Yonggi Taekwondo, 18-movement numbering: https://www.sites.google.com/site/yonggitaekwondo/poomse/il-jang
- Wikipedia, technique inventory and lead-foot turns: https://en.wikipedia.org/wiki/Taegeuk_Il_Jang
- Kukkiwon Taegeuk 1 page (symbolism only, no movement list): https://www.kukkiwon.or.kr/eng/board/read?boardManagementNo=55&boardNo=1347&page=2&menuLevel=3&menuNo=72
- Kukkiwon digital encyclopedia summary (technique list only): https://mookas.com/news/17083

**Authority and caveat.** The most authoritative source is the Kukkiwon Taekwondo Textbook (Poomsae volume) or the World Taekwondo recognized-poomsae material. **Neither is online, and no opened source was a Kukkiwon or World Taekwondo movement list.** The data therefore comes from the NBTKDA chart (which uses Kukkiwon terms), cross-checked against the two 18-movement lists. The facing directions are derived from the stated turns (start facing = N), not copied. **Please check the list against your dojang's form once and report differences.**

**Movements (18-movement numbering; descriptions are our own words).** Start: parallel ready stance (나란히서기, 기본준비자세).

| # | Turn, facing | Stance | Technique |
| --- | --- | --- | --- |
| 1 | 90 degrees left, W | left 앞서기 (walking stance) | 아래막기 (low block) |
| 2 | W | right 앞서기 | 몸통지르기 (middle punch) |
| 3 | 180 degrees right, E | right 앞서기 | 아래막기 |
| 4 | E | left 앞서기 | 몸통지르기 |
| 5 | 90 degrees left, N | left 앞굽이 (front stance) | 아래막기 |
| 6 | N | left 앞굽이 | 몸통지르기 |
| 7 | 90 degrees right, E | right 앞서기 | 몸통안막기 (middle inside block) |
| 8 | E | left 앞서기 | 몸통지르기 |
| 9 | 180 degrees left, W | left 앞서기 | 몸통안막기 |
| 10 | W | right 앞서기 | 몸통지르기 |
| 11 | 90 degrees right, N | right 앞굽이 | 아래막기 |
| 12 | N | right 앞굽이 | 몸통지르기 |
| 13 | 90 degrees left, W | left 앞서기 | 얼굴막기 (high block) |
| 14 | W | right 앞서기 | 앞차기 (front kick), then 몸통지르기 |
| 15 | 180 degrees right, E | right 앞서기 | 얼굴막기 |
| 16 | E | left 앞서기 | 앞차기, then 몸통지르기 |
| 17 | 90 degrees left, N | left 앞굽이 | 아래막기 |
| 18 | N | right 앞굽이 | 몸통지르기 with **기합 (kihap)** |

Then the left foot returns to the ready stance (바로).

**Where sources disagree, and the choice made.**
- *Numbering.* The NBTKDA chart counts 16 numbers with a/b sub-techniques (moves 5, 10, 12, 14); two other sources count 18 with 5/6 and 11/12 split and each kick-plus-punch as one movement. The app uses the 18-movement numbering (the task's "18 movements").
- *Kihap.* All three main sources put the single kihap on the final punch (chart 16 = movement 18); none puts one at a kick.
- *Stance names.* Consistent across the sources: 앞서기 for moves 1-4, 7-10, 13-16 and 앞굽이 for 5, 6, 11, 12, 17, 18; no source calls the walking-stance moves 앞굽이. (Hence the user's list of terms is used as is.)
- *Punch labels.* Sources label the punches 바로지르기 and 반대지르기 in opposite ways; the app does not use these labels and stores only the stance and the technique. Which fist punches is not spoken.
- *Move 17 turn.* One source says "right", the others "left"; the app uses left (it must end facing N).
- *Ending.* Two sources say "turn 180 degrees left" at the end, which contradicts facing N already; the app follows the chart: the left foot returns to the ready stance. Whether Kukkiwon words it this way is unverified. Line spacing (how far the form ends from the start) is unverified and not modelled.

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
| M1 (built, device test pending) | App shell, persistence, Journal, settings, and Work Partner first version on the existing engine and voice loop | Install and try it |
| M2 (built, device test pending) | Voice Coach: native pitch and speech analysis, takes, review screen | Try a practice session |
| M3 (built, Worker not deployed, device test pending) | Travel Guide: Worker with Kakao Local and walking route, nearby Q&A, navigation | A Kakao Developers REST API key (and later a TMAP key). Deploy the Worker to the user's Cloudflare account |
| M4 | LLM tier (§5.5 alignment and confirmation, Q&A) after the bake-off | LLM provider API keys stored as Worker secrets |
| M5 | Dogfooding: the user uses all three modes for 1–2 weeks, then we tune them | Daily use and feedback |

M1–M3 can be built in parallel. They are released together as the first version, so simultaneous delivery of all three modes remains the completion target.

### M1 status (2026-11-03)

Built and verified by unit tests and a release build; **not yet run on a device**. Session TTS engine selection is described in [apps/mobile/SPIKE.md](../../../apps/mobile/SPIKE.md).

- Engine (`packages/session-engine`): plan steps with estimates, next/back/skip, `what's left?` / `where was I?` answers, notes linked to the current step, quiet for N minutes, step-overrun check-in, focus break (default off, 50 min), skipped-step question (once per step), cue planner for the native scheduler, zod session schema, four example templates.
- App (`apps/mobile`): expo-router shell, Home, Settings (+ Diagnostics = the spike screen), Journal (list, search, edit, delete, Markdown/JSON export), Work Partner screen and controller, SQLite persistence (state saved after every applied action and restored at start), `askLlm()` stub in `src/llm/` (M4).
- Travel Guide and Voice Coach were placeholder routes in M1; they are now real screens (see M2, M3 and integration below).

### M2 status (2026-11-03)

Built, merged and unit-tested (`packages/voice-analysis`, 29 tests); **not yet run on a device**. Native module `apps/mobile/modules/vlc-voice-coach` (own `AudioRecord`, f0 tracker, WAV takes in `filesDir/vlc-takes/`, offline analysis, playback) and `src/voice-coach/` (`VoiceCoachScreen`, ko/en command parser). Speech-mode feedback uses audio-energy rate and pauses; transcript/filler analysis is not fed yet because session STT is paused during takes.

### M3 status (2026-11-03)

Built, merged and unit-tested (`packages/travel` 33 tests, `services/worker` 15 tests); **not yet run on a device**, and the Worker is **not deployed** (the app runs in automatic mock mode until `expo.extra.travel {baseUrl, token}` is set in `app.json`). `src/travel/` holds `TravelGuideScreen` and `TravelController`.

### Integration status (2026-11-03)

Wired and covered by unit tests with fakes; **not yet run on a device**. Details and the device checklist: [apps/mobile/TESTING.md](../../../apps/mobile/TESTING.md).

- Both screens are the real routes. Spoken output (`onSpeak`, `onFeedback`) goes through the running native session TTS (the one session voice: Supertonic, or the platform voice for the whole session when Supertonic is unavailable; user output routing); without a session nothing is spoken.
- Starting a mode starts the native session with `mode` (`work`, `travel`, `coach`); only one mode owns it at a time (Home shows the active mode and a resume card; the other modes show how to get back).
- Each STT final goes to the mode first (`TravelController.handleUtterance`, or the Voice Coach commands: start take, stop, play it back, same block again, take note), then to the shared session-engine parser (timers, notes).
- Voice Coach takes, live pitch and playback pause session STT (`holdStt`; logs `stt_paused_for_take`, `stt_resumed`).
- Location events from the service feed `TravelController.setFix` even with the screen off. Notes are saved with the location; the walk log (`routes`) and a generated summary are saved at the end.
- SQLite migration `0001` adds `takes.block_id`, `places.external_id`, `routes.kind`, `plan_templates.kind` (Voice Coach blocks).

