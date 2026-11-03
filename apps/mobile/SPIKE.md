# Week-1 feasibility spike: screen-locked voice pipeline (Android)

On-device test checklist for the three product modes: [TESTING.md](TESTING.md).

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
| `tts-supertonic` (TTS lab) | `csukuangfj2/sherpa-onnx-supertonic-3-tts-int8-2026-05-11` on Hugging Face: 7 files (4 int8 ONNX + `tts.json`, `unicode_indexer.bin`, `voice.bin`), same content as the 128.8 MB tts-models release tarball | about 145.3 MB |
| `tts-kokoro-en` (TTS lab) | `kokoro-int8-multi-lang-v1_0.tar.bz2` from the k2-fsa `tts-models` release (Kokoro-82M v1.0 int8). One archive, extracted in-app (commons-compress), Chinese/GB lexicon and `dict/` skipped | 132.4 MB download, about 150 MB on disk after extraction (the archive is deleted) |

Model licenses (recorded 2026-11-03; every model must allow commercial use; verify again before shipping). Source links are also in the `ModelCatalog.kt` comments.

| Model | License (source) | Commercial use | Flags |
| --- | --- | --- | --- |
| Silero VAD | MIT, https://github.com/snakers4/silero-vad/blob/master/LICENSE | yes | none |
| Korean zipformer ASR | Apache-2.0, https://huggingface.co/kangkyu/icefall-asr-ko-streaming-zipformer-174m | weights yes | **Dataset doubt**: trained on KsponSpeech + "AIHub mix" (about 6,500 h). AI Hub / KsponSpeech data terms are separate from the weights' Apache-2.0 tag and have historically restricted use; needs legal review |
| English zipformer ASR | Apache-2.0, https://huggingface.co/csukuangfj/sherpa-onnx-streaming-zipformer-en-2023-06-26 | yes | LibriSpeech-trained (CC BY 4.0) |
| Supertonic 3 TTS | **OpenRAIL-M** (weights), https://huggingface.co/Supertone/supertonic-3 (LICENSE); sample code MIT | allowed **with use-based restrictions** (License Attachment A) that must be passed on to downstream users; licensor reserves the right to restrict violating use | Not an OSI open-source license. The upstream repo https://github.com/supertone-inc/supertonic is archived (no further fixes expected). Check Attachment A against the product (e.g. voice cloning / impersonation clauses) |
| Kokoro-82M v1.0 TTS | Apache-2.0, https://huggingface.co/hexgrad/Kokoro-82M | yes (card says "deployed in commercial APIs") | **Dataset doubts**: card says training audio includes synthetic speech from closed TTS providers (their output terms are not documented), plus CC BY audio that needs attribution (Koniwa tnc CC BY 3.0, SIWIS CC BY 4.0). The sherpa-onnx package also ships `espeak-ng-data`, and espeak-ng is GPL-3.0: review before shipping in a closed-source app |
| ML Kit GenAI TTS | Google ML Kit terms + Google Speech Services voices; SDK `com.google.mlkit:genai-text-to-speech:1.0.0-alpha1` | not assessed | **Alpha, no SLA or deprecation policy**; only Pixel 8-11 and Galaxy S25/S26/Fold8/Flip8 class devices; needs current Speech Recognition & Synthesis app |

The Korean model's file layout matched what sherpa-onnx needs (separate encoder/decoder/joiner/tokens), so the fallback `sherpa-onnx-streaming-zipformer-korean-2024-06-16` was not needed.

## Speech output route and the TTS A/B lab

### Why this exists

On the first S25 run, cue TTS reported `onStart` within 50 ms and the user heard nothing: `dumpsys audio` showed the Google TTS AudioTrack (`USAGE_ASSISTANT`) routed to `AUDIO_DEVICE_OUT_BLUETOOTH_A2DP`, a device the route picker never showed (the picker lists only *communication* devices). "TTS started" says nothing about where it is audible, so the app now reports the real route.

### Output route (top banner on the screen, `speech_output_route` in the log)

- Source: `AudioManager.getAudioDevicesForAttributes(AudioAttributes(usage, CONTENT_TYPE_SPEECH))` (API 31+) for the usage the engine really uses (`USAGE_ASSISTANT`, or `USAGE_VOICE_COMMUNICATION` when a communication device is selected or the speaker is forced), plus the full `getDevices(GET_DEVICES_OUTPUTS)` list (A2DP, BLE, USB, wired, speaker...) and the current communication device. For engines that own their AudioTrack (sherpa-onnx), `AudioTrack.routedDevice` is reported too (`trackRouted`).
- Logged and sent as the `speechOutputRoute` event at every `tts_start` (cue TTS and lab), on `AudioDeviceCallback` add/remove, and when the mode changes. Log fields: `reason`, `usage`, `mode`, `label`, `ok`, `warning`, `planned`, `trackRouted`, `allOutputs`, `communicationDevice`, `audioMode`.
- Banner text: "Speech output: Bluetooth A2DP - <productName>". It switches to a warning style when the device is neither the phone speaker nor the communication device you picked in section 4 (`ok: false`). Wired/USB headsets you did not select also warn on purpose: the point is "never silently play somewhere you did not choose".
- Meaning of "planned": what the platform would route a new track with those attributes to. It is a prediction at `tts_start` time, not a measurement of the other process's track; `dumpsys audio` remains the ground truth for platform engines.

### Force phone speaker (`setSpeechOutput('auto' | 'speaker')`, default `auto`)

| Engine kind | Method used | Logged as |
| --- | --- | --- |
| Out-of-process: Google/Samsung `TextToSpeech`, ML Kit GenAI (which wraps `TextToSpeech`), cue TTS | `AudioManager.mode = MODE_IN_COMMUNICATION` + `setCommunicationDevice(builtin speaker)`, and the TTS gets `USAGE_VOICE_COMMUNICATION` attributes (`TextToSpeech.setAudioAttributes`). Voice-communication tracks follow the communication strategy, which `setCommunicationDevice` controls, so the engine's own track lands on the speaker. | `speech_force_speaker`, `speech_output_mode` (method), `tts_start.method` / lab `info.method` = `communication_device(builtin_speaker)+voice_communication` |
| In-process: sherpa-onnx Supertonic/Kokoro (our `AudioTrack`) | `AudioTrack.setPreferredDevice(builtin speaker)` with normal `USAGE_ASSISTANT`; any communication route we set earlier is released first. | `info.method` = `preferred_device(builtin_speaker)`, `info.preferredDeviceApplied` |

The routing is applied lazily right before each utterance, so it also survives the session's `clear()` on stop. Picking a device in the section 4 picker turns the forced mode off (your explicit choice wins); "Auto (clear)" only drops the communication route, and the forced route is re-applied on the next utterance.

Trade-offs of the communication-device method (this is the weak part; verify on the phone):
- Volume: speech now follows the voice-call volume stream, not media/assistant volume. The phone may be quiet until the call volume is raised.
- While `MODE_IN_COMMUNICATION` is active, Bluetooth earbuds are pushed out of the A2DP media path (music in other apps may switch or route oddly), and the system treats the app like a call: other apps' audio focus and ducking can differ.
- It matches the VOICE_COMMUNICATION capture the session already uses (AEC/NS, mic on the built-in microphone when the speaker is the communication device), which is a benefit for the half-duplex echo story but means earbud mic input is not used while forced.
- A TTS engine that ignores `setAudioAttributes` (some OEM engines) would still go to A2DP; the route banner would then show the warning.
- Alternative not implemented: `TextToSpeech.synthesizeToFile` and play the PCM through our own AudioTrack with `setPreferredDevice`. That gives deterministic routing for every engine but loses streaming (first-audio latency = whole synthesis).

### TTS lab output and volume (2026-11-03, after the first S25 run)

- The lab never forces the speaker and never sets `MODE_IN_COMMUNICATION` / a communication device. Default output is **System route (Auto)**: it follows the OS (Bluetooth earbuds when connected). The picker lists connected outputs (phone speaker, Bluetooth A2DP / LE, wired, USB). In-process engines (sherpa Supertonic/Kitten/Kokoro) apply the pick with `AudioTrack.setPreferredDevice`; platform engines (Google, Samsung, ML Kit) cannot be routed and follow the system route (the panel shows a note, and the route report says where they will actually play).
- Lab audio uses media-style attributes (`USAGE_MEDIA` + `CONTENT_TYPE_SPEECH`), and the activity's `volumeControlStream` is `STREAM_MUSIC` while the app is in the foreground, so the hardware keys change media volume. The panel has a 0-100 % slider that sets `STREAM_MUSIC` (it follows hardware key presses by polling). Audio mode is logged as `audio_mode` at lab start/end and self-test start/end.
- Self-test: uses the selected output; per-engine "Test this engine"; **Stop** cancels mid-run (utterance, download, gap); 1 s gap between engines; each `tts_lab_selftest` / `tts_lab_selftest_done` event carries `outputSelection`. ko and en are separate rows.
- Cue path: the session's force-speaker option still uses the communication-device method, but the route is now released whenever TTS goes idle (`speech_force_speaker_released`).
- R8 and sherpa: the generator callback is the named class `SherpaAudioCallback` because sherpa-onnx's JNI looks up `Function1.invoke(float[]): Integer`; a Kotlin lambda was rewritten by R8 and aborted the process. Keep rules are in `consumer-rules.pro`.
- ML Kit: `tts_lab_mlkit_probe` logs every voice and its status for the requested locale, ko-KR and en-US.

### TTS A/B panel (section 6b)

One text box (defaults: the Korean pasta sentence, or an English equivalent when en-US is chosen), a language switch, and per engine: **Prepare** (bind/load/check), **Speak**, a voice picker, and engine specific controls. Results list request -> first-audio latency, total time, the output device used (red when it triggers the route warning), and for sherpa engines generation time, audio length and RTF.

Procedure:
1. Choose the language. For Supertonic and Kokoro tap **Download** on desktop Wi-Fi (about 145 MB and 132 MB), wait for READY.
2. Tap **Prepare** on each engine once (so latency excludes load/bind), then **Speak** two or three times. Compare the first Speak (cold) and later ones.
3. Compare naturalness by ear, and note the output route line for each result. If the route warning shows, flip **Force phone speaker** and repeat.
4. Tap **Share log** and keep `tts_lab_*` and `speech_output_route` events.

Engines:
- **Platform - Google** (`com.google.android.tts`): lists installed voices for the chosen language, "Local voices only" hides voices that need the network (names ending in `-local` are the offline ones); pick one before **Speak**. Latency = `UtteranceProgressListener.onStart`.
- **Platform - Samsung** (`com.samsung.SMT`): `TextToSpeech(ctx, listener, "com.samsung.SMT")` does not fall back to the default engine, so success means that engine bound. Prepare reports `requestedEngine`, `defaultEngine`, `boundEngine` (via the hidden `getCurrentEngine()`, null when blocked), `installedEngines`. If init fails or `requestedInstalled` is false, the engine is not usable by third-party apps on this phone. Selectable for A/B only if it initialises.
- **ML Kit GenAI TTS**: Prepare shows the per-voice `checkStatus` (`UNAVAILABLE`, `DOWNLOADABLE`, `DOWNLOADING`, `AVAILABLE`); voices with `DOWNLOADABLE` get a **Download voice** button with progress; errors (unsupported device, missing/outdated Speech Services, error codes) are shown as text. **Important finding from decompiling the SDK**: it calls `TextToSpeech.setAudioAttributes(request.audioAttributes)` + `speak()` and exposes `onAudioAvailable` as `AudioAvailable`, so the SDK plays the audio itself inside Google Speech Services; the PCM chunks are a copy and their sample rate is undocumented. The panel therefore measures first audio from the first chunk (fallback: playback `START`), and offers an optional "also play chunks with our AudioTrack" switch with an assumed PCM16 mono sample rate (default 24000; wrong rate = pitch/speed off, and expect double audio). Default is off.
- **Supertonic 3 (sherpa-onnx OfflineTts)**: Korean is `extra["lang"]="ko"` in `GenerationConfig` (English `en`), `numSteps` 8, speaker id from `numSpeakers()` (upstream presets are named M1-M5/F1-F5; the sherpa package does not label them, so only `sid N` is shown). Generation runs on a background thread, float PCM is streamed into an `AudioTrack` from the generator callback. Reported: generation ms (excluding time blocked on playback), audio seconds, RTF, first chunk ms.
- **Kokoro 82M (sherpa-onnx, English only)**: voices are sid 0-27 (US `af_*`/`am_*`, GB `bf_*`/`bm_*`); default sid 3 `af_heart`. Same measurements as Supertonic.

Code layout: `speech/engine/SpeechEngine.kt` (interface: `supports(locale)`, `prepare`, `voices`, `speak(request, callback)`, `stop`, `release`), `PlatformTtsEngine`, `MlKitTtsEngine`, `SherpaTtsEngine`; `speech/TtsLab.kt` owns instances and measurement; `audio/SpeechOutput.kt` owns route reporting and forcing. The session's cue TTS (`TtsController`) still uses the platform default engine; it already shares `SpeechOutput` (routing and usage). Selecting an engine per locale for cues is not wired: engines are selected by id and `supports(locale)` is in place for it.

Build notes: ML Kit GenAI and its kotlin-stdlib 2.4.0 are newer than Expo SDK 58's Kotlin 2.2 compiler, so the module compiles with `-Xskip-metadata-version-check` (runtime uses stdlib 2.4.0). R8 keep rules for sherpa-onnx JNI and ML Kit are in `consumer-rules.pro`; commons-compress (tar.bz2) is a new dependency.

## STT lab (speech to text with live text)

Added 2026-11-03; nothing here has run on a device yet. UI: the first section of the spike screen. Code: `speech/stt/` in the module, `src/SttLabPanel.tsx`, `src/sttParse.ts`. The lab plays no audio (the platform recognizer may play its own start/stop earcons; the system volume is never touched) and refuses to start while a session owns the microphone. The session uses `PlatformSttEngine` by default (see "Hands-free session with platform STT" below) and `SpeechPipeline` as the sherpa option / fallback.

- `SttEngine` interface (`id`, `locale`, `supportsStreaming`, `start/stop/release`, callbacks `onPartial/onFinal/onError/onState`). Korean and English are separate engines/models behind it.
- `PlatformSttEngine`: `SpeechRecognizer.createOnDeviceSpeechRecognizer` when `isOnDeviceRecognitionAvailable` (API 33+), else `createSpeechRecognizer` + `EXTRA_PREFER_OFFLINE` (the used path is shown as "recognizer path"). Partial results on. Continuous listening through `EXTRA_SEGMENTED_SESSION` (API 33+, switchable in the UI because recognizers may ignore it) or a restart loop with exponential backoff. All calls on the main thread. `PlatformSttSupport` reports `checkRecognitionSupport` and triggers `triggerModelDownload` (ko-KR / en-US buttons).
- `SherpaStreamingSttEngine`: the zipformer sets `ko` / `en` (+ optional `vad`), fed continuously by `SttMicCapture`; sherpa endpoint rules (0.8 s trailing silence) end utterances; partials come from `getResult`.
- Language auto-detection layers (all logged as `stt_lang_detect`): (1) platform detection extras + `onLanguageDetection` (API 34+, only if the recognizer implements it), (2) dual decoding with both sherpa models, winner by mean token log-probability (Hangul ratio and length are the tie-break), (3) `LangPolicy` for platform finals: an empty/low-confidence/NO_MATCH result flips the locale of the next utterance, the last detected language is the prior.
- Mic: Phone (default) or Bluetooth headset via `setCommunicationDevice` (released with `MODE_NORMAL` on stop). Sherpa captures with its own AudioRecord (routed to the BT input); the platform recognizer picks its own input, so the UI shows the best-effort observed route from the system recording configurations.
- Log events: `stt_start`, `stt_state`, `stt_partial` (throttled 500 ms), `stt_final`, `stt_error`, `stt_lang_detect`, `stt_support`, `stt_mic_route`, plus `stt_sherpa_empty_segment` (diagnostics when sherpa decodes nothing).
- Sherpa `ko` is marked "dev reference - not shippable (training-data license unclear)".

### Latency fields and n-best selection (2026-11-03, after the first S25 run)

First S25 run (Android 17, Google SODA via Android System Intelligence, Auto): platform language detection worked (`onLanguageDetection` fired, finals switched ko/en); `segmentedSeen:false`, so the restart loop is used. `endToFinalMs` was 0 or 1 and `firstPartialMs` was sometimes negative. Causes fixed: timestamps lived in two places (engine and lab) and the lab's `firstPartialRt` survived across utterances that ended in NO_MATCH / timeout (no final to reset it), so a partial from an earlier utterance was subtracted from a later `onBeginningOfSpeech`; and `onEndOfSpeech` is reported by the service together with the final, so end-to-final is genuinely ~0 there.

Each engine now owns one `UtteranceTiming` (`SttEngine.kt`), reset per `startListening` / per segment / per sherpa endpoint, all `SystemClock.elapsedRealtime()`:
`listenStartRt` (startListening called), `readyRt` (onReadyForSpeech), `speechBeginRt` (onBeginningOfSpeech; sherpa: VAD estimate), `firstPartialRt`, `lastPartialRt`, `speechEndRt` (onEndOfSpeech; may be missing; one arriving after the final is ignored and counted as `lateEvents`), `finalRt`. Derived: `readyMs`, `beginToFirstPartialMs`, `endToFinalMs` (null without an end event), `lastPartialToFinalMs`, `beginToFinalMs`. A derived value is null when an input is missing or the difference would be negative. They are in `stt_final.timing` and shown in each lab history row (with raw times relative to `listenStartRt`). `lastPartialToFinalMs` is the more useful number on SODA. Not measured: the user's real last word (the platform gives no timestamp for it), so none of these include the recognizer's own trailing-silence wait.

n-best: `chooseHypothesis(hypotheses, lang, ctx)` (session-engine) prefers a hypothesis containing a task/timer label or a word from `src/data/cooking-words.ts`, else the first that parses with high confidence, else the top one. The lab shows the chosen text and marks it when it is not the recognizer's top (e.g. "리조트 5분 타이머" -> "리조또 5분 타이머").

### Hands-free session with platform STT (2026-11-03, untested on hardware)

Session option `sttEngine`: `platform` (default; on-device SpeechRecognizer, `SessionStt.kt`) or `sherpa` (old `AudioCapture` + `SpeechPipeline`, dev option and automatic fallback). Selector in the session section. Language: Auto with platform detection, the session language is the prior. Finals go out as `finalTranscript` (same event as sherpa, plus `alternatives`, `lang`, `timing`) into `src/voiceLoop.ts`: `handleUtterance` (`chooseHypothesis` with the session's open task and live timer labels -> `parseUtterance` -> `apply`) -> `describeChanges` / `describeRejection` -> `speak`. Unrecognised speech stays silent; queries, journal, recording and navigation intents are only noted in the message list (not implemented yet). A 1 s JS tick announces due timer events. Replies use the session language (the TTS voice is fixed per session).

- One recorder: with platform STT the app's `AudioCapture` is not started (the recognition service records for us); the level meter comes from `onRmsChanged`. Starting a session while the STT lab runs is refused. `AudioCapture` starts only on fallback.
- Half-duplex: `TtsController.onActiveChanged` pauses recognition (`stt_paused_for_tts`, `SpeechRecognizer.cancel()`) when the first utterance is queued and resumes 450 ms after the last one finished (`stt_resumed`). Barge-in is ignored for platform STT.
- Background / screen-off is the open question: does the system recognizer keep recording for our microphone FGS? Detection (`SessionStt`): a screen receiver logs `stt_screen_off` / `stt_screen_on` with state, last-callback age, error counts, recorder configs and `isClientSilenced`, and `stt_screen_off_probe` at +10 s, +30 s and +2 min (callbacks and finals since screen off); `stt_health` every 30 s; `stt_recording_configs` when the number of silenced system recordings changes; `stt_level_floor` when onRmsChanged sits at its floor for 15 s. Automatic fallback to sherpa (`stt_fallback` with `reason`, plus `sessionSttEngine` event and a note in the UI) on: fatal error / error state, 4 hard errors in a row, no `onReadyForSpeech` for 10 s, no recognizer callback at all for 25 s, or a silenced recording for 5 s. If sherpa models are missing the fallback is skipped (`fallbackAvailable:false`, `STT_FALLBACK_UNAVAILABLE`). Known blind spot: a recognizer fed digital silence produces only SPEECH_TIMEOUT cycles and looks healthy, so rely on `isClientSilenced` / `stt_level_floor` and on the manual test below.

Test procedure (S25, platform ko-KR and en-US on-device models installed, sherpa vad + ko + en downloaded so the fallback can run):
1. Grant permissions, choose Session STT = Platform, Start session while the screen is on. Expect `stt_session_start`, `pipeline stt=true engine=platform`, no `audio_open` line.
2. Say "파스타 3분 타이머", "리조또 5분 타이머", "pasta 3 minutes", "3분", "Hey Google turn". Expect spoken acknowledgements for the timers, none for the last one; transcript rows show the chosen alternative and `turn:`; the TTS must not be transcribed (`stt_paused_for_tts` then `stt_resumed` around every reply).
3. Lock the screen (press power), wait 10 s, speak a timer command, listen for the acknowledgement. Repeat after 2 minutes and after 10 minutes. Unlock and share the log.
4. In the log check: `stt_screen_off` and the probes (`callbacksSinceScreenOff` grows, `finalsSinceScreenOff` > 0 after you spoke), `stt_recording_configs` (`silenced` must stay 0), absence of `stt_fallback`, and the `final_transcript` rows with `screenOn:false`.
5. Pass: finals keep arriving with the screen off for 10 minutes without `stt_fallback`. If `stt_fallback` appears, record its `reason`, confirm the sherpa pipeline then answers (`stt_engine_sherpa_start`, `audio_open`), and note whether the platform recognizer worked at all in the background. Also test with another app in the foreground, and with a Bluetooth headset.
6. Repeat once with Session STT = Sherpa to compare accuracy and latency (`timing` is only in platform finals; sherpa pipeline keeps `endpointLatencyMs`).

### Why the session pipeline logged `final_empty`

Not reproduced offline: the same model files, config, VAD gating, pre-roll and tail padding decode TTS-generated Korean and English test sentences correctly with the sherpa-onnx Python bindings, so the root cause is something only the device has (real microphone signal, AEC/NS output, or the VAD triggering on non-speech). Defects that were found and fixed in `SpeechPipeline`: the pre-roll (640 ms) was shorter than the VAD's confirmation delay (about 0.7 s in an offline replay), so word onsets were clipped; the tail padding (0.3 s) was shorter than the model card's 0.64 s; the Korean result text has no spaces (spaces exist only as tokens), which breaks the downstream parser; and `final_empty` carried no evidence. It now logs fed frames, rms, peak, decode steps and token count. The STT lab's sherpa engine removes the VAD gate entirely (continuous feed + endpoint rules).

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

Log events (JSONL in `<filesDir>/vlc-diag/diag.jsonl`; each line has `t` epoch ms, `rt` elapsedRealtime ms, `ev`): `service_start`, `service_running`, `service_stop`, `pipeline_ready`, `audio_open`, `audio_stats`, `recorder_restart`, `speech_start`, `final_transcript`, `final_empty`, `echo_policy`, `echo_suppressed`, `barge_in`, `tts_request`, `tts_start`, `tts_done`, `speech_output_route`, `speech_output_mode`, `speech_force_speaker`, `tts_lab_request`, `tts_lab_prepare`, `tts_lab_first_audio`, `tts_lab_done`, `tts_lab_mlkit_download`, `cue_scheduled`, `cue_fire`, `cue_ack`, `cue_js_timeout`, `cue_audible`, `location_fix`, `location_gap`, `route_select`, `route_change`, `record_route`, `battery`, `capability_report`, `marker`, `error`. Partial transcripts are not logged (too noisy).

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
- ML Kit GenAI TTS is in the TTS lab (alpha, untested on the device); no Kakao route call, no vocal-take capture mode. The capability report's `mlKitGenAi` string is still a stub: use the lab's ML Kit status.
- TTS lab and route reporting are untested on hardware. Forced speaker (communication-device method) is a best-supported approach but its effect on the Google engine's AudioTrack, call volume and Bluetooth media routing must be verified with `dumpsys audio`.
- The partial transcript is only emitted while speech is detected, at most every 150 ms.

## Session TTS engine selection (M1)

Session speech (`speak`, cue acknowledgements, and the native cue-fallback speech) now goes through Supertonic (sherpa-onnx, in-process `AudioTrack`) when it is selected and loaded, otherwise Android `TextToSpeech` exactly as before.

- **Config** (static, applies to later utterances, plays nothing): `setSessionTts({ engine: 'auto' | 'platform' | 'supertonic', voice: 0-9, steps: 1-32 })`, defaults `auto`, 0, 8. `auto` and `supertonic` both use Supertonic only when the `tts-supertonic` model set is downloaded and loaded; `platform` never does. `setSpeechLanguage('ko' | 'en')` switches the language of both paths at runtime (needs a running session). `getSessionTtsStatus()` returns `requested`, `supertonicModelReady`, `supertonicLoaded`, `supertonicLoading`, `active`, `lastError`.
- **Loading:** a background thread loads the engine when a session starts and when the config changes; `speak` never waits for it. Until loaded (or if loading fails) platform TTS speaks. A failed load is not retried until the next config change or session.
- **Fallback:** if a Supertonic utterance ends with an `error*` outcome, that text and everything queued behind it is spoken by platform TTS (log `tts_engine_fallback`, `lastError` set). Appended (`normal`) utterances stay on the engine of whatever is still queued, so the two engines never overlap.
- **Semantics:** `high`/`cue` flush both engines and drop queued items; `normal` appends (a small serial queue on the Supertonic path). Half-duplex `onActiveChanged`, audio focus, `SpeechOutput` routing (default `auto`, system route) and `onSpeechIdle` behave the same for both paths. `shutdown()` stops both and releases the Supertonic engine on a background thread.
- **Events/logs:** `ttsStart` and `ttsDone` carry `engine: 'supertonic' | 'platform'`; `tts_request`, `tts_start`, `tts_done` log it too.
- **Not done:** no phrase audio cache/pre-generation.
- **Untested on a device:** everything above (compiles only). In particular Supertonic first-audio latency in the session, flush/stop mid-generation, the error fallback, the language switch, cue `cueAudible` timing with Supertonic, and half-duplex echo behaviour with in-process playback.
