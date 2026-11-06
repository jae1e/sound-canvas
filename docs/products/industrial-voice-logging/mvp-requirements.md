# Industrial Voice Logging: MVP Requirements (v0.2)

**Status.** MVP scope agreed with the user on 2026-11-05. v0.2 (2026-11-06, agreed with the user) adds per-segment signal-quality metrics and the `clipped` and `narrowband` flags to A3, A11 and S-3. Implementation has not started. The working name is "Field Voice Log". The evidence base is [industrial-voice-logging-research.md](../../market-studies/industrial-voice-logging/industrial-voice-logging-research.md), which also holds the full draft requirement list (IDs M1–M16, K1–K3, S1–S12 and L1–L10) and the open decisions D1–D12. IDs in brackets below refer to that report.

## 1. Goal of the MVP

A general-purpose voice memo app that the user carries everywhere and tests personally in noisy places such as the subway. The MVP must prove four things before any vertical, like the Korean TBM (tool-box meeting) templates, is built:

1. **Capture is fast and never loses data.** Recording starts within seconds, even with busy hands. No segment is lost to crashes, process kills or reboots.
2. **The user can see that it works.** Separate, honest indicators show four states: recording, saved on the phone, synced and transcribed.
3. **Transcription works in noise on our own server, with no external cloud AI.** Korean, English and mixed Korean-English speech are transcribed acceptably from noisy-subway recordings by a model on the RTX 4090 box.
4. **Memos carry context.** Photos, timestamps and GPS are attached, and the record can be browsed on the phone and on the PC.

## 2. Decisions (2026-11-05)

| # | Decision | User's choice | Note |
|---|---|---|---|
| 1 | MVP target | **A general-purpose noisy-environment voice memo app** for the user's own testing, carried everywhere | The commercial first segment (report D1) is still open. The report recommends Korean manufacturing safety and context records. Keep the capture core generic so verticals become templates |
| 2 | Capture start | **Push-to-talk (PTT) by default, plus a hands-free session the wearer arms** (VAD, silence timeout, auto-pause) | No ambient or always-on mode and no automatic start after reboot, because of 통신비밀보호법 and VAD false triggers in noise (report D5) |
| 3 | Transcription location | **The phone records; the server transcribes.** No on-device ASR in the MVP | Simplest MVP: no model on the phone, and the model can change without an app release. Cost: no text while offline. Revisit on-device ASR (platform recognizer or Nemotron 3.5) after the MVP (report D6, S1) |
| 4 | Audio retention | **Audio is kept, with retention classes** | Classes: `standard` (audio deleted after 90 days; hash and transcript kept), `evidence` (3 years) and `text-only` (audio deleted after transcription and user confirmation). MVP default: `standard` (report D4) |
| 5 | Phone-to-server path | **The existing Tailscale tailnet, with ACLs restricted to the user's devices, plus app-level authentication** | The tailnet is shared with other people. If the user lacks admin rights to set ACLs, app authentication alone must protect the API. No Tailscale Funnel or public exposure |
| 6 | Where results are viewed | **The app and a PC web view** | The web view binds to 127.0.0.1 only and is opened through `ssh -L`. It is never exposed on the tailnet |
| 7 | GPU sharing with the separation demo | **The demo may be stopped when needed** | One heavy job at a time. Run the ASR worker under `systemd-run --user --scope -p MemoryMax=… -p MemorySwapMax=0` |

## 3. In Scope

### 3.1 Mobile app (Android, Galaxy S25; Expo/React Native with Kotlin modules)

| ID | Requirement | Report ref |
|---|---|---|
| A1 | **Quick start.** A large PTT control on the main screen, a home-screen widget, a notification action while a session is armed, and a deep link usable from the Samsung side button. Target: 2 s or less from tap to recording [E] | M1 |
| A2 | **Capture modes.** PTT: hold to record, or tap to start and stop. Armed session: the wearer starts it, VAD gates the recording, it pauses after a silence timeout and ends automatically after N minutes idle. A 300–600 ms pre-roll is kept only inside an active session | M2 |
| A3 | **Crash-safe segmented audio.** Segments of 30 s or less in 16 kHz mono 16-bit PCM WAV (about 1.9 MB/min), flushed every 1–2 s. Each segment gets a SHA-256 on close and a read-back check before it counts as "saved". Partial segments are recovered after a crash, with a notice. The input route (phone mic, Bluetooth headset, codec) is logged per segment. **Signal-quality metrics per segment**, computed on the phone when the segment closes and stored in its event: peak level in dBFS, the number of clipped samples (at full scale, \|x\| ≥ 32767), and the share of energy above 4 kHz over non-silent frames. They drive two automatic flags: `clipped` (one or more clipped samples) and `narrowband` (high-band share below a threshold set in the week-1 measurements). A Bluetooth HFP CVSD route carries almost nothing above 4 kHz even when the file is 16 kHz | M3 |
| A4 | **Trust indicator.** Four states per memo and in the notification: Recording, Saved on phone, Synced (server echoed the hashes) and Transcribed. They use text and shape, not colour alone. Distinct start, stop and failed-to-start sounds and haptics follow the current audio route and never force the loudspeaker | M9 |
| A5 | **Health monitors.** Silence or covered mic, route changes, low storage, battery projected against the day, a stale clock sync, upload backlog, and process death (`ApplicationExitInfo`). Samsung battery-optimisation onboarding | M10 |
| A6 | **Photos.** Taken from inside a memo or alone. The original bytes are stored unmodified and hashed. Records carry the boot-clock time, a UTC estimate and GPS with accuracy. App metadata lives in the record, not in the image file | M6 |
| A7 | **Location.** Captured at memo start and end, and with each photo, while in use only (no background location permission in the MVP). Accuracy is stored. Location can be switched off | M6 |
| A8 | **Time.** Every event stores boot-clock time with a boot ID, a UTC estimate and its uncertainty. NTP-style offset exchanges with the server happen on connect and during sessions, and are logged as events | M12 |
| A9 | **Data model.** Append-only events (UUIDv7, a per-device sequence number, `prev_hash` and `record_hash`). A memo groups segments, photos, tags, transcript results and edits. Edits are new revision events, never overwrites. Each memo carries a `retention_class` | M7 |
| A10 | **Sync.** An offline-first outbox. Objects are uploaded with idempotent PUTs keyed by SHA-256 (segments are about 1 MB or less, so a failed upload retries one segment). WorkManager handles routine sync; a user-initiated transfer job handles "Sync now". Nothing local is deleted before the server confirms the hash. tus is deferred until large objects (video) arrive | M8 |
| A11 | **Review.** A memo list with state, time, place, photo thumbnails and transcript. Tapping a transcript line plays that audio. Edits become revisions. Low-confidence or no-speech segments are marked, not shown as text. Segments flagged `clipped` or `narrowband` (A3) are marked too. Search | M14 |
| A12 | **Personal vocabulary.** A user-editable word list (names, product terms, English jargon) is sent to the server as recognition context | K3 (generalised) |
| A13 | **Device security.** SQLCipher database with a key wrapped in the Android Keystore, app-private media, and enrolment by scanning a QR code from the server, which issues a device token (mTLS later). No third-party network calls | M11 |
| A14 | **Bystander pause.** A one-tap pause logged as an event, for moments when others are talking nearby | M13 |

### 3.2 Server (this Linux box with the RTX 4090; native, not Docker)

| ID | Requirement | Report ref |
|---|---|---|
| S-1 | **API.** A Python service, run with `uv` and bound only to the tailnet interface. It rejects requests without a valid device token. It covers enrolment, event push and pull, object PUT and GET by hash, clock exchange and transcript results. SQLite for the single-user MVP, with Postgres when multi-user arrives. Media is stored on the local filesystem under content-addressed paths | M15 |
| S-2 | **ASR worker.** A job queue that runs one heavy job at a time under a memory cap. **Bake-off: Qwen3-ASR-1.7B (Apache-2.0, accepts context/vocabulary) against Whisper large-v3 (faster-whisper with Silero VAD).** Cohere Transcribe 2B is optional (gated download). Outputs are segment and word timestamps, a confidence score and no-speech flags. Languages are Korean, English and mixed speech | M5 |
| S-3 | **Evaluation loop.** The user's own corrections in the app become reference transcripts. The server computes one normalised CER/WER per model, per mic route, per environment tag (subway, street, quiet) and per signal-quality flag (`clipped`, `narrowband`; A3) | M5 |
| S-4 | **Retention job.** Deletes audio according to its class. A deletion leaves a tombstone event that keeps the hash and the transcript | S10 (partial) |
| S-5 | **PC web view.** Bound to 127.0.0.1 and reached through `ssh -L`. It lists, searches and plays memos, shows photos and maps the location. Export: JSONL plus media plus a hash manifest | M15 |
| S-6 | **Operations.** Runs as `systemd --user` services. The ASR worker runs under a `MemoryMax` scope. The separation demo is stopped while the GPU is needed. Backups of the database and media directory are scripted | — |

### 3.3 Measurements in the first week

- **Battery and thermals** on the S25 over a day of normal memo use and one hour of an armed session [M16].
- **Launch-to-recording time** and **upload-to-transcript time** for a 30 s memo. The proposed target is 10 s or less after upload [E].
- **Noisy-subway set.** At least 30 memos, Korean and mixed speech, recorded with both the phone mic and earbuds. The input route is logged automatically, and a dB reading from a phone SPL app is taken where possible.
- **Kill tests.** Force-stop, reboot and airplane mode in the middle of a memo. Zero lost segments is the pass criterion.
- **Narrowband threshold.** Compare the share of energy above 4 kHz in phone-mic and earbud memos, using the logged route and codec, and set the `narrowband` threshold (A3) between the two groups.

## 4. Out of Scope for the MVP

These are deferred, not rejected:
- on-device ASR;
- TBM and safety templates (K1–K2);
- multi-user, SSO and roles;
- LLM extraction or summaries;
- diarization;
- translation;
- robot and AV exports (MCAP, LeRobot);
- bodycam or video;
- device-signed checkpoints, C2PA and a transparency log;
- iPhone;
- Docker packaging and the vendor-run private cloud;
- push-to-talk radio integration.

## 5. Constraints Carried Over

- No external cloud AI or speech APIs. Only open models with commercial licences: Moonshine Community models and AI Hub-trained weights stay out until their terms are cleared in writing.
- Web views bind to 127.0.0.1. No Gradio `share=True`, public tunnels or Tailscale Funnel.
- OOM safety on the shared 29 GiB box. Heavy jobs run one at a time in capped scopes. Check `free -h` first, and never load a model during a large download.
- Never force the phone speaker or auto-play audio in tests.
- Do not hand-edit generated `android/` folders; use `npx expo prebuild --clean`.
- Never commit audio, photos, weights, `data/` or `runs/`.

## 6. Open Items

1. **Tailnet admin rights.** Can the user set Tailscale ACLs so that only their devices reach the API port? If not, the device token alone protects the API.
2. **Earbuds model** used for testing, which goes into the supported-headset list.
3. **App name** (working name "Field Voice Log").
4. **Commercial first segment** (report D1). This is revisited after the MVP proves capture and noisy transcription.
5. **Repository layout.** A new Expo app (for example `apps/field-log`) and a server (for example `services/field-log-server`) in this pnpm workspace, reusing the Voice Life Companion Kotlin patterns but not its code paths.
