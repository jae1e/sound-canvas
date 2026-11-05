# Audio separation demo: functional plan

**Status: 2026-11-04.** Read [personas-and-user-stories.md](personas-and-user-stories.md) first.

## User decisions (2026-11-04)

- All 8 personas stay. **The demo covers P1–P7.** P8 is not in the demo.
- **Functionality comes first.** Landing pages and demand tests are deferred.
- **Targets plus "others".** The user picks the sounds they care about. Everything else goes into a single "others" track. The product does not try to identify every sound.
  - The concert sing-along case stays this way: keep the stage sound and put fans' singing into "others". Leakage is expected when a fan sings the performer's melody (near-unison). The goal there is reduction, not elimination.
- Harmony groups and unison choruses are excluded.

## Source model: targets and others

1. The user picks one or more **targets**, by clicking a face or player, marking a moment, describing the sound, or picking a suggested source.
2. Each target becomes its own track with its own level.
3. **Others** is everything that is not a target. It is one track with one level, and its default is "remove".
4. The suggested-source list is only a set of shortcuts for building prompts. It is not a full inventory of the mix.

There are two ways to implement this. The spike decides between them:
- **Sequential.** Extract target 1 from the mix, then target 2 from what is left, and so on. "Others" is the final residual. The tracks sum back to the input, provided the model's target plus residual equals its input; the spike must check that.
- **Parallel.** Extract each target from the full mix, and set others = mix − Σ targets. The risk is double counting where targets overlap.

## Stories mapped to functions

| Story | Prompt | Functions needed |
|---|---|---|
| US-1.1 Keep the interviewee (P1) | Click a face | Face list and tracking, visual prompt, others |
| US-1.2 Keep me too (P1) | Mark a moment, or the suggested "voice near the camera" | Speaker clustering, camera-holder heuristic, span prompt |
| US-1.3 Remove the shop music (P1) | Suggested "music" | Audio tags, text prompt, level per source |
| US-2.1 Rescue the toast (P2) | Mark a moment | Span prompt, long files, export with exactly the same length |
| US-2.2 Keep the room (P2) | Type "laughter and applause" | Text prompt, levels |
| US-2.3 Batch the reception (P2) | Same voice found in all files | Cross-file speaker matching, batch queue |
| US-3.1 Speaker split (P3) | Automatic | Diarization, one span-prompted pass per speaker, multitrack export |
| US-3.2 Name the speakers (P3) | Samples | Speaker samples, naming |
| US-3.3 Remove the café (P3) | Suggested "music", "machine noise" | Text prompt on every track |
| US-4.1 Remove the music, keep everything else (P4) | Suggested "music with vocals" | Text prompt, 1–3 h files, chunking |
| US-4.2 Stems for my editor (P4) | Voice / game sound / music | Several targets plus others, stem export |
| US-4.3 Overnight batch (P4) | n/a | Batch queue |
| US-5.1 Remove us (P5) | "Voice near the camera", "people talking" | Camera-holder heuristic, others |
| US-5.2 Keep the cheering (P5) | Type "crowd cheering" | Text prompt, levels |
| Stretch: concert sing-along (P5) | Keep "stage sound"; fans go to others | Text or visual prompt on the stage |
| US-6.1 Only her lines (P6) | Mark one line | Vocal stem, then singer clustering, then span prompts; labels for "group, not separable" sections |
| US-6.2 Sing with the group (P6) | Remove the marked singer | Same as above, inverted |
| US-6.3 Use the music video (P6) | Click a face | Visual prompt, with on-screen timing as a hint |
| US-6.4 Teacher batch (P6) | n/a | Batch queue |
| US-7.1 The second guitar (P7) | Type "acoustic rhythm guitar" | Text prompt, reranking |
| US-7.2 Click the player (P7) | Click the guitarist | Visual prompt |

## Components and licences

| Function | Candidate | Licence | Notes |
|---|---|---|---|
| Separation by text, span or visual prompt | Meta SAM Audio: small, base and large, plus `-tv` variants (better on target correctness and visual prompting) ([GitHub](https://github.com/facebookresearch/sam-audio)) | SAM License, read directly 2026-11-04 (see below) | Checkpoints are gated on Hugging Face and need the user's access. Python 3.11 or later. The API returns `target` and `residual`. It offers `predict_spans` and `reranking_candidates`, which improve quality at a cost in latency and memory [vendor claim]. |
| Face list and masks from a click | SAM 3 (SAM License) or SAM 2 (Apache-2.0) | Same as above / Apache-2.0 | SAM 3's text prompt "face" can list and track all faces |
| Speaker clustering ("find all lines by this voice") | pyannote `speaker-diarization-community-1` | CC-BY-4.0 | Gated on Hugging Face |
| Singer clustering | pyannote run on the vocal stem first; fallback is speaker embeddings over vocal segments | n/a | [hypothesis] speech-trained models may not transfer well to singing |
| Source suggestions | An AudioSet tagger (BEATs, PANNs or AST), or CLAP zero-shot | Check each licence before use | |
| Camera-holder heuristic | Level and direct-to-reverberant ratio per speaker cluster, combined with "no matching on-screen face" | Own code | [hypothesis] |
| Media input and output | ffmpeg, run as an external binary | LGPL/GPL builds | |
| Metrics | SI-SDR and SDR improvement | Own code | |

**SAM License summary**, from the [LICENSE](https://raw.githubusercontent.com/facebookresearch/sam-audio/main/LICENSE) last updated 2025-11-19:
- Royalty-free right to use, copy, modify and distribute. No non-commercial clause.
- Prohibited: ITAR, military, trade-control, nuclear and weapons end uses, and reverse engineering.
- A copy of the licence must accompany any redistribution.
- The user indemnifies Meta. Meta may terminate the licence on breach, after which the materials must be deleted.
- Outputs are not addressed explicitly. Users assume the risk associated with outputs.
- Have counsel review it before launch.

## Phases (estimates)

1. **Spike, about 1 week, on the RTX 4090 (24 GB).** Questions to answer:
   1. VRAM, speed and real-time factor for each model size. The maximum length per pass. Whether a target keeps its identity across chunks.
   2. Whether `target + residual` equals the input. This decides sequential versus parallel extraction.
   3. Whether span prompts can separate voice against voice, for example one speaker among several (P1, P3, P6). Whether negative spans are supported.
   4. Visual prompts on talking faces with the `-tv` models (P1, P6, P7).
   5. Text prompts for:
      - instruments, including "acoustic guitar" in a two-guitar mix (P7);
      - removing music while keeping sound effects (P4);
      - "laughter and applause" (P2).
   6. The camera-holder heuristic (P1, P5).
   7. The concert stretch case: keep the stage sound and put the crowd's singing into others (P5).
2. **Pipeline CLI, about 3–4 weeks.**
   1. Ingest.
   2. Analysis: audio tags, diarization, faces.
   3. Targets and others.
   4. Remix with levels.
   5. Export as MP4, WAV stems and multitrack WAV, each exactly as long as the source.
   6. Batch processing.
3. **Local web demo, about 3–4 weeks.**
   - Upload, including browser-side extraction of audio plus a low-resolution video proxy.
   - Source list.
   - Click a face, mark on the waveform, describe in a text box.
   - Level sliders and A/B preview.
   - Export and a batch queue.
4. **Story simulation harness, running alongside phases 2–3.** It runs the P1–P7 clip sets and writes a report with metrics and listening pages. The pass bar is from the personas doc:
   - the demo wins blind preference against the persona's baseline tool on at least 60% of clips;
   - at least half the clips are usable without apology.

## Test data

**Synthetic data with ground truth.** This can start now, without the user's clips. Check each licence before use.

| Candidate | Licence | Use |
|---|---|---|
| Mozilla Common Voice | CC0 | Speech, including Korean |
| LibriSpeech, VCTK | CC BY 4.0 | Speech |
| OpenSLR SLR28 | Apache-2.0 | Room impulse responses and noise |
| Slakh2100 | CC BY 4.0 | Rendered multi-instrument songs with separate tracks, including multiple guitars, for P7 |
| VocalSet | CC BY 4.0 | Solo singing, arranged into synthetic alternating-line songs for P6 |
| Freesound | CC0 | Ambience and crowd sounds |

Do not use non-commercial sets (MUSDB18, MoisesDB, MedleyDB), not even for internal evaluation.

**Real clips, needed from the user or the team:**
- Lav-reference recordings for P1 (street), P2 (speech in a noisy room), P3 (café) and P5 (recital).
- The team's own stream or gameplay captures with music for P4.
- A duet recorded by friends, singing alternate lines with one track each, for P6.
- Two-guitar recordings for P7.

## Next actions

1. **The user:** request access to the SAM Audio checkpoints, and to `pyannote/speaker-diarization-community-1`, on Hugging Face with your own account. Then run `hf auth login` in your own terminal. Do not paste tokens into chat.
2. **Engineering:** scaffold `tools/separation-lab` with these parts:
   - ingest and mixing;
   - metrics;
   - a SAM Audio wrapper that implements targets plus others, with a fake backend for tests;
   - a story-harness skeleton.

   Then build the synthetic clip sets and run the spike once access is granted.

## Status update (2026-11-05)

- **SAM Audio spike:** first runs are recorded in [tools/separation-lab/spike-results/sam-audio-first-run.md](../../../tools/separation-lab/spike-results/sam-audio-first-run.md).
  - The memory-light loader cut host RAM from about 14.6 GB to 6–8.5 GB.
  - Large with bf16 weights fits about 45 s per pass, so the demo processes 30 s chunks.
  - Target plus residual does not equal the input.
  - The ImageBind visual ranker is non-commercial (CC BY-NC-SA 4.0) and is kept off.
- **Web demo v0:** pulled forward at the user's request (2026-11-04). It is a Gaudio-Studio-style flow at `tools/separation-lab/seplab/web/` (Gradio), launched with `./run-demo.sh`.
  - Binds to 127.0.0.1 only and runs inside a 14 GB memory-capped scope.
  - Input is an uploaded file or a URL, imported with yt-dlp. **URL import is for internal testing only.** Whether the public product accepts platform links is still an open decision; the earlier rights posture was to accept uploads only.
  - Up to 4 targets, each a preset or free text, with optional spans.
  - Speaker split via pyannote.
  - Two "others" variants, per-track gain and mute, mix WAV or MP4, and stems as a zip.
  - Not in v0: clicking a face or player (visual prompts) and the `-tv` models. Both are planned for v1.

## UI v1 design: one "Sources found" panel (2026-11-05)

The user described five scenarios to support. In all of them the audio comes first: the product works out who or what is playing, and when, from the audio itself. Video is an optional extra that lets the user pick a source by clicking on it.

| Scenario | How sources are found | How the user selects | Main difficulty |
|---|---|---|---|
| Sitcom with faces visible (actor 1, actor 2, noise) | Speaker clustering over the whole file (pyannote). Faces are tracked within each shot, and active-speaker (lip-sync) detection attaches each face to a voice cluster. The voice itself links the same person across shots, so no face-recognition model is needed. | Person card, a click on a face in the paused frame, or a timeline bar | Reaction shots where the speaker is off-screen, overlapping lines, the laugh track |
| Football broadcast with commentators off-screen | Speaker clustering only. Commentators are close-miked over the crowd, so the voices are relatively clean. | Person card ("off-screen voice"), or a timeline bar | Both commentators shouting at once at a goal, crowd chanting |
| Concert where the band and instruments are visible | Audio tagging plus probe separation (a short excerpt per candidate prompt, kept if the stem is not silent). Open-vocabulary video segmentation (SAM 3: "guitar", "drum kit", "person playing keyboard") can then link a stem to a player. | Instrument card, a typed description, a marked moment, or a click on the player (visual prompt, `-tv` model) | Two instruments of the same type, stage bleed, PA and crowd |
| Concert where instruments cannot be seen or recognised | Same as above, but audio only | Instrument card, a typed description, a marked moment | Live reverb and crowd. The crowd singing goes to "others" (user decision) |
| Music with only a still cover image | Audio only. A static frame is detected and video analysis is skipped. | Instrument card, a typed description, a marked moment | Two of the same instrument. The upstream processor averages the channels to mono, so stereo panning (left vs right guitar) is lost unless the lab adds a mid/side or per-channel pre-step [hypothesis to test] |

**UI elements:**
- One card per detected source (person or instrument), with a face, icon or "off-screen" marker, the duration it is active, and a 3 s sample.
- Keep, remove and level controls for each source.
- A timeline lane per source; clicking a lane jumps the video there.
- Merge and split corrections.
- A "describe a sound" box and a "this sound at [time]" box.
- Click-on-video, shown only when the video is not a still image.
- "Separate selected", which runs only after selection because separation is the expensive step.

**Order of work:**
1. Cards, timeline and per-source separation (audio only). This covers football, music with a cover image, and concerts where instruments cannot be seen.
2. Face and instrument linking, plus click-on-video (SAM 3, active-speaker detection, `sam-audio-large-tv`). Check the licences before use.
3. Later, a dedicated front end with instant WebAudio mixing in place of Gradio.
