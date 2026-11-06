# Field Voice Log: Field-Test Issue and Fix Log

**Purpose.** This log records every problem found while building and testing Field Voice Log, with its root cause, the fix, the evidence and the lesson. Use it when redesigning the app or the service, writing requirements for the next slice, or explaining design choices. It holds what the code and the git history do not: why a behaviour exists, what we tried, and what users actually hit.

**How to add an entry.** Append to the table with the next ID. Mark the status as **Fixed** (with the commit), **Open** or **Decision**. Label claims as measured (**M**), observed by the user (**U**), inferred (**I**) or vendor-stated (**V**). Dates are absolute.

**Test setup.**
- **Phone:** Galaxy S25 (SM-S931N), Android 17, LTE. It reaches the server over the Tailscale DERP relay "tok", about 280 ms by `tailscale ping`.
- **Earbuds:** QCY HT08 MeloBuds Pro Plus (Bluetooth, used over SCO).
- **Server:** the RTX 4090 Linux box at 100.84.83.35:8787.
- **Engines:** final text Qwen3-ASR-1.7B, live draft Nemotron 3.5 streaming (CPU), word timing Qwen3-ForcedAligner-0.6B.
- **Contract and requirements:** [api-v0.md](api-v0.md) and [mvp-requirements.md](mvp-requirements.md).

## 1. Issue log

### Capture and audio

| ID | Date | Symptom | Root cause | Fix or decision | Status | Lesson |
|---|---|---|---|---|---|---|
| FT-01 | 2026-11-06 | The app had no microphone permission after install | `expo-image-picker` with `microphonePermission: false` adds `tools:node="remove"` for RECORD_AUDIO to the merged manifest (**M**) | Removed that plugin option and rebuilt | Fixed (732ae14) | Check the merged manifest after adding any Expo plugin that touches permissions |
| FT-02 | 2026-11-06 | Recording kept running about 3 s after Stop | Stop waited up to 3 s for a fresh GPS fix before releasing the mic (**M**) | `fastLocation(400)`: last known fix, at most 400 ms, at start and stop | Fixed (6d080ee) | Never put a network or sensor wait on the start/stop path |
| FT-03 | 2026-11-06 | Every recording since 17:54 was digital silence (−96 dBFS) | The older Voice Life Companion prototype was opened by mistake (same icon) and restored a session. Its foreground service held the mic with `VOICE_COMMUNICATION`, which Android treats as privacy-sensitive, so it silences every other capture, even the app on screen. `dumpsys audio` showed "silenced" for all Field Voice Log sessions (**M**) | Field Voice Log: silenced-capture detection (`AudioRecordingCallback.isClientSilenced` plus a 1.5 s zero-run check), a `capture_state` event and a red banner. Force-stopped Voice Life Companion. A distinct orange icon | Fixed for Field Voice Log (49fb663). Voice Life Companion's policy is still open, see FT-04 | A background app can silently zero your capture. Detect it and say so, and never assume the mic is yours |
| FT-04 | 2026-11-06 | (Policy) Two voice apps on one phone block each other | Voice Life Companion auto-resumes listening on launch and uses a privacy-sensitive source (**I**, from FT-03) | Proposed policy for both apps:<br>1. hold the mic only in a session the user started, with a Stop action;<br>2. never auto-resume listening;<br>3. prefer non-privacy-sensitive sources or `setPrivacySensitive(false)`;<br>4. yield when silenced;<br>5. idle timeout;<br>6. no silent fallbacks | Open (Voice Life Companion not changed yet) | Write a mic-ownership policy before shipping a second audio app |
| FT-05 | 2026-11-06 | The user could not tell whether the phone mic or the earbuds were used | The input was recorded in events but not shown | An input chip with friendly route names, and per-segment input in the memo and on the dashboard | Fixed (49fb663, 9e2d356) | Show the active input before and during recording |
| FT-06 | 2026-11-06 | Connecting earbuds did not change the input | Android records from the phone mic unless the app picks a Bluetooth device. The saved choice was a numeric `AudioDeviceInfo` id, which changes on every reconnect (**M**) | An input preference (`auto`, `phone` or `device`, matched by type, name and address hash). Auto picks a connected headset at Record | Fixed (9e2d356) | Never persist Android device ids |
| FT-07 | 2026-11-06 | Every Bluetooth recording began on the phone mic and moved to the earbuds about 0.5 s later | The communication device was set after capture started (**M**, from `route_changed` events) | Choose the device and wait up to 1 s for the communication device before starting capture | Fixed (9e2d356) | — |
| FT-08 | 2026-11-06 | (Decision) Should the input switch when earbuds connect or disconnect mid-recording? | The first build switched live, like a call app. The user wanted recorder behaviour | **Decision (user):** lock the input per recording, like voice-recorder and camera apps. The only forced switch is a fallback to the phone mic when the locked device disconnects. One input per segment | Decision, implemented (35706b8); user test passed | A record must have a stable input; calls and records need different routing rules |
| FT-09 | 2026-11-06 | Recordings with the earbuds had wrong words: "bar" became "밤", "log" became "lock", "진동" became "진통" | Bluetooth HFP is speech-band only. The earbuds' high-band share was about 2% against 3–4% for the phone mic, and the peak was about 10 dB hotter (**M**, n=4 pairs) | None yet. Phone mic recommended for transcription. The app warns that earbud mics run in call mode | Observed | Earbud input costs accuracy on terms and numbers. Measure per route (S-3) |
| FT-10 | 2026-11-06 | Earbuds left on the desk with the speaker far away gave nonsense ("원리선생님…") | Earbud mics and their noise suppression are tuned for the wearer's mouth, so far speech is treated as noise. The high-band share was 19%, the highest of the session, at a low level (**M**, **U**: hard to understand on playback) | None. Idea: a "speech too far or too quiet" warning from the speech-band SNR while recording | Open idea | Earbuds help only when worn. Hands-free with the phone set down should use the phone mic |

### Live draft and transcription

| ID | Date | Symptom | Root cause | Fix or decision | Status | Lesson |
|---|---|---|---|---|---|---|
| FT-11 | 2026-11-06 | The live draft was very slow and missed quiet speech | Empty endpoints reset the live stream and dropped audio (**M**). Long polls spun because the cursor overlap (5 s) and the `>=` query re-returned rows | Server endpoint fix with a regression test. Long-poll overlap set to 1 s | Fixed (6d080ee) | — |
| FT-12 | 2026-11-06 | Silent segments came back as text that repeated the language hint | Qwen3-ASR echoes its context string on silence (**M**) | Energy gate (speech-band peak below −65 dBFS, or digital silence, gives no speech, and the model is not called); no language hint in the context; echo guard; `fls rerun --silent` | Fixed (49fb663) | Never call the ASR on audio with no energy. The context string is for vocabulary only |
| FT-13 | 2026-11-06 | No live draft for English speech | The live draft was forced to the first language, Korean. Nemotron forced to ko returns nothing for English, and forced to en nothing for Korean. `auto` matched the forced language on both (**M**, replay of the user's memos) | Live draft and Nemotron replays use `auto` when more than one language is selected | Fixed (9e2d356) | Test every language setting on real speech, not only on paper |
| FT-14 | 2026-11-06 | Hallucinated stock phrases ("안녕하세요", "감사합니다") on segments without speech | Noise above the energy gate (handling, taps, clipped bursts) reaches the model. Auto detection often says zh, the forced Korean re-decode then produces a stock phrase (**M**: `auto(zh)->forced:ko` on such segments; **U**: phrases seen in the app) | In progress:<br>1. Silero VAD gate (`no_voice`);<br>2. stock-phrase guard tied to VAD speech duration and word coverage (`stock_phrase`);<br>3. out-of-list detection with little speech skips the re-decode;<br>4. "Transcribe anyway" for the user | Open (server round 7) | Treat out-of-list language detection on short audio as a non-speech signal. Always let the user override a filter |
| FT-15 | 2026-11-06 | Numbers written inconsistently: "3번, 9시" in one take, "삼반, 아홉 시" in another | Qwen3 output style varies with the audio (**M**) | None yet. Candidates: personal vocabulary (A12) and a rule-based number normaliser for display and CER | Open | Normalise numbers before computing CER, or the metric misleads |
| FT-16 | 2026-11-06 | The live draft is much worse than the final text ("전공" for "점검", "김민수들입니다") | A streaming 0.6B model on CPU is expected to be weaker (**V** FLEURS-ko CER about 7%, **M** user memos) | By design: the draft is only reassurance and the final text replaces it | Accepted | Show the draft as provisional (grey) |

### UX

| ID | Date | Symptom | Root cause | Fix or decision | Status | Lesson |
|---|---|---|---|---|---|---|
| FT-17 | 2026-11-06 | "The UX is confusing": unclear recording controls, and no way to check that something was recorded (**U**) | One Start/Stop toggle, no state line, no playback | Labelled Record / Pause / Resume / Stop / Record more / Play / Save & close / Delete, a state line, a live scrolling waveform with a dBFS readout and level bands, and playback with waveform, playhead and seek | Fixed (49fb663) | Show recording state in words plus a live level; let the user hear the result at once |
| FT-18 | 2026-11-06 | The memo list was hard to scan (**U**) | Rows showed only a time | Editable title (`memo_titled`), auto title from the transcript, date and time line, and a 2-line transcript preview | Fixed (9e2d356) | — |
| FT-19 | 2026-11-06 | Recording continued after leaving the memo screen or the app (**U**) | No lifecycle rule | Native `ProcessLifecycleOwner` ON_STOP stops and saves (`left_app`). It does not stop on permission dialogs, the notification shade or screen-off. Leaving the memo screen stops and saves | Leaving the app: fixed (35706b8), user test passed. Screen-off keeps recording: passed. **Back button: failed on the device**, being fixed (app round 8) | Use process stop, not activity pause, for "user left". Test navigation paths on a device |

### Build, install and repository

| ID | Date | Symptom | Root cause | Fix or decision | Status | Lesson |
|---|---|---|---|---|---|---|
| FT-20 | 2026-11-06 | Taildrop install was very slow | The path to the phone goes over the DERP relay on LTE, and Taildrop needed sudo (**M**) | Installed over USB with `adb install -r` | Workaround | Use USB for development installs; a direct tailnet path needs the same Wi-Fi or UDP 41641 |
| FT-21 | 2026-11-06 | `adb install` hung | A Play Protect dialog on the phone waits for a tap (**M**) | Run installs in the background with a long timeout and tell the user to tap install | Workaround | Expect the prompt on every sideload of a debug-signed build |
| FT-22 | 2026-11-06 | The Kotlin recorder module had never been committed | `apps/field-log/.gitignore` used `android/`, which also matched `modules/fl-native/android/` (**M**) | Changed to `/android/`, ignored module build outputs, and committed the 24 source files | Fixed (9e2d356) | After adding a native module, run `git status --ignored` on it |
| FT-23 | 2026-11-06 | Two Field Voice Log memos took about 7 s to upload, against about 1.2 s normally | Unknown: the outbox interval or LTE (**M**) | Not investigated | Open | — |

## 2. Test results

### 2026-11-06 18:43–18:48: first ASR test set

Read sentences, phone at 20–30 cm. The final text is Qwen3; Nemotron is the live draft. Sentences:
1. 오늘 3번 라인 컨베이어 점검 완료했고, bearing 교체는 내일 오전 9시에 진행합니다. 담당자는 김민수 대리입니다.
2. 압력은 2.5 bar, 온도는 섭씨 78도, 진동 값은 4.2 mm/s로 기준치보다 15퍼센트 높습니다.
3. Pump number two is leaking near the outlet valve. Please shut it down before the night shift and log the work order.
4. 점심 이후 2공장 순찰 결과입니다. 첫째, 프레스 A 구역 안전 펜스가 일부 열려 있어서 바로 닫았습니다. 둘째, 지게차 통로에 팔레트가 세 개 방치되어 있었고, 물류팀에 연락했습니다. 셋째, compressor room 환기팬 소음이 평소보다 크니까 maintenance 요청 넣어주세요. 마지막으로 내일 TBM 때 보호안경 착용 다시 강조하겠습니다. (The user skipped some ordinals while reading; both engines agree.)

| Input | Test | Final-text result |
|---|---|---|
| Phone mic | Korean with English terms | Correct, except "3번" became "삼반" |
| Phone mic | Numbers and units | All correct ("2.5bar, 섭씨 78도, 4.2밀리미터/퍼세컨드, 15%") |
| Phone mic | English | Perfect |
| Phone mic | Long memo, 26 s | Split cleanly at a sentence break (21 s and 5 s). Errors: "2공장" became "이 공장", "A 구역" became "의 이 구역" |
| Earbuds | Korean with English terms | Perfect |
| Earbuds | Numbers | "bar" became "밤", "진동" became "진통" |
| Earbuds | English | "log" became "lock" |
| Earbuds | Pause and resume | Order kept; "maintenance" became "마인트너스" |
| Earbuds on the desk, speaker far away | Korean | Unusable (FT-10) |

Final text arrived about 1.5–2 s after Stop: upload about 1.2 s, ASR 0.4–1.3 s, RTF 0.03–0.07 (**M**).

### 2026-11-06 19:13–19:15: lifecycle and input-lock test (19:12 build)

| Check | Result (**U**, matches events **M**) |
|---|---|
| Back while recording stops and saves | **Failed** (FT-19) |
| Leaving the app stops and saves | Passed (`left_app`) |
| Screen off keeps recording | Passed |
| Earbuds connecting mid-recording do not switch | Passed |
| Earbuds into the case fall back to the phone mic | Passed (`device_disconnected`) |

## 3. Open items carried forward

- FT-04: mic-ownership policy for Voice Life Companion.
- FT-10: far or quiet speech warning.
- FT-14: no-speech detection, in progress.
- FT-15: number normalisation and personal vocabulary (A12).
- FT-19: Back button stop, in progress.
- FT-23: occasional upload delay.
- Noisy-environment test set, postponed by the user on 2026-11-06. Record the same sentences with the phone mic and with the earbuds in the same noise.
