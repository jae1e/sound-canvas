# Voice Coach Renovation Plan

**Status:** approved by the user on 2026-11-07, with the answers in section 9. P0 started on 2026-11-07.

**User decision (2026-11-07).** The app focuses on Voice Coach, which becomes the main function. Travel Guide and Work Partner are hidden. This supersedes the 2026-11-03 decision to ship all three modes together (README D01, v1-spec). The code for the hidden modes is kept.

**Evidence used:**
- [research/singing-apps-study.md](research/singing-apps-study.md) and [research/speech-coach-apps-study.md](research/speech-coach-apps-study.md), both 2026-11-07;
- the Field Voice Log experience in [../industrial-voice-logging/field-test-log.md](../industrial-voice-logging/field-test-log.md);
- the existing Voice Coach code: `apps/mobile/modules/vlc-voice-coach` (f0, takes, playback) and `packages/voice-analysis` (29 tests).

**Labels:** **[R]** research finding, **[FT-n]** lesson from the Field Voice Log test log, **[P]** proposal, **[Q]** needs the user's decision.

## 1. The user's requirements (2026-11-07)

1. Voice Coach is the main function. Travel Guide and Work Partner are hidden.
2. Two coaches, **Song** and **Speech**. Both need recording, pitch and pacing.
3. **Recording input is selected explicitly,** because earbud microphones are poor.
4. **Listening output follows the Field Voice Log policy** and is selectable too.
5. **Volume (sound wave) and pitch are shown as graphs.**
6. **Pacing:** a metronome and simple drum beats.
7. **Speech coach:** AI transcript, pace measurement, planning and practice, designed with reference to other apps.
8. Study other vocal apps and design the features needed.
9. **Auto update** like Field Voice Log.
10. **Implementation is delegated** to small but capable Codex models through Whistler.

## 2. Product shape

- **Name.** Display name **Voice Coach / 보이스 코치**, with a new icon distinct from Field Voice Log's. The Android package stays `com.jae1e.voicelifecompanion`, so the new build installs over the old one and keeps its data. **[Q1]**
- **Navigation.** Bottom tabs: **Home · Sing · Speak · Takes · Settings**.
- **Hidden modes.** Travel Guide and Work Partner stay in the code behind *Settings → Labs → Show hidden modes* (off by default). Their routes are not registered unless it is on.
- **Journal.** It stays as a light hook: any session can be saved as a journal entry. It is not a tab.

### Home

- "Continue": the last practice, with one tap to resume.
- Today's plan (for example "Warm-up 5 min, then song practice").
- A grace-day streak. Streaks without mercy are a top complaint in singing apps **[R]**.
- The last result with its one **next action** (Orai pattern **[R]**).
- The update banner.

## 3. Shared studio: the core both coaches use

One studio screen component, reused by every exercise and practice mode.

```
┌───────────────────────────────────────────────┐
│ 🎙 Phone mic (locked)   🎧 Galaxy Buds  ⏱ 92 BPM │  input · output · tempo chips
├───────────────────────────────────────────────┤
│  pitch graph: piano-roll lanes, target band,  │
│  live pitch line, note name + cents           │
├───────────────────────────────────────────────┤
│  volume graph: scrolling waveform, dBFS,      │
│  quiet / good / near-clipping bands           │
├───────────────────────────────────────────────┤
│  beat strip: ● ○ ○ ○ (count-in, bar, beat)    │
├───────────────────────────────────────────────┤
│  ● Record   ⏸ Pause   ■ Stop   ▶ Play  │ 🥁 Beat │
└───────────────────────────────────────────────┘
```

### 3.1 Input (recording) policy

The input is explicit, and the default is the phone microphone. This applies FT-08 and FT-09.

- **Choices:**
  - Phone mic (default);
  - wired or USB mic or headset;
  - Bluetooth headset mic, with a warning: "call quality, narrowband, poor for singing tone".
- **Matching.** Devices are matched by type, name and address hash, never by the Android id **[FT-06]**.
- **Lock per take.** The input is chosen when Record is pressed and stays for the take. If the device disappears, the take falls back to the phone mic, says so, and logs a `route_changed` **[FT-08]**.
- **Show the active input.** It is shown before and during a take, and stored with the take **[FT-05]**.
- **Detect silencing.** Another app silencing the mic is detected and shown **[FT-03]**.
- **Source.** UNPROCESSED where available, else VOICE_RECOGNITION, at 48 kHz. Use 48 kHz for singing; it can drop to 16 kHz for speech ASR copies. Never VOICE_COMMUNICATION for takes, because it adds processing and silences other apps **[FT-03]**.

### 3.2 Output (listening) policy

The output is selectable, follows the system route by default, and never forces the loudspeaker.

- **Choices:** System (default: earbuds if connected, otherwise phone), wired headphones, Bluetooth headphones, phone speaker. The speaker only when the user picks it.
- **Attributes.** USAGE_MEDIA at media volume. Play only on a user action, never automatically.
- **Monitoring.** Metronome, drums and reference tones play through the chosen output. Live self-monitoring (hearing your own voice) is off in v1, because Bluetooth output latency of 150–300 ms makes it unusable **[R]**.
- **Bluetooth latency compensation.** A one-time **calibration** (tap along to clicks, or a loopback measurement with a wired headset) stores an offset for each output device. Beat and target timelines are shifted by it, like Singing Carrots' 0–300 ms setting **[R]**. Android has no reliable runtime latency API **[R]**, so it is measured, not assumed.
- **Bleed.** With the speaker as output and the phone mic as input, clicks and reference tones bleed into the take. The pitch tracker ignores frames around the app's own click times, and the UI recommends earbuds for output.
- **Lifecycle.** As in Field Voice Log [FT-19]:
  - leaving the screen or the app stops and saves the take;
  - the screen turning off keeps recording;
  - no automatic resume ever **[FT-04]**.

### 3.3 Graphs

- **Pitch:** a scrolling piano roll, with lanes labelled in the user's note style (C4 / 도₄ / C). It shows a target band (±25 / ±50 cents), the live f0 line, and the current note with cents. Unvoiced frames show as gaps.
- **Volume:** a scrolling peak waveform at 25–50 Hz with a dBFS readout and labelled bands (Field Voice Log pattern **[FT-17]**).
- **Review:** the same graphs over the whole take, with a playhead and tap-to-seek, plus a beat grid and the target notes. Two takes can be compared overlaid.

### 3.4 Pacing engine

- **Metronome:**
  - 30–240 BPM, tap tempo;
  - time signatures 2/4, 3/4, 4/4, 6/8;
  - accented downbeat, subdivisions (8ths, triplets, 16ths);
  - 1–2 bar count-in;
  - visual beat strip;
  - click volume separate from the guide volume.
- **Drum beats (simple, synthesized, no samples needed):**
  - 8-beat pop/rock, 16-beat, ballad (slow 6/8), shuffle, bossa, hip-hop;
  - basic fills off by default.
- **Timing:** sample-accurate scheduling in native code on one audio clock. Every take stores its beat timeline, so the review lines up beats against the voice.
- **Speech pacing:** a gentle "pacer" (soft tick at a target syllable rate, or one tick per phrase), plus a live pace gauge. The gauge is **off by default**, because live gauges distract **[R]**.

### 3.5 Takes library

- Every take keeps:
  - its WAV, or AAC plus a WAV copy;
  - input and output devices;
  - tempo and beat timeline;
  - exercise or plan;
  - metrics;
  - transcript, for speech.
- The library can filter, favourite, delete and share or export takes.
- **Retention.** Takes are kept until deleted, with a storage meter. Notes on takes use visible save feedback **[FT-27]**.

## 4. Song coach

Built from the singing-app study **[R]**. The core is a **guided-to-unguided ladder**, Singing Carrots' strongest pattern.

1. **Range test.** Glide low and high, sustaining each extreme for at least 1 s of steady pitch. The result is the comfortable range and a voice-type *guess*, labelled as a heuristic. It is re-run from Settings, and every exercise is generated inside the range.
2. **Warm-ups** (5–10 min presets): lip trills or hums at a comfortable pitch, sirens and glides, 5-note scales, and breathing with a timer.
3. **Exercises**, generated in the user's range and key with reference tones (piano-like synth) and the metronome:
   - sustain a note (stability score);
   - match a note heard once, then sing it unaided;
   - scales: major, minor, 5-note, octave;
   - intervals (sing the 3rd or 5th from a reference);
   - arpeggios;
   - pitch-glide accuracy.
4. **Ladder, per exercise:**
   1. with the reference tone and the target line;
   2. target line only;
   3. reference once, then silent;
   4. blind, with the score shown after.
5. **Song practice (v1):**
   - sing over a beat or click with the live pitch graph and a recording;
   - later (P4): sing along with a streaming app, the backing builder, and **guide extraction** from a guide recording the user makes ("match the guide");
   - no file import and no song catalogue (Q6).
6. **Scoring:**
   - time within ±25 / ±50 cents, mean absolute cents, stability (SD cents), and onset timing against the beat;
   - every score is explained in words, because scores without explanation are a top complaint **[R]**;
   - one next action per take.
7. **Not in v1:** style grading, vibrato coaching, any health or medical advice (v1-spec carry-over).

## 5. Speech coach

Built from the speech-coach study **[R]**. Market gap found: no surveyed app combines **planning (outline plus time per section) with rehearsal and section-level feedback**. That is the core here.

### 5.1 Practice modes

1. **Prepared speech:** a plan, then rehearsal (5.3).
2. **Read aloud:**
   - teleprompter text with a target pace;
   - script-to-transcript alignment shows skipped, added and misread words;
   - articulation drills, for example 간장공장 tongue twisters and an English minimal-pair list.
3. **Question prompts:** interview or Q&A. A question is shown and optionally spoken, then a timed answer of 30, 60 or 120 s.
4. **Impromptu:** a random topic, a 20 s prep timer, then a timed talk.
5. **Free talk:** record and analyse.

### 5.2 Transcript and metrics

- **Transcript:**
  - live captions while speaking come from the on-device recognizer, as a draft;
  - **after the take, the accurate transcript comes from the user's PC server** (Qwen3-ASR with word timestamps from the forced aligner, the same stack as Field Voice Log) **[Q3]**;
  - the transcript is editable, plays from a tapped word, and marks fillers, long pauses (with duration), repetitions and hedges inline.
- **Pace:**
  - **Korean in syllables per minute or second, English in WPM** **[R]**;
  - speaking rate (pauses included) and articulation rate (pauses excluded) are shown separately;
  - a rolling 10–15 s pace timeline with a target band.
- **Target bands:**
  - set per task, with defaults from the research:
    - English presentations 130–165 wpm;
    - Korean, about 4.8 syllables/s with pauses and about 6 without, measured on general speakers;
    - news anchors are about 5.9 syllables/s and are not a target **[R]**;
  - "learn my baseline" after 3 takes;
  - the bands are adjustable.
- **Other metrics:**
  - pause count and length;
  - fillers: an editable list per language; Korean defaults 음, 어, 그, 저, 약간, 이제, 뭐랄까; English um, uh, like, you know, so;
  - repeated words;
  - volume consistency and sentence-end trail-off;
  - **pitch variation in semitones** (a monotone indicator).

  The pitch and volume graphs are the same as in the song coach.
- **ASR drops fillers** **[R]**. Fillers are therefore counted from an audio heuristic (short voiced segments with flat pitch between words) as well as from the transcript, with both counts shown as estimates.

### 5.3 Planning and rehearsal

- **Plan:**
  - goal, audience and total time limit;
  - sections, each with key points and a time budget;
  - an optional full script.
- **AI help (optional):** turn notes into an outline; suggest a time budget; shorten a section **[Q4]**.
- **Rehearsal:**
  - the current section and its key-point cue card;
  - a section timer against the budget;
  - a tap or the word "next" moves to the next section;
  - the beat or pacer is optional.
- **Report:**
  - time per section against the plan;
  - pace per section;
  - key points covered or missed (matched against the transcript);
  - fillers per section;
  - one next action;
  - retry without grading and compare with the previous take (Google pattern **[R]**).

### 5.4 Privacy

- Audio and transcripts stay on the phone and the user's own server.
- Any cloud LLM call is opt-in per session and shows exactly what is sent **[R]** **[Q4]**.

## 6. Technical architecture

### 6.1 Native module `vc-audio` (Kotlin)

It replaces the current `vlc-voice-coach` capture path and reuses its f0 analyser. It runs one audio engine on one clock.

- **Capture:**
  - AudioRecord with the explicit input, locked per take;
  - 48 kHz;
  - written to WAV, flushed regularly and recovered after a crash, as in Field Voice Log;
  - silenced detection.
- **Live analysis:** YIN/MPM f0, which already exists, plus RMS and peak at 50 Hz. Frames carry time, f0, cents, note, voicing, RMS and peak. An optional neural f0 model (SwiftF0-class) for noisy rooms comes later **[R]**.
- **Output:**
  - one low-latency AudioTrack (AAudio-backed) with USAGE_MEDIA and the selected device;
  - a mixer for metronome clicks, drum voices and reference tones (simple synthesis, no sample files);
  - sample-accurate scheduling, exposing the beat timeline;
  - playback of takes and of the user's backing files.
- **Shared code.** Input and output device lists and preferences, matched by type, name and address hash, plus the Field Voice Log patterns: auto-stop policy, waveform buckets, playback events, and the in-app update helpers. Copy them first, then extract them into a shared package once both apps use them.
- **Calibration:** a tap test, and an optional loopback test, give a latency offset per output device.
- **Session service.** The existing `vlc-session-service` (always-on STT and TTS with VOICE_COMMUNICATION) is **not used by Voice Coach in v1**. Voice commands are off. Applying FT-04, it must never auto-resume and must set `setPrivacySensitive(false)` if it runs at all.

### 6.2 App (Expo, TypeScript)

The same architecture rules as Field Voice Log's `ARCHITECTURE.md` **[FT-28, FT-29]**:
- **Sources of truth:**
  - native engine: capture, playback, beat and route state;
  - SQLite: takes, plans, exercises, results, progress;
  - server: final transcripts.
- **One derivation layer** of pure functions produces statuses, control states and scores. Screens render only derived state.
- **Reconcile** on start and on resume.
- **Navigation:** Home is the root; leaving a screen pops it; deep links get `initialRouteName`.
- **Lint:** `eslint-plugin-react-hooks` is required, and `pnpm check` runs typecheck, lint and tests before every release **[FT-31]**.
- **Analysis code:** `packages/voice-analysis` is reused and extended with speech metrics, Korean syllable counting, filler and pause detection, and script alignment.

### 6.3 Server (the user's PC, tailnet)

- **Same box as Field Voice Log.** It is the user's "home server" for both apps **[Q3]**. Options:
  - add app-scoped routes to `services/field-log-server`, which is fastest and reuses the enrolment, ASR jobs, aligner and app updates;
  - or split a shared `home-server`.
- **New:**
  - enrolment for the Voice Coach app, with its own device token;
  - `POST /v1/coach/transcribe` (upload a take, get the transcript with word timestamps; the Qwen3-ASR and aligner job queue are reused);
  - app updates keyed by package name (`app_builds.package`).
- **Optional:** a local LLM on the RTX 4090 for outline and feedback text **[Q4]**.

### 6.4 Auto update

The same mechanism as Field Voice Log **[FT-30]**:
- `GET /v1/app/latest` and `GET /v1/app/apk/{sha}` with a `package` parameter;
- a resumable download with a SHA-256 check, the system installer, and cleanup afterwards;
- a strictly increasing versionCode (minutes since 2026-01-01 UTC);
- `scripts/release-android.sh` in `apps/mobile`, with the private GitHub draft as the fallback.

**First install:** the first build that has the updater comes from the GitHub draft.

## 7. Phases

Each phase ends with a release build installed through the updater, a device test checklist, and field-test-log entries.

| Phase | Content | Done when |
|---|---|---|
| **P0 Foundation** | Rename and icon; hide modes; bottom tabs; app ARCHITECTURE.md; lint and check; mic-ownership fixes (FT-04); server enrolment and auto update for Voice Coach; field-test log | The user updates in-app and sees the new shell |
| **P1 Studio** | `vc-audio` engine: explicit input/output pickers, locked per take; live pitch and volume graphs; metronome and drum beats; latency calibration; takes with review graphs and playback | Record over a beat with earbuds output and the phone mic; the graphs and the beat grid line up in review |
| **P2 Song coach** | Range test; warm-ups; generated exercises with the ladder; scoring with explanations; progress and streak | A 10-minute routine runs end to end, with scores that make sense |
| **P3 Speech coach** | Practice modes; server transcript with word timing; pace, pause, filler, repetition and pitch-variation metrics; planning, rehearsal and section report; read-aloud alignment | A planned 3-minute talk gives a section report with pace per section |
| **P4 Polish** | Sing along with a streaming app; backing builder (chords and style); guide extraction from the user's own recording; take comparison; optional local LLM outline and feedback; export; progress dashboard | — |

## 8. Delegation

Implementation is delegated through Whistler; see `/home/jaeil/.local/state/whistler/skills/whistler-delegate/SKILL.md`.

- **Coordinator (me):**
  - write the contracts first: native module types, the server API section and the data model;
  - give each worker one narrow assignment with its files and checks;
  - review the diffs;
  - run `pnpm check`, Gradle, pytest and the release script;
  - commit, push and keep the logs.
- **Workers:** Codex, in separate git worktrees so they don't collide. The available catalogue lists `gpt-6.1-sol`, `gpt-6.1-terra`, `gpt-6-luna`, `gpt-5.6-*` and others; the catalogue does not state sizes **[Q5]**. Proposal:

  | Worker | Owns | Model | Effort |
  |---|---|---|---|
  | `native-audio` | `modules/vc-audio`: DSP, scheduling, latency | `gpt-6.1-terra` | high |
  | `app-ui` | screens, stores, derivation, tests | `gpt-6-luna` | medium |
  | `server` | enrolment, coach transcribe, update keying | `gpt-6-luna` | medium |
  | `analysis` | `packages/voice-analysis` speech metrics and scoring | `gpt-6-luna` | medium |

  At most 3 workers run at once.
- **Rules passed to every worker:**
  - no hand edits in `android/` (prebuild);
  - heavy builds only under the flock + `systemd-run` memory cap;
  - English code and docs;
  - no commits (I commit);
  - report changes and tests.

## 9. User decisions (2026-11-07)

- **Q1 Name.** The visible app becomes "Voice Coach / 보이스 코치"; the package id is kept. Agreed.
- **Q2 Default input.** Phone mic by default; earbud mics are allowed but warned about. Agreed.
- **Q3 Server.** Voice Coach routes are added to the existing field-log server on the user's PC (transcripts and updates). Agreed.
- **Q4 AI text.** No LLM text in P0–P3; rule-based feedback only. A local LLM on the RTX 4090 is considered in P4. Agreed.
- **Q5 Workers.** Codex workers through Whistler: `gpt-6.1-terra` at high effort for native audio, and `gpt-6-luna` at medium for app, server and analysis. At most 3 at once. Agreed.
- **Q6 Backing tracks.** **Not agreed: no file import.** The user finds importing MP3s impractical. Two later features replace it (P4):
  - **Sing along with a streaming app.** Music plays in another app (Spotify, YouTube Music) while Voice Coach records the voice from the mic and analyses pitch. Android lets two apps play and record at the same time, and with earbuds as the output the song does not reach the mic. Capturing the streaming app's audio itself is not planned: most streaming apps block playback capture **[I]**.
  - **Backing builder.** The user enters a key, a tempo, a time signature and a chord chart (for example `| C | G | Am | F |`) and picks a style. The app synthesizes drums, bass and simple piano or guitar chords. The guide extraction in section 4 then works on the user's own guide recording only.
