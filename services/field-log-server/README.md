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
| `fls serve [--host H] [--port 8787] [--final-engine qwen3\|fake] [--live-engine nemotron\|fake\|none]` | Run the server. Default host is the output of `tailscale ip -4` |
| `fls pair` | Print an 8-character pairing code (Crockford base32, single use, valid 10 minutes) |
| `fls devices` | List enrolled devices |
| `fls revoke <device_id>` | Revoke a device token |
| `fls fetch-models` | Download and verify the Nemotron model |
| `fls smoke-final <wav>` | Transcribe one file with the final engine; prints text, RTF, VRAM, peak RSS |
| `fls smoke-live <wav>` | Stream a file in 100 ms chunks in real time through the live engine; prints partial and final events and the first-partial latency |

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

## Engines

- **Final (`qwen3`)**: `Qwen/Qwen3-ASR-1.7B` via `qwen-asr`, BF16 on `cuda:0`, batch size 1, automatic language detection, empty context string (vocabulary comes in a later slice). Loaded lazily on the first job and kept resident. One worker thread, one job at a time. A failed job is retried up to 2 times, then marked `failed`. Jobs left `running` by a crash or restart are re-queued at startup. `rtf` is processing seconds divided by audio seconds. No word timestamps in slice 1 (`words: null`).
- **Live (`nemotron`)**: sherpa-onnx int8 Nemotron 3.5 ASR Streaming 0.6B, 160 ms chunks, CPU. Two recognizers (one per live slot, 2 threads each), so streams share nothing. Endpointing: 0.8 s trailing silence, 20 s maximum utterance. The language is a per-stream option (`ko`, `en` or `auto`). Text is rebuilt from the model's tokens because sherpa's plain result drops word spaces for Korean. At most 2 concurrent streams; a third client gets `{"type":"busy"}`. Live text is never stored.
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
