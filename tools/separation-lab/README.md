# separation-lab

Test lab for the audio-separation demo (targets plus others). It builds the plumbing so the spike can run as soon as the gated Meta SAM Audio checkpoints are available. Plan: [demo-plan.md](../../docs/products/audio-separation/demo-plan.md). Personas and story IDs: [personas-and-user-stories.md](../../docs/products/audio-separation/personas-and-user-stories.md).

Everything except the real model runs offline with a fake backend. Tests generate their own signals and never play audio.

## Setup

Needs `ffmpeg`/`ffprobe` on the PATH and `uv`. The project is pinned to Python 3.12.

```bash
cd tools/separation-lab
uv sync                 # core: numpy, soundfile, scipy, pyyaml (+ pytest)
uv sync --extra sam     # adds torch, torchaudio and SAM Audio (large download, CUDA wheels)
uv run pytest           # fake backend only, no network
```

## Commands

Run as `uv run seplab <command>`.

| Command | What it does |
|---|---|
| `info FILE` | duration, streams, sample rate (JSON) |
| `extract VIDEO OUT.wav [--sr 48000]` | audio to WAV, padded/trimmed to the exact source length |
| `proxy VIDEO OUT.mp4 [--height 360 --fps 5]` | low-resolution proxy video |
| `remux VIDEO AUDIO.wav OUT.mp4` | new audio into the video, video stream copied, audio fitted to the source length |
| `mix --target T.wav --interferer F.wav,SNR_DB,OFFSET_S [--rir R.wav] --seed N --out-dir D` | deterministic mixture, stems and `manifest.json` |
| `separate IN.wav --target "desc\|+:6.3:7.0" [--target ...] --strategy sequential\|parallel --backend fake\|sam --out-dir D` | targets plus others; writes one WAV per target, `others.wav`, `multitrack.wav`, `tracks.json` |
| `remix D OUT.wav --gain name=0.5 --others-gain 0 [--video V --output-video O.mp4]` | remix with a gain per track |
| `build-clips [--data data] [--out data/clips] [--story US-3.1 ...]` | builds the synthetic clip sets (about 5 per story: US-3.1, US-1.x, US-2.1, US-7.1, US-6.1) with ground-truth stems, activity and a `manifest.json` each; needs the corpora in [DATA.md](DATA.md) under `data/` |
| `diarize IN.wav OUT.json [--num-speakers N]` | pyannote speaker segments as JSON (run in `.venv-diar`) |
| `run-story US-3.1 --clips DIR --backend fake\|sam [--out runs/US-3.1]` | runs a story over every `manifest.json` under DIR; writes `results.json` and an `index.html` listening page (no autoplay) |

SAM options for `separate` and `run-story`: `--model small|base|large|small-tv|base-tv|large-tv` (default `facebook/sam-audio-large`), `--predict-spans`, `--rerank N`, `--chunk-s`, `--overlap-s` (long files, crossfaded). With `--backend sam` all processing needs the GPU and the gated weights; without access the command stops with a clear error.

Story specs live in `seplab/stories/*.yaml`, one per story (US-1.1 to US-7.2 plus the P5 concert stretch case). Each has the persona, prompt types, clip sets (real and synthetic), baselines, metrics and the pass bar: wins blind preference on at least 60% of clips, and at least half of clips are usable without apology. The `ratings` fields in `results.json` are for you to fill in after listening.

## Synthetic data and the pyannote spike

Corpora, licences and the `data/` layout: [DATA.md](DATA.md). Set `TMPDIR` to a folder under `data/` (`/tmp` hit the disk quota). Clip manifests keep run-story's format (`targets[].spans` are "mark a moment" prompts) plus `activity` (ground-truth speech segments), `others_parts` and story metadata.

The diarization spike needs its own environment, because `sam-audio` needs numpy<2 and pyannote.audio 4 needs numpy>=2.2:

```bash
UV_PROJECT_ENVIRONMENT=.venv-diar uv sync --extra diarization
UV_PROJECT_ENVIRONMENT=.venv-diar uv run --no-sync python -m seplab.spike_pyannote --clips data/clips --out runs/pyannote
```

Results: [spike-results/pyannote-clustering.md](spike-results/pyannote-clustering.md).

Korean twins of US-3.1, US-1.x and US-2.1 (Zeroth-Korean, `seplab build-clips --language ko`) and the English-vs-Korean evaluation (`python -m seplab.eval_language`): [spike-results/korean-speech.md](spike-results/korean-speech.md).

## Web demo (v0)

A local, Gaudio-Studio-style page for SAM Audio: upload a file or paste a link, pick up to 4 targets, listen to each track, set a gain per track, then download the stems or a mix. Internal testing only.

**Setup** (once). The `web` extra (gradio, yt-dlp) installs next to `sam`; always sync both so `sam` stays importable, and use `uv run --no-sync` afterwards:

```bash
cd tools/separation-lab
uv sync --extra sam --extra web
# Speaker split only: the separate pyannote environment (see above)
UV_PROJECT_ENVIRONMENT=.venv-diar uv sync --extra diarization
```

**Run.** `./run-demo.sh [--port 7860] [--backend sam|filter] [--max-seconds 600]` starts the server inside `systemd-run --user --scope -p MemoryMax=14G -p MemorySwapMax=0`, with `TMPDIR` under `data/tmp`. It binds to `127.0.0.1` only (never `share=True`, no public tunnel). Open http://127.0.0.1:7860. For remote use, forward the port from your own machine: `ssh -L 7860:127.0.0.1:7860 <host>`. `--backend filter` replaces SAM Audio with a low/high-pass filter (description `low` gives the low-pass band), for smoke tests without a GPU.

**What v0 does**
- Input: upload audio or video, or paste any public link yt-dlp supports (YouTube included). Only the chosen section is downloaded. Optional start and end; the cap is 10 minutes per job (shown in the page). Banner: "URL import is for internal testing only. Respect the platform's terms and the rights of the content owner."
- Targets: presets (voice/speech, singing voice, music, drums, bass, electric guitar, acoustic guitar, piano, sound effects, crowd noise, applause and laughter) or a free-text noun phrase, each with optional "where it sounds" spans (`12-18, 40-45`, seconds from the start of the chosen section) that become positive anchors, re-based per chunk.
- Speaker split: pyannote runs in `.venv-diar` as a subprocess (`seplab diarize IN.wav OUT.json`), then one target per speaker (description `speech`, that speaker's segments as anchors; a chunk where the speaker never talks gives silence). You can set the speaker count. The SAM model is released from the GPU before pyannote runs and reloads on the next step.
- Others, two variants: "others (mix - targets)" recombines exactly; "others (model residual)" is the model's own residual (generated, not subtracted; offered with one target only). You choose which goes into the mix.
- Model small or large (default large). "Higher quality" turns on `reranking_candidates=4` plus `predict_spans`; it needs the gated `facebook/sam-audio-judge` and LAION-CLAP. If loading fails the page says so and falls back to the standard settings. The ImageBind visual ranker is never enabled (non-commercial licence).
- Results: one player per track (no autoplay), a gain slider in dB and a mute box per track (applied by "Render mix"; the player's own volume control changes only your listening level), mix WAV preview and download, an MP4 with the mixed audio for video input (video stream copied), a zip of per-track 16-bit WAVs each exactly as long as the section, and the processing time, chunk count and peak GPU memory.
- Jobs live in `runs/web/<job-id>/` (gitignored). Each new job deletes jobs older than 7 days and keeps only the newest 20.

**Memory notes.** The machine shares RAM with other apps. The server loads one SAM model lazily and runs one job at a time. Switching the model size frees the old model first. Chunks (measured VRAM limits, `spike-results/sam-audio-first-run.md`): large uses bf16 weights plus autocast with 30 s chunks, small uses bf16 autocast with 45 s chunks, both with 2 s crossfaded overlap; higher quality uses two-thirds of those (untested guess). Measured with small on 20 s: about 9.0 GB peak GPU, 6.8 GB peak RSS. Do not start another model-loading process while the server runs, and stop it before running heavy tests.

**yt-dlp and YouTube.** Recent YouTube needs a JavaScript runtime. The `web` extra installs `yt-dlp[default]` (which includes the `yt-dlp-ejs` solver scripts) and the importer enables `node` and `deno`; `node` on the PATH is enough (checked with node 24). Without a runtime install one: `curl -fsSL https://deno.land/install.sh | sh` (puts deno in `~/.deno/bin`; add it to the PATH).

**Cannot do yet.** Clicking a face or player in the video (visual prompts) is coming in v1 (a disabled placeholder is shown). No live gain preview on the server side, no accounts, no concurrency (jobs queue one at a time), no harmony or unison separation. Chunk identity is still unverified: with text prompts a target may switch voices between chunks; use spans or speaker split for voices.

## Getting SAM Audio access (do this yourself)

1. Request access on the Hugging Face model pages for the SAM Audio checkpoints you want (for example [facebook/sam-audio-large](https://huggingface.co/facebook/sam-audio-large)), and for `pyannote/speaker-diarization-community-1`.
2. In your own terminal run `hf auth login`. Never paste tokens into chat or commit them.

## Licences

**SAM License** (read 2026-11-04): no non-commercial clause, but it carries trade-control and military restrictions, an indemnity, termination on breach (materials must then be deleted), and a requirement to include a copy of the licence when redistributing. Have counsel review before launch.

**Data.** Use only CC0, CC BY or Apache-licensed data: Common Voice, LibriSpeech, VCTK, OpenSLR SLR28, Slakh2100, VocalSet, Freesound CC0. Never use MUSDB18, MoisesDB or MedleyDB, not even for internal evaluation. Check each licence before downloading anything. Generated audio, video, data and runs are gitignored; never commit audio, video or model weights.

## SAM Audio API used (upstream README, 2026-11-04)

`from sam_audio import SAMAudio, SAMAudioProcessor`; `SAMAudio.from_pretrained(name)`, `SAMAudioProcessor.from_pretrained(name)`; `processor(audios=[...], descriptions=[...], anchors=[[["+", s, e]]], masked_videos=[...]).to("cuda")`; `model.separate(batch, predict_spans=, reranking_candidates=)` returns `.target` and `.residual`; `processor.audio_sampling_rate`. Open TODOs are marked in `seplab/separation/sam.py` (output tensor shape, building visual prompts with `processor.mask_videos`) and `seplab/separation/chunking.py` (target identity across chunks is a spike question).
