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

## Getting SAM Audio access (do this yourself)

1. Request access on the Hugging Face model pages for the SAM Audio checkpoints you want (for example [facebook/sam-audio-large](https://huggingface.co/facebook/sam-audio-large)), and for `pyannote/speaker-diarization-community-1`.
2. In your own terminal run `hf auth login`. Never paste tokens into chat or commit them.

## Licences

**SAM License** (read 2026-11-04): no non-commercial clause, but it carries trade-control and military restrictions, an indemnity, termination on breach (materials must then be deleted), and a requirement to include a copy of the licence when redistributing. Have counsel review before launch.

**Data.** Use only CC0, CC BY or Apache-licensed data: Common Voice, LibriSpeech, VCTK, OpenSLR SLR28, Slakh2100, VocalSet, Freesound CC0. Never use MUSDB18, MoisesDB or MedleyDB, not even for internal evaluation. Check each licence before downloading anything. Generated audio, video, data and runs are gitignored; never commit audio, video or model weights.

## SAM Audio API used (upstream README, 2026-11-04)

`from sam_audio import SAMAudio, SAMAudioProcessor`; `SAMAudio.from_pretrained(name)`, `SAMAudioProcessor.from_pretrained(name)`; `processor(audios=[...], descriptions=[...], anchors=[[["+", s, e]]], masked_videos=[...]).to("cuda")`; `model.separate(batch, predict_spans=, reranking_candidates=)` returns `.target` and `.residual`; `processor.audio_sampling_rate`. Open TODOs are marked in `seplab/separation/sam.py` (output tensor shape, building visual prompts with `processor.mask_videos`) and `seplab/separation/chunking.py` (target identity across chunks is a spike question).
