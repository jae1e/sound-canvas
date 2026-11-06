# Field Voice Log: App–Server Contract (v0, slice 1)

**Status.** Draft for slice 1 of the MVP, written 2026-11-06. Both `apps/field-log` (Expo, Android) and `services/field-log-server` (Python) implement exactly this contract. Change it here first, then in both code bases. Requirements are in [mvp-requirements.md](mvp-requirements.md).

## 0. Slice 1 scope

In slice 1:
- **Memos.**
  - A new memo starts with one of three choices: take a photo, pick an image, or voice only.
  - A photo or image memo can then get a voice recording. The camera is the system camera app and is never open at the same time as the recorder.
- **Automatic metadata.** Wall-clock and boot-clock timestamps, the server clock offset, location and the input route.
- **Recording.** Tap to start and stop. Crash-safe segments with hashes and signal-quality metrics (A3).
- **Live preview.** While recording and online, the phone streams PCM to the server and shows a draft transcript: grey text that may change.
- **Final transcription.** Each closed segment is uploaded and transcribed by the final engine. Its text replaces the draft segment by segment.
- **Sync.** An outbox with idempotent uploads, runs in-app while the app or its recording service is alive.
- **Enrolment.** By pairing code.

Deferred to later slices:
- the armed hands-free session (A2);
- the widget and side button (A1);
- WorkManager (A10);
- the PC web view (S-5);
- the retention job (S-4);
- QR enrolment;
- transcript editing (A11);
- the personal vocabulary UI (A12).

## 1. Transport and auth

- Base URL: `http://<tailnet-ip>:8787`. The server binds only to the tailnet address (this box: `100.84.83.35`). It never binds to `0.0.0.0` and is never exposed publicly. Tailscale encrypts the link.
- Every endpoint except `POST /v1/enroll` requires `Authorization: Bearer <device_token>`. A missing or invalid token gives `401`.
- JSON bodies are UTF-8. Times are integers:
  - `*_wall_ms`: Unix epoch milliseconds from the device wall clock;
  - `*_elapsed_us`: Android `SystemClock.elapsedRealtimeNanos() / 1000`, in microseconds so that values stay below 2^53 and survive JavaScript numbers;
  - `boot_count`: Android `Settings.Global.BOOT_COUNT`, which identifies one boot;
  - `*_server_ms`: server epoch milliseconds.

## 2. Endpoints

| Method and path | Body | Response |
|---|---|---|
| `POST /v1/enroll` | `{pairing_code, device: {model, manufacturer, os_version, app_version, install_id}}` | `200 {device_id, token, server_time_ms}`. `403` for an unknown, expired or used code. The code comes from `fls pair` on the server, is 8 characters, single-use and valid for 10 minutes |
| `GET /v1/health` | — | `{server_time_ms, version, final_engine, streaming_engine, streaming_available}` |
| `POST /v1/clock` | `{client_send_wall_ms, client_send_elapsed_us}` | `{client_send_wall_ms, client_send_elapsed_us, server_recv_ms, server_send_ms}`. The client records its receive time and computes offset = ((server_recv − client_send) + (server_send − client_recv)) / 2 and the round-trip time |
| `PUT /v1/objects/{sha256}` | Raw bytes. `Content-Type`: `audio/wav`, `image/jpeg`, `image/png`, `image/heic` or `image/webp` | `201` when stored, `200` when the hash already exists. `422` when the body's SHA-256 differs from the path. Response body `{sha256, size}`. Lowercase hex |
| `HEAD /v1/objects/{sha256}` | — | `200` if present, else `404` |
| `GET /v1/objects/{sha256}` | — | The bytes |
| `POST /v1/events` | `{events: [Event, …]}` in seq order, up to 200 | `{results: [{event_id, status: "accepted" \| "duplicate" \| "rejected", reason?}], last_seq}` |
| `GET /v1/memos/{memo_id}/transcript` | — | `{memo_id, segments: [TranscriptSegment]}` |
| `GET /v1/transcripts?since_server_ms=N[&wait_s=S]` | — | `{segments: [TranscriptSegment], now_server_ms}`, for polling every segment that changed since N. With `wait_s` (1–25) the server holds the request until a segment of this device changes or S seconds pass (long poll) |
| `WS /v1/live` | See section 5 | — |

## 3. Events

### Envelope

Every event has this envelope:

```json
{
  "event_id": "UUIDv7 string",
  "device_id": "from enrolment",
  "seq": 1,
  "type": "memo_created",
  "wall_ms": 0,
  "elapsed_us": 0,
  "boot_count": 0,
  "payload": {},
  "prev_hash": "hex of the previous event's record_hash, or empty string for seq 1",
  "record_hash": "hex"
}
```

- **`record_hash`** = SHA-256 of the canonical JSON of the envelope without `record_hash`.
- **Canonical JSON:**
  - object keys sorted (code-point order), recursively;
  - no whitespace, UTF-8, no escaping of non-ASCII;
  - **numbers are integers only**: event payloads never contain floats, because JavaScript and Python print some floats differently (`1e-7` against `1e-07`). Fractional quantities use scaled integers (`lat_e7`, `peak_dbfs_x100`, `hf_ratio_4k_ppm` and so on). The server rejects an event that contains a float, with `reason: "float"`;
  - absent optional fields omitted, not `null`.
  - Python: `json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)`. JavaScript: a recursive key sort, then `JSON.stringify`.
  - Both implementations must pass the shared test vectors in `services/field-log-server/tests/vectors/canonical.json`.
- **Server checks:**
  - recompute `record_hash`;
  - `prev_hash` must equal the stored hash for `seq − 1` of that device;
  - seq must be contiguous.
- **Results:**
  - A known `event_id` with the same hash gives `duplicate`.
  - A gap gives `rejected` with `reason: "gap"`, and the client resends from `last_seq + 1`.
  - A hash mismatch gives `rejected` with `reason: "hash"`.
- **No edits:** events are never edited or deleted. Corrections are new events.

### Payloads

`location` is optional everywhere: `{lat_e7, lon_e7, accuracy_cm, altitude_cm?, provider, fix_wall_ms, fix_elapsed_us}`. `lat_e7` is degrees × 10^7 rounded to an integer.

| `type` | `payload` |
|---|---|
| `memo_created` | `{memo_id (UUIDv7), kind: "photo" \| "image" \| "voice", tz: IANA name, retention_class: "standard", languages?: ["ko", "en"], location?}`. `languages` is the user's ordered language list (ISO 639-1, first = highest priority, default `["ko", "en"]` when absent); see section 7 |
| `photo_added` | `{memo_id, photo_id, object_sha256, mime, bytes, width?, height?, source: "camera" \| "library", taken_wall_ms?, location?}`. `taken_wall_ms` comes from EXIF when present. The original bytes are uploaded unmodified |
| `recording_started` | `{memo_id, recording_id, route: Route, source: "UNPROCESSED" \| "VOICE_RECOGNITION" \| "MIC", sample_rate: 16000, effects: {ns, agc, aec}, location?}`. Each of `ns`, `agc` and `aec` is `"off"`, `"on"` or `"unavailable"` |
| `segment_closed` | `{memo_id, recording_id, segment_id, index, object_sha256, bytes, format: "wav_pcm16_16k_mono", start_elapsed_us, end_elapsed_us, start_wall_ms, duration_ms, peak_dbfs_x100, clipped_samples, hf_ratio_4k_ppm, flags: [...], recovered: bool}` |
| `route_changed` | `{memo_id, recording_id, route: Route, reason?: "device_disconnected" \| "system"}`. The open segment was closed at the switch, so every segment has one route (v0.2) |
| `recording_stopped` | `{memo_id, recording_id, reason: "user" \| "left_app" \| "error" \| "interrupted" \| "recovered", location?}`. `left_app` (v0.2): the user left the memo screen or switched to another app while recording, and the app stopped and saved the recording. Turning the screen off or locking the phone does not stop it unless the user changes that setting |
| `clock_sync` | `{offset_ms, rtt_ms, server_ms}` (integers, rounded) |
| `memo_note` | `{memo_id, text}` (typed note, optional) |
| `memo_deleted` | `{memo_id}`. The user deleted the memo; see section 8 |
| `memo_titled` | `{memo_id, title}` (v0.2). The user set or changed the memo title: plain text, trimmed, at most 120 characters; an empty string clears it. Append-only: the latest event by `seq` wins. Without a title, views show the start of the transcript |
| `recording_paused` | `{memo_id, recording_id}`. The open segment was closed first; the microphone is released while paused |
| `recording_resumed` | `{memo_id, recording_id}`. New segments continue the index numbering |
| `capture_state` | `{memo_id, recording_id, silenced: bool}`. Android silenced (or un-silenced) the capture because another app took the microphone; segments recorded while silenced contain zeros |

Notes on `segment_closed`:
- `flags` holds `clipped` and `narrowband` (A3).
- `hf_ratio_4k_ppm` is the share of energy above 4 kHz, over frames louder than −50 dBFS, in parts per million.
- `peak_dbfs_x100` is the peak level in dBFS × 100, rounded (−312 means −3.12 dBFS).

`Route` is `{type: "builtin_mic" | "bluetooth_sco" | "ble_headset" | "wired_headset" | "usb" | "other", product_name?, address_hash?, device_id?}`. `address_hash` is a SHA-256 of the Bluetooth address, never the address itself.

Server behaviour:
- **Enqueue:** when a `segment_closed` event is accepted and its object exists, the server enqueues a final-transcription job. If the object arrives later, the job is enqueued when the `PUT` completes.
- **Upload order:** the client uploads the object before posting the event when it can.

## 4. TranscriptSegment

```json
{
  "segment_id": "…", "memo_id": "…", "index": 0,
  "status": "queued | running | done | failed",
  "engine": "qwen3-asr-1.7b",
  "text": "…", "language": "ko",
  "no_speech": false,
  "no_speech_reason": null,
  "filtered_text": null,
  "speech_ms": 0,
  "confidence": null,
  "words": [{"text": "…", "start_ms": 0, "end_ms": 0}],
  "rtf": 0.02,
  "updated_server_ms": 0,
  "error": null
}
```

- `words` and `confidence` may be `null` when the engine does not provide them.
- Segment times are relative to the segment start.
- A segment with `no_speech: true` is shown as "no speech", never as text.
- `no_speech_reason` (v0.2, 2026-11-06) is `null` when speech was found, otherwise one of:
  - `"silent"`: below the energy gate;
  - `"no_voice"`: the voice-activity detector found too little speech;
  - `"stock_phrase"`: the model returned a phrase that ASR models typically invent on non-speech audio, such as "감사합니다", "안녕하세요" or "Thank you.", while the detected speech was too short to support it;
  - `"echo"`: the output repeated the context string.
- `filtered_text` is the model output that was suppressed. It is set only for `stock_phrase` and `echo`; `text` stays empty. The app may show it as "filtered: …" next to the no-speech chip.
- `speech_ms` is the speech duration the voice-activity detector found in the segment, or `null` when it was not run.
- **Transcribe anyway.** `POST /v1/segments/{segment_id}/retranscribe` with body `{"force": true}` re-runs the final engine without the no-speech checks, for the segment's own device only. It returns 202, and the new result arrives through the normal transcript pull.

## 5. Live preview WebSocket

`GET /v1/live` upgraded to a WebSocket, with header `Authorization: Bearer <token>`.

**Client → server**
1. A text frame `{"type":"start","memo_id","recording_id","language":"auto"|"ko"|"en"}`. The app sends the first language of the memo's list (section 7).
2. Binary frames of PCM16 little-endian, mono, 16 kHz, about 100 ms each (3,200 bytes).
3. Optionally `{"type":"end"}`.

**Server → client** (text frames)

| Message | Meaning |
|---|---|
| `{"type":"ready","engine"}` | The stream is open |
| `{"type":"partial","text","utterance"}` | The current hypothesis for utterance number N. It may change |
| `{"type":"final","text","utterance","start_ms","end_ms"}` | The utterance was endpointed. Times are relative to the stream start |
| `{"type":"error","message"}` | Something went wrong |
| `{"type":"busy"}` | The streaming engine is unavailable. The client stops streaming for this recording |

**Rules**
- **Preview only.** The live preview is not stored and is not evidence. The final text comes only from segment transcription.
- **Recording comes first.** Loss of the socket never affects recording. The client buffers at most 2 s and drops the oldest audio, reconnects with backoff, and shows "draft paused" while offline.
- **Times in the app.** The server's `start_ms` and `end_ms` are relative to the start of one WebSocket stream. The phone's native module adds the stream's offset within the recording, so the app always sees times relative to the recording start. The app then hides a draft utterance once a final segment covering its midpoint has text.

## 6. Engines and segment boundaries (slice 1)

| Role | Engine | Where | Why |
|---|---|---|---|
| Final text | **Qwen3-ASR-1.7B** (Apache-2.0), `qwen-asr` package, transformers backend, BF16, automatic language detection | RTX 4090 | Best published open Korean numbers (FLEURS-ko CER 2.57, vendor). Accepts a context string, which carries the personal vocabulary (A12) |
| Live draft | **Nemotron 3.5 ASR Streaming 0.6B**, sherpa-onnx int8 build with a 160 ms chunk (`sherpa-onnx-nemotron-3.5-asr-streaming-0.6b-160ms-int8-2026-06-11`, OpenMDW-1.1) | Server CPU (Ryzen 7 7800X3D) | True streaming, Korean and English in one model. FLEURS-ko CER about 7.1–7.6 (vendor) is good enough for a draft. It leaves the GPU to the final engine |
| Bake-off (slice 2) | Whisper large-v3 via faster-whisper with Silero VAD | RTX 4090 | Requirement S-2 |

**Segment boundaries.**
- **Soft close:** after 20 s, a segment closes at the first 300 ms window that is quiet. Quiet means at least 10 dB below the segment's median RMS, or below −45 dBFS.
- **Hard close:** at 30 s. Boundaries therefore rarely cut a word.
- **Transcription:** each segment is transcribed on its own.
- **Route switch (v0.2):** when the capture moves to another input (the locked input disconnected, or the system rerouted), the open segment closes at that sample and the next one starts without a gap. A `route_changed` event follows.

**Input selection (v0.2, 2026-11-06).** The input is chosen when recording starts and stays locked for the whole recording, as in voice-recorder and camera apps (user decision 2026-11-06). The default mode `auto` picks a connected headset microphone at start, and otherwise the phone microphone. Priority: wired or USB headset, then a BLE Audio headset, then Bluetooth SCO, then the built-in microphone. During a recording:
- A headset that connects does not change the input.
- If the locked input disconnects, the capture falls back to the phone microphone (`route_changed`, reason `device_disconnected`) and stays there. Recording never stops because of a route change.
- The user cannot change the input. Pause and resume keep the locked input when it is still available.

The other modes are `phone` (always the built-in microphone) and `device` (one headset, matched by type, product name and address hash, because Android device ids change on every reconnect). Using a Bluetooth microphone puts the earbuds into call (HFP) mode while recording, which lowers media audio quality and usually limits the microphone to speech bandwidth.

## 7. Languages and ASR input conditioning (v0.1, 2026-11-06)

**Languages.** The app keeps an ordered list of the languages the user speaks, by default Korean, then English. Each memo records the list in `memo_created.languages`.

**Final engine (Qwen3-ASR).**
- **One language in the list:** the engine is forced to that language.
- **Several languages:** the engine first runs with automatic detection. The context string carries no language hint (removed 2026-11-06, because Qwen echoed it on silent segments); it is reserved for the personal vocabulary (A12). Segments with no speech energy are gated before the model runs.
  - If the detected languages are all in the list, the result is kept.
  - If not, the segment is decoded again forced to the first language. For example, Korean speech once came back as Chinese.

**Live draft engine (Nemotron).** With one language in the list it is forced to that language. With several it runs in automatic mode (v0.2, 2026-11-06). Forcing the first language, as v0.1 did, gave an empty draft for English speech when Korean came first. Replays of the user's phone memos showed automatic mode transcribing Korean and English as well as the forced language did.

**Input conditioning.** The phone stores raw audio, and `UNPROCESSED` is quiet: about −36 dBFS at 94 dB SPL. Before audio reaches either engine, the server conditions a copy, never the stored file:
- an 80 Hz high-pass filter;
- slow gain normalisation of speech frames to about −23 dBFS, with at most +30 dB of gain;
- a peak limiter.

The final engine also keeps the raw-input result available for comparison in the quality dashboard.

## 8. Deleting a memo (v0.1)

`memo_deleted` removes the memo's content from the phone and the server:
- audio and photo objects that no other live memo references;
- transcript text;
- the text of its `memo_note` events.

What remains is a tombstone: the memo id, the event envelopes and their hashes. Deleting a payload breaks recomputation of `record_hash` for the redacted events.
- **Redacted events:** they are marked `redacted` in storage, and their stored `record_hash` keeps the chain linkable.
- **Pending jobs:** jobs for the memo are cancelled.
- **Uploads:** the phone does not upload objects of a deleted memo that are still pending.

## 9. App updates (v0.2, 2026-11-06)

Test builds are sideloaded, so the app updates itself from the user's own server. No app store is involved, and nothing goes to a public host.

| Endpoint | Request | Response |
|---|---|---|
| `GET /v1/app/latest` | Device token. Query `?version_code=N` (the app's current build) | `200 {version_code, version_name, git_sha, sha256, bytes, built_ms, notes, newer: bool}` for the newest published build. `404` when none is published |
| `GET /v1/app/apk/{sha256}` | Device token. Supports `Range: bytes=N-`, so an interrupted download resumes | The APK bytes (`application/vnd.android.package-archive`), `206` for a range |

**Rules.**
- **Publishing.** The server publishes builds with `fls publish-apk <apk> --version-code N --version-name X --git-sha S --notes "…"`. It stores the file content-addressed and keeps the newest 3. A higher `version_code` is newer.
- **Version codes.** Every release build gets a strictly increasing Android `versionCode`: minutes since 2026-01-01 00:00 UTC, set at build time. Otherwise Android refuses or confuses updates.
- **Download.** The app downloads to its private cache, verifies the SHA-256, and only then hands the file to the system package installer. The user confirms the install; Android also asks once to allow "install unknown apps" for Field Voice Log.
- **Clean-up.** The app deletes downloaded APKs after a successful update (on the next start, when its own `versionCode` is at least the file's) and on cancel. Old APKs never pile up in Downloads.
- **Data.** An update replaces the app and keeps its data (same package and signing key).
