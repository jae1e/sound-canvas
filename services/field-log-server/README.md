# Field Voice Log server (`fls`)

Python service for the Field Voice Log MVP. The phone records audio, photos and metadata. This server stores them and transcribes them. It implements [docs/products/industrial-voice-logging/api-v0.md](../../docs/products/industrial-voice-logging/api-v0.md) exactly; read that first. Background: [mvp-requirements.md](../../docs/products/industrial-voice-logging/mvp-requirements.md).

## Setup

```bash
cd services/field-log-server
uv sync --extra asr          # base deps, dev tools and the real engines (qwen-asr, torch, sherpa-onnx)
uv run --no-sync fls fetch-models   # Nemotron live model (~475 MB, resumable) into <data dir>/models
```

The Qwen3-ASR-1.7B weights (about 4.7 GB) download from Hugging Face on the first transcription job. Run heavy steps (installs, first model load) serialised and capped, for example:

```bash
flock ~/.cache/fvl-heavy.lock systemd-run --user --scope -p MemoryMax=12G -p MemorySwapMax=0 uv sync --extra asr
```

## Commands

| Command | Purpose |
|---|---|
| `fls serve [--host H] [--port 8787] [--dashboard-port 8790] [--final-engine qwen3\|fake] [--live-engine nemotron\|fake\|none]` | Run the server. Default host is the output of `tailscale ip -4` |
| `fls pair` | Print an 8-character pairing code (Crockford base32, single use, valid 10 minutes) |
| `fls devices` | List enrolled devices |
| `fls revoke <device_id>` | Revoke a device token |
| `fls fetch-models` | Download and verify the Nemotron model |
| `fls smoke-final <wav> [--languages ko,en] [--raw] [--attenuate-db -25] [--lf-noise-dbfs -45]` | Transcribe one file with the final engine and the language policy; prints text, detection path, RTF, VRAM, peak RSS |
| `fls smoke-live <wav> [--language ko] [--raw] [--attenuate-db -25] [--lf-noise-dbfs -45]` | Stream a file in 100 ms chunks in real time through the live engine; prints partial and final events and the first-partial latency |

`--data-dir` (before the sub-command) or `FLS_DATA_DIR` overrides the data directory.

## Operations

```bash
scripts/start.sh      # transient user unit "field-log-server", MemoryMax=12G, MemorySwapMax=0
scripts/logs.sh       # journalctl --user -u field-log-server -f
scripts/stop.sh
```

`scripts/start.sh` with no arguments runs `--final-engine qwen3 --live-engine nemotron`; any arguments are passed to `fls serve` instead. The unit does not survive a reboot (transient). Enrol a phone with `fls pair` and enter the code in the app.

## Data layout

Default `~/.local/share/field-log-server/` (never inside the repo):

```
db.sqlite3                   SQLite, WAL mode
objects/<aa>/<sha256>        content-addressed bytes (temp file, fsync, atomic rename; max 50 MB)
objects/_tmp/                in-flight uploads
models/<model dir>/          Nemotron sherpa-onnx files
```

Tables: `devices`, `pairing_codes`, `objects`, `object_owners`, `events` (append-only, per-device hash chain), projections `memos`, `photos`, `recordings`, `segments`, plus `transcripts` (TranscriptSegment rows) and `jobs` (final-transcription queue: queued, running, done, failed).

## Input conditioning, languages, deletion

- **Conditioning** (`conditioning.py`, contract section 7): an 80 Hz high-pass, slow gain normalisation of speech frames to about -23 dBFS (at most +30 dB, at most -12 dB), and a peak limiter at -1 dBFS. Speech frames are found in the 300-3400 Hz band, so rumble is not boosted. It is a streaming class (state kept between chunks). Both engines get conditioned copies; stored objects are never modified.
- **Languages**: `memo_created.languages` (default `["ko","en"]`) is stored on the memo. A final job with one language forces it; with several it runs auto detection with the context `Languages in priority order: Korean, English.` and re-decodes forced to the first language if the detected languages are not all in the list. The path is stored (`transcripts.detect_path`: `forced:ko`, `auto`, `auto(zh)->forced:ko`). The live `start.language` is used as is.
- **Deletion** (`memo_deleted`, contract section 8): queued or running jobs are cancelled, the memo's transcripts, comparison results and references are deleted, objects no other live memo uses are removed (file, object row, ownership) and kept as a hash in `object_tombstones`, `memo_note` events are redacted (payload emptied, `redacted=1`, `record_hash` kept) and the memo row is marked deleted. Later events still chain. Reads of the memo give 404.
- **Long poll**: `GET /v1/transcripts?since_server_ms=N&wait_s=S` (1-25) returns as soon as a transcript row of the device changes, or empty after S seconds. A row whose `updated_server_ms` equals N is returned again (`>=`), so clients must treat rows as idempotent.

- **Energy gate** (`gate.py`): before any model runs (final jobs, comparison jobs, Nemotron replay), a segment whose metadata peak is at most -95 dBFS, or whose loudest 100 ms of 300-3400 Hz speech-band RMS is below `GATE_DBFS` (-65 dBFS), is stored as `no_speech` with empty text and `detect_path` `gated:...`. Models echo their prompt on silence, so they never see it. The phone's real recording (loudest speech-band 100 ms: -34.5 dBFS) passes with 30 dB of margin.
- **Context string**: always empty (reserved for the personal vocabulary). An echo guard turns output that is only a language name, or is contained in the context string, into `no_speech` with a warning in the log.
- **Word timestamps**: after the transcript, final jobs align the text with Qwen3-ForcedAligner-0.6B (lazy, kept loaded, about +1.3 GB VRAM) using the audio that produced the text (Korean when `ko` was detected). `TranscriptSegment.words` is `[{text, start_ms, end_ms}]`; an alignment failure keeps `words: null` and never fails the job. `fls rerun --silent` or `fls rerun <segment_id>...` re-queues final jobs.

## Quality dashboard (requirement S-5)

`fls serve` also runs a dashboard in the same process on **http://127.0.0.1:8790/** (`--dashboard-port 0` disables it). It shares the database, the job worker and the loaded models.

- **There is no authentication.** It is safe only because it listens on the loopback address of this PC; any other bind address is refused, and requests whose Host header is not `127.0.0.1` or `localhost` get 403 (DNS-rebinding guard). Anyone with a shell on this PC can read all memos through it.
- The waveform has a time ruler and a playhead that follows whichever player (raw or conditioned) is playing; click or drag seeks the last-used player without starting it; with the waveform focused, space plays or pauses and the arrow keys seek 1 s. A timeline lane shows the words (or Nemotron utterances) of the selected row (final, a comparison row, or the reference) with faint bands on the waveform; click a word to seek, shift-click to play just that word. Every row and the reference have an Align button (`POST /dash/api/segments/{id}/align`).
- Memo list (all devices, newest first, deleted memos hidden) and memo detail per segment: waveform with dBFS gridlines from server-computed min/max peaks, spectrogram PNG, raw audio and conditioned audio players (HTTP Range, never autoplay), signal metrics, the stored transcript, and a comparison table.
- **Run comparison** queues five jobs behind real transcription jobs: `qwen3/raw`, `qwen3/conditioned`, `qwen3/forced-<first language>`, `nemotron-replay/conditioned` and `nemotron-replay/raw` (stored audio replayed through a fresh streaming recognizer as fast as it decodes). Results go to `alt_transcripts`. A slot for Whisper large-v3 is reserved in `jobs.py` and nothing is downloaded.
- **Reference transcript** per segment. CER = edit distance of characters / characters in the reference, after Unicode NFKC, lowercasing, and removing spaces, punctuation and control characters.
- API: `/dash/api/memos`, `/dash/api/memos/{id}`, `/dash/api/segments/{id}/peaks?n=1200[&conditioned=1]` (n 16..4000), `.../spectrogram.png`, `.../conditioned.wav`, `/dash/api/objects/{sha}`, `POST .../compare`, `PUT .../reference`, `POST /dash/api/cer`.

## Engines

- **Final (`qwen3`)**: `Qwen/Qwen3-ASR-1.7B` via `qwen-asr`, BF16 on `cuda:0`, batch size 1, automatic language detection, empty context string (vocabulary comes in a later slice). Loaded lazily on the first job and kept resident. One worker thread, one job at a time. A failed job is retried up to 2 times, then marked `failed`. Jobs left `running` by a crash or restart are re-queued at startup. `rtf` is processing seconds divided by audio seconds. No word timestamps in slice 1 (`words: null`).
- **Live (`nemotron`)**: sherpa-onnx int8 Nemotron 3.5 ASR Streaming 0.6B, 160 ms chunks, CPU. Separate recognizers per stream (2 threads each), so streams share nothing. Endpointing: 0.8 s trailing silence, 20 s maximum utterance. An endpoint with no decoded text is ignored, not reset: resetting during leading silence cut off the first words of quiet speech that starts about 0.8 s into the stream (found in round 2). Two recognizers serve live clients and a third serves dashboard replays. The language is a per-stream option (`ko`, `en` or `auto`). Text is rebuilt from the model's tokens because sherpa's plain result drops word spaces for Korean. At most 2 concurrent streams; a third client gets `{"type":"busy"}`. Live text is never stored.
- **`fake`** engines are deterministic and used by the tests.

## Security notes

- The server only binds to `127.0.0.1` or an address in `100.64.0.0/10`; `0.0.0.0`, `::`, hostnames and everything else are refused at startup.
- The tailnet is shared with other people. Every endpoint except `POST /v1/enroll` requires a device Bearer token (401 otherwise). Only the SHA-256 of a token or pairing code is stored; comparison is constant time.
- Pairing: 8 characters of Crockford base32 (about 40 bits), single use, 10 minutes. After 10 failed enrolments within a minute the endpoint answers `429` for the rest of the window.
- A device reads only its own memos and transcripts, and only objects it has uploaded (an upload of already-stored bytes also registers the uploader as an owner).
- Logs contain ids, sizes and timings only. Never transcript text or tokens.
- Traffic is plain HTTP inside the Tailscale tunnel, which encrypts it.

## Tests

```bash
uv run --no-sync pytest      # fake engines, no GPU, no network
```
