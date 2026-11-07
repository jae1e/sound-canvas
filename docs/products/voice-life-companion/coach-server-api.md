# Voice Coach ↔ Home Server API (v0)

**Status:** contract for P0 of [voice-coach-renovation-plan.md](voice-coach-renovation-plan.md), 2026-11-07. Change this document first, then the server and the app.

**Server.** The Voice Coach app uses the user's home server: the existing `services/field-log-server` (FastAPI) on the RTX 4090 PC.
- **Bindings:** it binds only to the tailnet address `100.84.83.35:8787`; the dashboard stays on `127.0.0.1:8790`.
- **Auth:** `Authorization: Bearer <device token>`, as in [api-v0.md](../industrial-voice-logging/api-v0.md) section 1.
- **Shared parts:** transport, auth, errors and app updates are the same as in api-v0. This document only lists what Voice Coach uses and what differs.

## 1. Enrolment

`POST /v1/enroll` with
```json
{"pairing_code": "…", "device": {"model": "…", "manufacturer": "…", "os_version": "…", "app_version": "…", "install_id": "…", "app_package": "com.jae1e.voicelifecompanion"}}
```
- **Response:** `200 {device_id, token, server_time_ms}`.
- **Pairing codes:** they come from `fls pair` on the PC, as for Field Voice Log. A code works for either app; the device's app is taken from `app_package`.
- **Per app:** each app enrols separately and gets its own token.
- **On the phone:** the app stores the server URL and token in secure storage. The server URL is editable in Settings, default `http://100.84.83.35:8787`.

## 2. App updates

As in api-v0 section 9, scoped to the device's `app_package`.

| Endpoint | Response |
|---|---|
| `GET /v1/app/latest?version_code=N` | `200 {version_code, version_name, git_sha, sha256, bytes, built_ms, notes, newer}` for the newest Voice Coach build; `404` when none |
| `GET /v1/app/apk/{sha256}` | APK bytes with `Range` support; `404` unless it is a published build of this package |

- **Version code:** every release build gets a strictly increasing `versionCode`, the minutes since 2026-01-01 00:00 UTC.
- **Publishing:** `apps/mobile/scripts/release-android.sh [--github] "notes"` runs `pnpm check`, then prebuild, then a capped Gradle release build, then `fls publish-apk`. With `--github` it also uploads to the private GitHub draft release `fvl-builds`; never publish that release.

## 3. Coach transcription (v0, 2026-11-07)

Speech takes are transcribed on the home server with the same stack as Field Voice Log:
- Qwen3-ASR as the final engine;
- word timestamps from Qwen3-ForcedAligner;
- the Silero VAD gate and the stock-phrase guard (api-v0 sections 5 and 7).

Jobs run one at a time in the existing heavy-job queue. Audio is kept under the server's object store, with the retention class `coach` (30 days), then purged.

| Endpoint | Body | Response |
|---|---|---|
| `POST /v1/coach/transcribe?lang=ko\|en\|auto&take_id=<app id>` | Raw `audio/wav` (16 kHz mono 16-bit, at most 30 min / 60 MB) | `202 {job_id, state: "queued"}`. Idempotent on (device, take_id): a repeat returns the same job. `413` when too large, `415` when not 16 kHz mono PCM WAV |
| `GET /v1/coach/transcripts/{job_id}` | — | `200 {job_id, take_id, state, language, text, words, duration_ms, error}`. `state` is `queued`, `running`, `done`, `no_speech` or `failed`. `words` is `[{w, start_ms, end_ms}]`; it is empty until done. `404` for another device's job |
| `DELETE /v1/coach/transcripts/{job_id}` | — | `204`; deletes the audio and the transcript |

**Rules:**
- **Language.** `lang=auto` uses the server's language detection, restricted to ko and en.
- **Long takes.** They are split at VAD pauses into segments of at most 30 s for the ASR. Word times are made absolute (ms from file start).
- **Fillers.** `text` keeps them. The ASR prompt asks for verbatim output including 음, 어 and um. The app also counts fillers from audio, because ASR may drop them.
- **Polling.** The app polls every 2 s while the report is open, and on resume. There is no push.
- **Scope.** Only Voice Coach devices (`app_package = com.jae1e.voicelifecompanion`) may call these endpoints; other devices get `403`.

## 4. Health

`GET /v1/health` as in api-v0. The app uses it to show "Server: connected / not reachable" in Settings.
