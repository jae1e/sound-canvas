# Voice Coach UX v2: recorder-first redesign

**Status:** design, 2026-11-07. Implementation started the same day (phase P1′). It supersedes the screen design in [voice-coach-renovation-plan.md](voice-coach-renovation-plan.md) sections 2–5 where they differ. The audio policies in plan sections 3.1–3.4 still apply.

## 0. Why

The user tested build 446772 on 2026-11-07 and rejected the UI: "The UI is not to my liking. It has to be much simpler and more intuitive. There are too many buttons. For singing we don't need target notes or sessions; show a sound-wave waveform (like volume) and pitch on the first screen, like a recording app. Implement all the other requirements I gave before. Make input and output convenient to adjust and visible. Redesign speaking too, thinking it through deeply: use my requirements, design the UX a speech needs, and keep the UI simple and intuitive."

A second message the same day: "It is good for Speak and Sing to share components, but the same UI layout may be wrong because their purposes differ. Design the UI carefully. Delegate the implementation to Codex, but do the design yourself, because Codex is weak at design."

**Screen designs.** [design/voice-coach-ui-v2.html](design/voice-coach-ui-v2.html), rendered as [design/voice-coach-ui-v2.png](design/voice-coach-ui-v2.png). The designs are made by the coordinating agent (Claude), not by a Codex worker, as the user asked. **Where this text and the screen designs differ, the screen designs win.**
- Sing is a dark "stage": pitch and waveform fill the screen.
- Speak is a light "desk": the plan, time and cue card lead, and the voice graph is a thin strip.
- They share components (audio bar, sheets, record button, take review), not layouts.

**User decisions in that message (2026-11-07):**
- The song coach has **no target notes, no exercises and no sessions** in this version. Planned exercises, the ladder and the range test (plan section 4) are dropped for now.
- The first thing the user sees is a **recorder**: live waveform and live pitch.
- Input and output are **always visible** and easy to change.

**Requirements still in force (2026-11-07 list):**
- explicit mic choice;
- output selectable and following the Field Voice Log policy;
- volume waveform and pitch graphs;
- metronome and simple drum beats;
- for speech: an AI transcript, pace measurement, planning and practice;
- auto update.

## 1. Design principles

1. **One screen per coach, one big button.** Every screen has one primary action, Record. Everything else is a chip or a sheet.
2. **Show, don't ask.** The graphs run as soon as the coach screen is visible, like a tuner. Nothing has to be set up before the first take.
3. **Settings live where they act.** Input and output are chips on the recorder, tempo is a chip on the recorder, and the plan is a card on the speech recorder. The Settings screen only holds server, update, language and Labs.
4. **Results in words first, then graphs.** After a take: one summary line, one next action, then details.
5. **No silent action.** Every tap gives feedback (ARCHITECTURE.md "Feedback rule").
6. **Live graphs are independent of recording** (user, 2026-11-07). The graphs show the live microphone whenever a recorder screen is open: before, during and after a take. Recording never changes their look, pauses them, or covers them. Result cards sit below the graphs. Recording is shown only by the record button, which becomes a stop square, and the red timer.

## 2. Navigation

```
┌─────────────────────────────┐
│ 노래 · Sing   [⚙]          │  header: screen title, gear = Settings (pushes a screen)
│                             │
│         …screen…            │
│                             │
├─────────────────────────────┤
│  🎵 노래   🎤 말하기   📂 기록  │  3 tabs
└─────────────────────────────┘
```

- **Tabs:** 노래 (Sing) · 말하기 (Speak) · 기록 (Takes). The app opens on **노래**, or on the last used tab.
- **Home is removed.** The recorder is the first screen, as the user asked.
- **Settings** is a gear icon in the header. It pushes a screen, and Back pops it.
- **Update:** a dot on the gear when a newer build exists, plus a one-line banner in Settings.

## 3. Shared recorder parts

### 3.1 Audio bar, at the top of both recorders

```
┌──────────────────────────────────────────────┐
│ 🎙 휴대폰 마이크 ▾        🎧 Galaxy Buds3 ▾  │
└──────────────────────────────────────────────┘
```

- **Input chip.** It shows the active microphone by name. Tapping it opens the **input sheet**:
  - a radio list of available inputs (phone mic, wired/USB, Bluetooth headset), each with a **live level bar** so the user can see which mic hears them;
  - a note under Bluetooth mics: "통화 품질 마이크 — 노래에는 휴대폰 마이크를 권장" (call-quality mic; the phone mic is recommended for singing);
  - the default is the phone mic (Q2), and the choice is remembered.
- **Output chip.** It shows where sound plays. Tapping it opens the **output sheet**:
  - a radio list: 시스템 기본 (system default, follows Android), wired, Bluetooth, phone speaker;
  - a **테스트 소리** (test sound) button and a media-volume slider;
  - for Bluetooth output only, **지연 보정** (latency calibration): tap along with 8 clicks; the measured offset is saved for that device and shown ("보정됨 182 ms").
- **During a take** both chips show a lock icon. Tapping them says "녹음 중에는 바꿀 수 없어요" (can't change while recording). The input is locked per take; if the device disconnects, the take continues on the phone mic and a toast says so (FVL FT-08).

### 3.2 Live graphs

- **Pitch:** a scrolling piano roll over the last 8 s, with note lanes labelled C3, D3 …, auto-centred on the voice. The big current note sits top right, for example "A3 +12¢" (센트, cents). Unvoiced frames show as gaps. There is no target band.
- **Waveform:** a scrolling amplitude waveform under the pitch graph, the same width, like a voice recorder. A small dB readout, with a red edge when near clipping.
- **Live preview:** both graphs run while the screen is focused and the app is in the foreground, so the user sees their voice before recording.
  - The preview stops on blur or background, and never runs in the background.
  - The capture does not silence other apps (VC-01).

### 3.3 Record control

```
          ┌────┐
   [♩ 92]  │ ●  │  [▶ 0:42]
          └────┘
     tempo  record   last take
```

- **Record ●** is the big centre button. Tap to start; it turns into **■ stop** with the elapsed time. There is no pause, which keeps it simple.
- **Left: tempo chip.** "♩ 끔" (off), or "♩ 92 · 8비트" (92 BPM, 8-beat). Tapping it opens the **beat sheet**:
  - on/off;
  - BPM slider 40–220 with − and + buttons, and **탭 템포** (tap tempo);
  - time signature 4/4 · 3/4 · 6/8 · 2/4;
  - pattern: 클릭 (click) · 8비트 (8-beat) · 16비트 (16-beat) · 발라드 (ballad) · 셔플 (shuffle) · 보사 (bossa) · 힙합 (hip-hop);
  - count-in of 1 bar, on or off;
  - beat volume.

  The beat plays as soon as it is on, so the user can rehearse with it. When Record is pressed with the beat on, the count-in plays and recording starts on beat 1.
- **Right: last take.** "▶ 0:42" opens the last take's review.
- **Leaving the screen or the app** stops and saves the take (FVL FT-19). Turning the screen off keeps recording.

### 3.4 Take review, used by both coaches

- **Header:** date and time, length, input used, and the beat if one was used.
- **Graphs:** the same pitch and waveform graphs over the whole take, with a playhead. Tap or drag to seek. Beat lines show if a beat was used.
- **Transport:** ▶/⏸ and a ±5 s skip. It plays on the selected output.
- **Actions:** 이름 바꾸기 (rename), 삭제 (delete), 공유 (share the WAV).

## 4. Song coach (노래 tab)

```
┌──────────────────────────────────────────────┐
│ 🎙 휴대폰 마이크 ▾        🎧 Galaxy Buds3 ▾  │
├──────────────────────────────────────────────┤
│                                     A3 +12¢  │
│  C4 ─────────────────────────────────────    │
│  B3 ─────────────────────╭──╮────────────    │   pitch roll
│  A3 ──────────╭─────────╯  ╰──────── •      │
│  G3 ─────────╯───────────────────────────    │
├──────────────────────────────────────────────┤
│ ▁▂▅▇▅▃▂▁▂▃▆█▆▃▂▁▁▂▄▆▅▃▂▁              -18 dB │   waveform
├──────────────────────────────────────────────┤
│                                              │
│      [♩ 92 · 8비트]    ( ● )    [▶ 0:42]     │
└──────────────────────────────────────────────┘
```

**After a take**, a compact result card slides up above the record control and can be dismissed:
- "0:42 · 음역 G3–C5 · 음정 안정도 좋음" (pitch range G3–C5, pitch stability good);
- "박자: 평균 +35 ms 늦음", the average lag behind the beat, only when a beat was on;
- one next action, for example "높은 음에서 음정이 흔들려요. 박자를 80으로 낮춰 다시 해보세요." (Pitch wavers on high notes. Try again with the beat at 80.)
- Tapping the card opens the review (3.4).

**Not shown: targets, exercises, sessions or scores.** Stability, range and timing are derived from the take with no setup.

## 5. Speech coach (말하기 tab)

### 5.1 What a speaker needs (from the speech study and the user's requirements)

A speaker practises one talk several times before it matters. They need to know:
1. Am I within the time?
2. Am I too fast or too slow?
3. Did I cover each point?
4. Do I use fillers, long pauses, or a monotone voice?

They need a plan to rehearse against, a quiet companion while speaking (time, section, pace), and a short honest report afterwards with one thing to fix. Then they go again and compare. Free talk, reading a script, and impromptu answers are the same loop with a different plan.

### 5.2 The speech recorder

```
┌──────────────────────────────────────────────┐
│ 🎙 휴대폰 마이크 ▾        🎧 시스템 기본 ▾   │
├──────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │
│ │ 📝 신제품 발표                  목표 3:00 │ │  plan card (tap → plan editor)
│ │ 1 도입 0:30 · 2 문제 1:00 · 3 해결 1:30   │ │  or "자유 말하기 — 탭해서 계획 추가"
│ └──────────────────────────────────────────┘ │
│  ▁▂▅▇▅▃▂▁▂▃▆█▆▃▂▁▁▂▄▆▅▃▂▁  (waveform)        │
│  ~~~~~~~~ pitch line (small) ~~~~~~~         │
├──────────────────────────────────────────────┤
│        [⏱ 3:00]      ( ● )      [▶ 지난 연습] │
└──────────────────────────────────────────────┘
```

- **Plan card**, one tap target. It shows the current plan, or "자유 말하기" (free talk) with a hint to add a plan. Tapping it opens a plan list: recent plans, **+ 새 계획** (new plan), **즉흥 주제** (impromptu topic), **면접 질문** (interview question), **대본 읽기** (read a script).
- **Timer chip:** the target time, or 없음 (none). It defaults to the plan's total.
- **Graphs:** a waveform and a small pitch line, so the user can see monotone delivery and trailing off. Pitch matters less in speech than in singing, so it is smaller.

### 5.3 While speaking

```
┌──────────────────────────────────────────────┐
│  1:12 / 3:00                     ● 녹음 중    │   big elapsed / target
├──────────────────────────────────────────────┤
│  2 / 3  문제                       0:28 남음  │   current section (tap anywhere → next)
│  • 고객이 매일 겪는 불편                       │
│  • 기존 제품의 한계                            │
├──────────────────────────────────────────────┤
│  속도  ▮▮▮▮▮▮▮▯▯  적당 (≈ 5.1 음절/초)        │   pace band: 느림 / 적당 / 빠름
│  ▁▂▅▇▅▃▂▁▂▃▆█▆▃▂ (waveform)                  │
├──────────────────────────────────────────────┤
│                    ( ■ )                     │
└──────────────────────────────────────────────┘
```

- **Time:** a large elapsed / target clock. It turns amber at 90 % of the target and red when over.
- **Current section:** its key points as a cue card and the time left in the section. Tap the card to go to the next section; the tap time is the section boundary. Without a plan this area is hidden.
- **Pace:** a calm three-zone band (느림 slow / 적당 good / 빠름 fast) over the last 10 s, estimated on the device from syllable nuclei in the audio. It needs no network. A toggle in the beat sheet hides it, for people who find it distracting [R].
- **Pacer (optional):** the tempo chip on this tab means a soft tick at a target speaking rate. Off by default.
- **Read-script mode:** the cue card becomes a large teleprompter that scrolls at the target pace, and a tap pauses the scroll.
- **Impromptu and interview:** the prompt is shown, then a 20 s preparation countdown ("준비 0:15"), then recording starts by itself with a 60 s target.

### 5.4 Report after the take

```
┌──────────────────────────────────────────────┐
│  2:54 / 3:00  ✓ 시간 안에 끝냈어요              │
│  ┌────────┬────────┬────────┬────────┐       │
│  │ 속도    │ 군말    │ 멈춤    │ 억양    │       │  4 tiles, each: value + 좋음/주의
│  │5.4 음절/초│ 7회   │ 긴 멈춤 2│ 단조로움 │       │
│  └────────┴────────┴────────┴────────┘       │
│  👉 다음엔: "2번 섹션이 40초 길었어요. 핵심 2개로 줄여보세요." │
├──────────────────────────────────────────────┤
│  섹션    계획   실제   속도                     │
│  1 도입  0:30  0:26  적당                       │
│  2 문제  1:00  1:40  빠름 ⚠                    │
│  3 해결  1:30  0:48  적당 · 핵심 1개 빠짐        │
├──────────────────────────────────────────────┤
│  속도 그래프 (시간축, 목표 띠, 섹션 경계)         │
├──────────────────────────────────────────────┤
│  전사  (전사 중… → 문장)                        │
│  오늘은 [음] 신제품을 소개하려고 … ⏸1.8s …       │  fillers highlighted, long pauses marked,
│                                              │  tap a word → play from there
├──────────────────────────────────────────────┤
│      [↻ 다시 하기]            [▶ 듣기]           │
└──────────────────────────────────────────────┘
```

- **The result in one line:** time against the target.
- **Four tiles:**
  - **속도 (pace):** Korean in syllables per second, English in WPM, with articulation rate shown separately.
  - **군말 (fillers):** count, from the transcript plus an audio estimate.
  - **멈춤 (pauses):** pauses over 1.5 s.
  - **억양 (intonation):** pitch variation in semitones, judged 단조로움 (monotone) / 좋음 (good).

  Each tile shows good or caution against the user's band. The default bands come from the speech study, and "내 기준 배우기" (learn my baseline) applies after 3 takes.
- **One next action,** chosen by rules in v1; no LLM (Q4).
- **Section table,** with a plan: planned against actual time, pace per section, and key points covered or missed (matched against the transcript).
- **Pace graph** over time, with the target band and section boundaries.
- **Transcript** from the home server (Qwen3-ASR with word timestamps):
  - while it is processing the card says "전사 중…" (transcribing); when offline, "서버 연결 시 전사돼요" (transcribed once the server is reachable), and it retries later;
  - fillers are highlighted, long pauses marked "⏸1.8s", and tapping a word plays from there.
- **다시 하기 (retry)** starts the next take with the same plan. The report then shows "지난번보다" (compared with last time) deltas on the tiles.
- **Saved automatically.** The take and report appear in 기록 (Takes).

### 5.5 Plan editor (one screen, no wizard)

- **Title,** and the **target time** (a picker: 1, 2, 3, 5, 10 min, or custom).
- **Sections:** a list of rows, each with a name, key points (one per line), and an optional time. **시간 자동 배분** (auto-split the time) fills the empty times in proportion to the number of key points.
- **Optional script:** "대본 붙여넣기" (paste script) switches the plan to read-script mode, and the report then shows skipped and misread words (script alignment).
- **Language:** auto, 한국어 or English. It sets the pace unit and the filler list.
- **Prompt lists:** 즉흥 주제 and 면접 질문 are built-in lists in Korean and English (about 30 each). One is drawn at random, and **다른 주제** (another topic) draws again.

## 6. Takes (기록 tab)

- A single list, newest first. Each row: 🎵/🎤 icon, title (the plan title or "노래 녹음" / song recording), date, length, and a one-line result.
- Filter chips: 전체 (all) · 노래 (song) · 말하기 (speech).
- Tapping a row opens the review (3.4); for speech, the report (5.4).
- Swipe or long press to delete, with confirmation.

## 7. Settings (gear)

- **서버 연결 (server):** status, URL and pairing.
- **앱 업데이트 (app update).**
- **언어 (language).**
- **음성 기본값 (voice defaults):** pace unit and band, editable filler list, show the live pace on or off.
- **저장 공간 (storage):** total used by takes.
- **실험실 (Labs):** show hidden modes.

## 8. What is cut or deferred

- **Song:** targets, exercises, the ladder, range test, scoring and streak. Range and stability are shown per take instead.
- **Session concept and voice commands:** removed from the UI. The old session service is not used by Voice Coach.
- **Home tab:** removed.
- **Deferred:**
  - Live captions while speaking. The transcript comes after the take, and live text distracts [R].
  - Take comparison overlay.
  - Sing-along with a streaming app, and the backing builder (plan Q6, P4).

## 9. Implementation split (phase P1′)

| Worker | Scope |
|---|---|
| native (`gpt-6.1-terra`, high) | New module `modules/vc-audio`, contract in `modules/vc-audio/src/VcAudio.types.ts`. Capture with input selection (port of FVL Inputs/InputResolver), live frames (pitch from the existing FrameAnalyzer, peak and RMS, syllable nucleus), take writing at 48 kHz plus a 16 kHz mono copy for ASR, output selection and playback, the beat engine (synthesized click and drum kit, count-in, sample-accurate), test tone, latency calibration clicks, auto-stop on leaving the app, take analysis (contour, peaks, speech nuclei and pauses) |
| app (`gpt-6.1-terra`, high; UI quality was the issue) | Navigation (3 tabs and a gear), audio bar and sheets, live graphs, record control, beat sheet, song result card, speech recorder, plan editor, prompt lists, speech report, takes list, review, settings cleanup, DB migration (take kind, plans, reports) |
| server (`gpt-6-luna`, medium) | `POST /v1/coach/transcribe` and `GET /v1/coach/transcripts/{id}` (coach-server-api section 3) |
| analysis (`gpt-6-luna`, medium, after the server) | `packages/voice-analysis`: Korean syllable counting, pace bands, fillers, pauses, pitch variation, section timing and key-point coverage, script alignment, next-action rules, baseline |

Before a build goes to the user, every screen is screenshotted on an emulator, if the user agrees to install one, and checked against this document (VC-04 lesson).
