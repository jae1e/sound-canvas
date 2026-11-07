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

## 3. Coach transcription (P3, placeholder)

`POST /v1/coach/transcribe` uploads a take and returns a transcript with word timestamps (Qwen3-ASR plus Qwen3-ForcedAligner). It is specified in P3; P0 does not implement it.

## 4. Health

`GET /v1/health` as in api-v0. The app uses it to show "Server: connected / not reachable" in Settings.
