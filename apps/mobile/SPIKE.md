# Week-1 feasibility spike: screen-locked voice pipeline (Android)

Purpose: prove the combined foreground service, VAD + on-device STT, TTS cues, native due-event timer, fused location and audio routing work with the **screen locked** on a Galaxy S25 (SM-S931N). Pass criteria come from `docs/products/voice-life-companion/technical-decisions.md` section 10 item 1. This is a spike: the UI is a diagnostic screen, not a product screen.

Status when this was written (2026-11-03): the debug and release builds compile (`tsc --noEmit` also passes); nothing has been run on a device yet. Every runtime behaviour below is untested until the walk test.

## What is in the app

- `modules/vlc-session-service/` is a local Expo module (Kotlin, Android only) with one foreground service (`location|microphone|mediaPlayback`). Packages inside it are laid out so it can later split into the three planned modules:
  - `service/` foreground service, cue timer, capability report, JS<->service rendezvous
  - `audio/` `AudioRecord` capture thread (`VOICE_COMMUNICATION`, 16 kHz mono PCM16), communication-device routing
  - `speech/` Silero VAD + sherpa-onnx streaming zipformer pipeline, model catalog/downloader, Android `TextToSpeech`
  - `location/` fused location at about 1 Hz with gap tracking
  - `log/` JSONL diagnostics, battery sampling, summary
- `src/SpikeScreen.tsx` is the spike screen (`App.tsx` just renders it).
- `app.json` uses `expo-build-properties` to build only `arm64-v8a` (faster builds, smaller APK) and `expo-sharing` for "Share log". Permissions and the service declaration come from the module's `AndroidManifest.xml` (merged at build); `android/` is generated and not edited by hand.

### sherpa-onnx dependency

Not on Maven Central (checked 2026-11-03). The official Android artifact is the release AAR `sherpa-onnx-2.0.1.aar` (Kotlin API + JNI + onnxruntime, about 26 MB) from https://github.com/k2-fsa/sherpa-onnx/releases/tag/v2.0.1. `modules/vlc-session-service/android/build.gradle` downloads it at Gradle configuration time into `android/libs/` (git-ignored), verifies SHA-256, and adds it with `implementation files(...)`. First build needs internet. To upgrade, change `sherpaVersion` and `sherpaSha256` there.

### Models (downloaded in-app, never bundled)

URLs, sizes and SHA-256 are constants in `speech/ModelCatalog.kt`; the downloader writes to `<filesDir>/vlc-models/<set>/`, verifies size and SHA-256, and emits progress.

| Set | Source | Download size |
| --- | --- | --- |
| `vad` | Silero VAD, k2-fsa `asr-models` release asset (`silero_vad.onnx`) | 0.64 MB |
| `ko` | `kangkyu/icefall-asr-ko-streaming-zipformer-174m` on Hugging Face (Apache-2.0), int8, chunk-16 / left-128 files | about 159.7 MB |
| `en` (optional) | `csukuangfj/sherpa-onnx-streaming-zipformer-en-2023-06-26` (Apache-2.0), int8, chunk-16 / left-128 | about 72.7 MB |

The Korean model's file layout matched what sherpa-onnx needs (separate encoder/decoder/joiner/tokens), so the fallback `sherpa-onnx-streaming-zipformer-korean-2024-06-16` was not needed.

## Build and install

Toolchain: `source scripts/android-env.sh` (repo root) for JDK 17 and the Android SDK.

```bash
cd apps/mobile
npx expo prebuild -p android --clean     # generates android/ (git-ignored)
cd android && ./gradlew :app:assembleDebug
# APK: apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Install on the phone, either way:

1. Direct: enable Developer options + USB debugging, connect USB (or Android 11+ Wireless debugging: `adb pair <ip:pairing-port>`, then `adb connect <ip:port>`), then `npx expo run:android` from `apps/mobile` (builds and installs; it also starts Metro).
2. APK file: `adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`, or copy the APK to the phone (cloud drive, USB) and open it (allow "install unknown apps" for the file manager).

A **debug** APK loads its JS bundle from Metro. For a locked-screen walk the phone must reach the dev server: keep `npx expo start --dev-client` running on a laptop on the same Wi-Fi (not workable outdoors), **or** build a release-mode APK that embeds the JS bundle: `cd android && ./gradlew :app:assembleRelease` (signed with the debug keystore by the Expo template; fine for the spike; output `android/app/build/outputs/apk/release/app-release.apk`, build verified, install untested). Use the release APK for the walk.

## Before the walk (at a desk, on Wi-Fi)

1. Open the app, tap **Request permissions** and allow microphone, precise location ("While using the app" is enough because the session starts in the foreground), notifications, and Nearby devices (Bluetooth connect). In Android settings, set the app's battery usage to **Unrestricted** (record this in the report; the capability report shows `ignoringBatteryOptimizations`).
2. Choose language `ko`, tap **Download vad + ko** and wait for READY (about 160 MB).
3. Tap **Capability report** and keep the output: TTS engines and whether `ko-KR` / `en-US` offline voices are installed, on-device recognition availability, AEC availability, Play Services status. If no offline ko-KR voice is installed, install one (Settings > General management > Text-to-speech) before the walk.
4. Tap **Start session**, say a sentence, watch the partial and final transcript, tap **Speak**, then **Stop session**. This verifies the stack before you leave.

## 30-minute locked-screen walk test

Run it twice: once with earbuds (select the Bluetooth device in the route picker first), once with the phone mic.

1. Tap **Clear log**. Battery above 80 percent, unplugged.
2. Set the cue interval to 60 s, **Start session** (screen on, app visible), switch the cue switch on. Optionally tap **Mark: earbuds** (or **Mark: phone mic**).
3. Lock the screen and put the phone in a pocket. Walk 30 minutes outdoors. Now and then speak a short Korean sentence (for example "오늘 일정 알려줘"); the native echo guard means speech while a cue is playing will be suppressed on purpose.
4. Mid-walk, once: turn the earbuds off for 10 s and on again (or tap **Mark: BT reconnect** first). Reconnection behaviour is logged as `route_change` / `record_route`.
5. Unlock, check the notification is still there, open the app, **Summary**, then **Share log** (sends `diag.jsonl`). Also tap **Stop session** and confirm the notification disappears (and that the notification's **Stop** action works if you try it in another run).

## Metrics vs the section 10 pass criteria

| Criterion (technical-decisions.md section 10.1) | Where to read it | Meaning |
| --- | --- | --- |
| STT and VAD run the whole walk without silent stops; restarts logged and recovered | `audio_stats` every 10 s (frames, rms, peak), `recorder_restart`, `audio_silent_warning`, `record_config` (`clientSilenced`), summary `recorderRestarts`; `final_transcript` / `speech_start` counts | rms/peak of exactly zero for 30 s means Android is silencing the client. A restart count above 0 is acceptable only if each restart shows `ok: true` |
| Cues start within 1 s of due time, native timer fire to audible TTS; JS wake latency separate | summary `cueFireToAudibleMs` (p50/p95/max) is the pass number. `cueNativeFireDriftMs` = native fire vs scheduled time; `cueJsAckMs` = native fire to JS `ackCue` (the JS wake latency); `cueFallbackSpoken` > 0 means JS missed the 700 ms ack window and native speech took over; `ttsSpeakToStartMs` = `speak()` call to TTS `onStart` | "Audible" is TTS `onStart` (engine started), which can precede real sound by a few tens of ms. The pass criterion is max (or p95) `cueFireToAudibleMs` under 1000 |
| Location fixes continue at the configured rate; gaps and accuracy logged | summary `locationFixCount` (expect about 1800 for 30 min), `locationGapsOver5s`, `locationMaxGapMs`, `locationAccuracyM`; on screen: fixes / last accuracy / max gap | The first gap entry (`afterFirstFix: false`) is time to first fix, not a dropout |
| Battery use recorded | summary `batteryFirstPct`, `batteryLastPct`, `batteryMaxTempC`; `battery` events each minute (with temperature and current) | Percent drop over the 30 minutes with the screen locked; judged by the user |
| Actual input route matches selection and survives disconnect/reconnect | `audio_open.route`, `record_route` (AudioRecord routed device), `route_select`, `route_change`; on screen: "comm device" and "record routed" | `recordRoutedDevice` should be the Bluetooth device when earbuds are selected and the built-in mic otherwise |

Also recorded: TTS engines (capability report) and `endpointLatencyMs` (VAD end-of-speech decision to final text; real end of speech is about 500 ms earlier, `trailingSilenceMs`). Not covered by this build: ML Kit GenAI availability and the Kakao walking-route call (section 10 "also record" items).

Log events (JSONL in `<filesDir>/vlc-diag/diag.jsonl`; each line has `t` epoch ms, `rt` elapsedRealtime ms, `ev`): `service_start`, `service_running`, `service_stop`, `pipeline_ready`, `audio_open`, `audio_stats`, `recorder_restart`, `speech_start`, `final_transcript`, `final_empty`, `echo_policy`, `echo_suppressed`, `barge_in`, `tts_request`, `tts_start`, `tts_done`, `cue_scheduled`, `cue_fire`, `cue_ack`, `cue_js_timeout`, `cue_audible`, `location_fix`, `location_gap`, `route_select`, `route_change`, `record_route`, `battery`, `capability_report`, `marker`, `error`. Partial transcripts are not logged (too noisy).

## Behaviour notes and design choices

- **Start rule:** the session starts only while the activity is visible (Android 14+). `startSession` rejects with `NOT_VISIBLE` otherwise. The notification **Stop** action stops the service.
- **VAD gating:** Silero VAD decides utterance boundaries (0.5 s trailing silence, 0.25 s minimum speech, 30 s hard cap); the recognizer only decodes during speech, with a 640 ms pre-roll. The recognizer's own endpointing is off.
- **Self-echo guard:** default half-duplex. If TTS is speaking (or spoke within the last 600 ms) when speech starts, or TTS starts during the utterance, the final transcript is dropped and logged as `echo_suppressed` unless **Barge-in** is on; with barge-in on, TTS is stopped on speech start and the final is emitted flagged `duringTts`. Platform AEC and noise suppression are attached to the `AudioRecord` when available (`audio_open.aecEnabled`).
- **Cues:** `scheduleCue(id, atEpochMs, fallbackText)` posts to a Handler (uptime clock) and sets an inexact `setAndAllowWhileIdle` alarm 1.5 s later as backup. While a session runs, a partial wake lock keeps the CPU awake so the uptime clock tracks real time. On fire: `cueDue` to JS; JS calls `ackCue` (synchronous) then `speak(..., cueId)`; with no ack in 700 ms the service speaks the fallback text itself.
- **Routing:** the picker lists `AudioManager.availableCommunicationDevices` (Android 12+). Selecting one sets `MODE_IN_COMMUNICATION` and TTS then uses voice-communication usage; **Auto (clear)** returns to `MODE_NORMAL` and assistant usage. Selecting the built-in earpiece will play TTS from the earpiece.

## Known limitations

- Untested on hardware; thresholds in the pass criteria are proposals.
- Samsung One UI may still throttle or kill background work; check `audio_silent_warning`, a missing notification, and the battery setting above.
- Expo's default `minSdk` is 24, but the code assumes the S25 (Android 15/16): API 26+ calls (notification channel, audio focus request) are not guarded for older phones. Android 12+ is needed for communication-device routing.
- Stopping from the notification runs teardown on the main thread (it joins the capture thread, normally under 100 ms).
- Android-only; no iOS code. Only one session at a time; no resume after process death (`START_NOT_STICKY`).
- The `ko` model is a 174M int8 transducer: expect a few hundred MB RAM and noticeable CPU; check `battery` and `batteryMaxTempC`. English and Korean are separate sessions (restart to switch).
- "Audible" latency is measured at TTS `onStart`, not at the speaker.
- Bluetooth: SCO / LE Audio headsets appear only after `BLUETOOTH_CONNECT` is granted; classic Bluetooth headset mics are narrowband, so STT accuracy may drop with earbuds.
- No ML Kit GenAI probe, no Kakao route call, no vocal-take capture mode.
- The partial transcript is only emitted while speech is detected, at most every 150 ms.
