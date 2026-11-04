# Recently released open models enabling new audio/video products (research date 2026-11-04)

Evidence labels: **[V]** verified fact (read from the primary repo/model card/LICENSE on 2026-11-04), **[VC]** vendor claim (authors' own claim), **[E]** estimate (my inference), **[H]** hypothesis, **[U]** unverified (secondary source or recalled from background knowledge; recheck before relying). Budget was about 20 tool calls, so several items are [U]. Several HF pages and some GitHub URLs returned 401/404 (noted under Gaps).

## 1. Audio models: separation, enhancement, ASR, TTS, music

### Takeaway
Query-based separation (SAM Audio), lip-guided speaker extraction (Dolphin), and a strong open ASR+speaker model (Nemotron 3.5 Transcribe) are the biggest new audio building blocks. Commercial status varies: SAM Audio and Nemotron are usable commercially subject to their license text; Dolphin explicitly is NOT cleared for commercial use.

### Cited Findings
Numbered model records (fields: capability / license code, weights / hardware and cost / quality vs commercial / product jobs).

1. **Meta SAM Audio (paper 2025-12-19; sizes small/base/large plus "-tv" variants)**
   - Capability: isolate any sound from a mix by text, visual (video mask), or time-span prompt; optional re-ranking with CLAP/Judge/ImageBind — [V, GitHub](https://github.com/facebookresearch/sam-audio), [V, HF card](https://huggingface.co/facebook/sam-audio-large) (card dated paper 2025-12-19).
   - License: "SAM License" for code and weights. [V] The SAM License text (read in facebookresearch/sam3 repo, same license family, 2026-11-04) grants a non-exclusive, worldwide, royalty-free license to use/modify/distribute, has NO non-commercial clause, prohibits ITAR/military/weapons/nuclear/espionage uses, requires passing the agreement to recipients, requires indemnifying Meta, terminates if you sue Meta over IP, California law — [V, SAM3 LICENSE](https://raw.githubusercontent.com/facebookresearch/sam3/main/LICENSE). I did not read the sam-audio LICENSE file itself (assume identical; recheck). HF weights are gated (login + agree) [V].
   - Hardware: CUDA GPU recommended; no VRAM or RTF figures published on the pages I read [V]. Re-ranking (`reranking_candidates=8`) and span prediction raise latency/memory [V]. Cost: [E] GPU-seconds per audio-second, roughly a few cents per minute on a rented 24 GB GPU; measure.
   - Quality vs commercial: Meta reports subjective scores e.g. large = 4.49 on Instr(pro), 3.50 on General SFX [V, from repo]; no head-to-head against commercial tools found. [VC]
   - Jobs: (a) "remove the dog bark / siren / keyboard" from user video by text prompt; (b) click-a-person-in-video voice extraction (visual prompt) for interviews/vlogs; (c) stem extraction of arbitrary instruments in field recordings.
2. **AudioSep (2023-24, pre-window baseline)** — language-queried separation. [U] Code MIT per recall; recheck. Role: older baseline that SAM Audio supersedes; [H] only useful if SAM Audio license/gating is a blocker.
3. **Dolphin (audio-visual speech separation; code+weights 2025-09-28; ICLR 2026 accepted 2026-01-26; updates through 2026-04-14)**
   - Capability: separate target speakers using lip motion (DP-LipCoder); reported SI-SNRi 14.6 dB, PESQ 3.17 on VoxCeleb2; claims >50% fewer params, >2.4x fewer MACs, >6x faster GPU inference than IIANet — [V repo / VC numbers](https://github.com/JusperLee/Dolphin).
   - License: code Apache-2.0 [V]. Weights/data NOT covered; video encoder trained with AV-HuBERT feature targets without separate Meta permission; maintainers say checkpoint is NOT represented as cleared for commercial/production use [V, same page]. **Gotcha: do not ship as-is; retrain or get clearance.**
   - Hardware: PyTorch >=2.5, CUDA >=12.4; light variant `dolphin_light.py` (2026-04-09) [V]. Cost: [E] small model, real-time or faster on a consumer GPU.
   - Jobs: pull one speaker out of crowded multi-person video (panel, court, classroom); clean speaker audio for dubbing.
4. **NVIDIA Nemotron 3.5 Transcribe (reported release 2026-10-28)**
   - Capability: ASR in ~40 languages, speaker attribution, translation, contextual prompting, in one checkpoint; sources disagree on size (30B MoE/4B active vs 34B/4.3B active) — [secondary summary via search](https://hackernoon.com/nvidia-nemotron-35-transcribe-a-complete-guide-to-the-speech-ai-model), [second source](https://apidog.com/blog/nemotron-3-5-transcribe-free/) [U]. Direct HF page returned HTTP 401, so NOT verified at primary source.
   - License: OpenMDW-1.1, described as permitting commercial use [U, same sources]. Note sibling "Nemotron 3.5 ASR" (600M streaming, June 2026) reported under the same license [U]. Earlier Nemotron 3 Nano/Super use NVIDIA's own Open Model License [U].
   - Hardware: [E] a 4B-active MoE needs ~24-80 GB GPU memory to hold all weights unless quantized; verify. Quality: marketed as "#1 open speech-to-text" [VC, apidog]; unverified against ElevenLabs Scribe/Deepgram.
   - Jobs: meeting/call/interview transcripts with who-said-what without a separate diarization stack; multilingual (incl. Korean? unverified) captions + translation.
5. **pyannote speaker-diarization-community-1** — open diarization pipeline. License CC-BY-4.0 (attribution required), gated download needing an HF account [V, [HF](https://huggingface.co/pyannote/speaker-diarization-community-1) via search result]. Release date unconfirmed (one directory says 2025-04-15, HF benchmark table updated 2025-09) [U]. Jobs: speaker-labelled transcripts, speaker-aware editing UIs. Cost: [E] CPU-feasible, GPU-fast.
6. **ClearerVoice-Studio (MossFormer2 / FRCRN / speech SR; repo Nov 2024, SR added Jan 2025, pip April 2025)** — Apache-2.0 repo [V, [GitHub](https://github.com/modelscope/ClearerVoice-Studio)]. Capabilities: denoise, separation, target speaker extraction, 16 kHz->48 kHz speech super-resolution [V]. Per-checkpoint weight licenses not checked [gap]. Hardware: [E] runs real-time on modest GPU/CPU. Jobs: cleanup of phone/Zoom recordings to podcast quality at low cost; bandwidth extension of archive speech.
7. **Resemble Enhance** — denoise + enhance speech. [U] MIT per recall; older (2023). Included as a baseline; [H] ClearerVoice is the better 2025 option.
8. **Whisper successors** — Whisper large-v3-turbo (2024-10, MIT) [U] remains the common open baseline; Nemotron 3.5 and other 2026 models compete. No primary check done.
9. **Chatterbox (Resemble AI, 2025) TTS / voice cloning** — described as MIT with built-in audio watermark [U, [search summary](https://scalabs-cloud.pages.dev/utilities/chatterbox)]. Jobs: voice-preserving dubbing, narration in a cloned (consented) voice.
10. **Qwen3-TTS (Alibaba)** — described as Apache 2.0, 3-second voice cloning [U, [DEV post](https://dev.to/gary_yan_86eb77d35e0070f5/qwen3-tts-complete-guide-to-open-source-text-to-speech-model-9oe)]. Jobs: multilingual dubbing, real-time voice agents.
11. **Licensing traps in TTS:** XTTS v2 (Coqui Public Model License) restricts commercial hosting; Voxtral 4B reported CC-BY-NC 4.0; VibeVoice license not confirmed [U, [search summary](https://tts.ai/blog/open-source-text-to-speech-guide-2026/?lang=ta)]. CosyVoice2 reported Apache-2.0 [U]. F5-TTS weights are CC-BY-NC per recall [U].
12. **ACE-Step 1.5 (arXiv 2602.00744, 2026-02; XL variants later)** — open-weight song generation. MIT (AMD blog, ComfyUI blog) vs Apache-2.0 (ComfyUI Wiki): sources conflict — [AMD](https://www.amd.com/en/blogs/2026/commercial-grade-ai-music-generation-on-amd-ryzen-ai-and-radeon-ace-step-1-5.html), [Comfy blog](https://blog.comfy.org/p/ace-step-15-xl-commercial-grade-music), [paper](https://arxiv.org/abs/2602.00744) [U on license]. Training data claimed licensed/royalty-free/synthetic [VC]. Runs on consumer/AMD hardware per AMD blog [VC]. Quality "rivals commercial AI" is [VC] (NYU Shanghai blog, [link](https://rits.shanghai.nyu.edu/ai/ace-step-1-5-open-source-music-generation-that-rivals-commercial-ai/)). Jobs: royalty-clean background music per video, stem-aware music edits, self-hosted jingle generation.
13. **Music source separation toolkit (ZFTurbo MSST)** — training/inference framework for stem models; tuned for A6000 48 GB training [V, [GitHub](https://github.com/ZFTurbo/Music-Source-Separation-Training)]. Repo license not read (page omitted it) [gap]. Individual checkpoint licenses vary widely (many community weights are unclear) [H].

### Inferences
- [E] Highest MVP value/risk ratio in audio: SAM Audio (prompted removal/extraction), Nemotron 3.5 + pyannote (transcript+speakers), ClearerVoice (cleanup). All can be wrapped as batch GPU jobs in three months.
- [H] Audio-visual extraction (Dolphin) is blocked commercially until weights are retrained on cleared data or a license is obtained; SAM Audio's visual prompt is the commercial route.

### Gaps
- No primary read of Nemotron 3.5 Transcribe (HF returned 401), OpenMDW-1.1 text, sam-audio LICENSE, AudioSep, Resemble Enhance, Whisper successors, Chatterbox/Qwen3-TTS LICENSE files, or speech-to-speech models (e.g. Kyutai Moshi/Unmute, Sesame CSM) — not searched.
- No independent head-to-head versus ElevenLabs/Adobe Enhance/Descript/Suno; no audio super-resolution model beyond ClearerVoice (e.g. AudioSR, FlowHigh not checked).
- Real run costs not measured.

## 2. Video models: segmentation, matting, restoration, inpainting, lip-sync, depth

### Takeaway
Segmentation (SAM 3/3.1), restoration (SeedVR/SeedVR2), diffusion inpainting, and depth are offline-feasible and increasingly robust. Many popular research tools (CodeFormer, ProPainter, MatAnyone, Video Depth Anything Base/Large) are non-commercial; permissive alternatives exist but need verification.

### Cited Findings
14. **SAM 3 / SAM 3.1 (Meta; SAM 3 paper year 2025; SAM 3.1 "Object Multiplex" 2026-03-27)** — promptable concept segmentation + video tracking from text or visual prompts, 848M parameters (detector + tracker sharing an encoder); SA-V test cgF1 30.3, pHOTA 58.0 [V, [GitHub](https://github.com/facebookresearch/sam3)]. License: SAM License (commercial not prohibited; military/ITAR carve-outs) [V, [LICENSE](https://raw.githubusercontent.com/facebookresearch/sam3/main/LICENSE)]. Hardware: Python >=3.12, PyTorch >=2.7, CUDA >=12.6; VRAM not stated [V]. Jobs: "select all <concept>" in footage for blur/replace/grade; auto-masks feeding inpainting or matting; privacy redaction by concept. SAM 2 (2024-08, Apache-2.0 per recall [U]) remains the permissive fallback.
15. **SeedVR / SeedVR2 (ByteDance Seed/NTU; SeedVR CVPR 2025 Highlight; weights released 2025-06)** — one-step-capable diffusion-transformer video restoration at arbitrary resolution. Code Apache-2.0 [V]; weight license not stated on repo page, check HF [gap] — [GitHub](https://github.com/IceClear/SeedVR). Hardware: big model, [E] 24-80 GB GPU, minutes per clip. Jobs: remastering SD/phone footage to HD/4K; archive restoration. Quality vs Topaz: [VC]/untested.
16. **FlashVSR (OpenBMB, 2025)** — streaming one-step VSR diffusion, claimed near-real-time. Repo URL I tried returned 404; license and numbers UNVERIFIED [U/gap].
17. **DiffuEraser (Alibaba, code 2025-01-20, training 2025-03-26)** — diffusion video inpainting (UNet + BrushNet + temporal attention). Code Apache-2.0 BUT depends on ProPainter prior and README says you must comply with ProPainter's license; ProPainter weights required download [V, [GitHub](https://github.com/lixiaowen-xw/DiffuEraser)]. VRAM/time on L20: 720p 250 frames = 33 GB, 314 s; 540p = 20 GB, 175 s; 360p = 12 GB, 92 s [V]. Authors claim it beats ProPainter in completeness and temporal consistency [VC]. Jobs: remove people/logos/watermarks/mics from clips. Cost: [E] roughly 0.3-1 GPU-sec per output frame at 540p-720p, i.e. ~1-5 USD per 10-min clip on rented GPUs; measure.
18. **ProPainter (S-Lab)** — **S-Lab License 1.0: use for non-commercial purposes only**; commercial use needs permission from the authors [V, [LICENSE](https://raw.githubusercontent.com/sczhou/ProPainter/main/LICENSE)]. Do not ship.
19. **CodeFormer (S-Lab)** — **S-Lab License 1.0, non-commercial only** [V, [LICENSE](https://raw.githubusercontent.com/sczhou/CodeFormer/master/LICENSE)]. GFPGAN is Apache-2.0 code per recall [U] but depends on training data/third-party weights (e.g. FFHQ, StyleGAN2 lineage) so recheck dataset terms [H].
20. **MiniMax-Remover (2025)** — fast few-step video object remover; repo URL guessed wrong (404), license unverified [gap/U].
21. **MatAnyone / MatAnyone 2 (S-Lab/NTU; paper arXiv 2512.11782, 2025-12)** — memory-based video matting with learned quality evaluator. NTU S-Lab License 1.0, non-commercial per HF demo [U, [search](https://arxiv.org/abs/2512.11782)]. Commercial alternatives (e.g. Robust Video Matting is GPL-3.0 per recall [U]; SAM 3 masks plus alpha refinement [H]). Jobs: studio-free green-screen replacement from phone video (hair/edge detail still a hard region [H]).
22. **LatentSync 1.5 / 1.6 (ByteDance; 2025-03-14 / 2025-06-11)** — diffusion lip-sync, 1.6 trained at 512x512; inference VRAM 8 GB (1.5), 18 GB (1.6); code Apache-2.0, weight license not stated on repo page (check HF ByteDance/LatentSync-1.6) [V, [GitHub](https://github.com/bytedance/LatentSync)]. Jobs: dubbed video with matching lip movement; localized ads/training videos.
23. **MuseTalk (Tencent; v1.5 2025)** — real-time-ish lip-sync; repo fetch 404, license not verified [U/gap]. Treat both lip-sync models' training data (e.g. VoxCeleb/HDTF-style face datasets) as a dataset-licensing risk [H].
24. **Video Depth Anything (ByteDance; 2025-01-21; metric models 2025-04-25, 2025-08-28; streaming 2025-09-12)** — temporally consistent depth for long video. Small (28.4M) Apache-2.0; Base (113M) and Large (382M) **CC-BY-NC-4.0** [V, [GitHub](https://github.com/DepthAnything/Video-Depth-Anything)]. VRAM (A100, 32 frames 518x518): Small 6.8-7.3 GB, Large 23.6-26.7 GB; latency Small ~7.5-9 ms, Large 14-67 ms [V]. Jobs: depth-aware relighting, fake-DoF/portrait mode on any video, 2.5D parallax effects.
25. **Not covered (no time):** IC-Light/relighting, RIFE/GIMM-VFI interpolation, stabilization, 3D/Gaussian splatting from phone video (e.g. VGGT, 3DGS licenses — original 3DGS is non-commercial per recall [U]).

### Inferences
- [E] Offline-feasible and robust: segmentation/tracking (SAM 3), restoration/upscaling (SeedVR), object removal on static or slowly moving cameras (DiffuEraser), depth (VDA), lip-sync for frontal talking heads.
- [H] Still hard (the team's prior failure mode): photoreal region replacement with large pose change, occlusion or fast motion; edge blending around hair/glass; flicker across long clips in diffusion inpainting (DiffuEraser itself blends outputs with blurred masks, indicating seam handling is still manual [V, README]); lip-sync identity drift and jaw/teeth artifacts. Not tested by me.
- [H] The team's CV skills best apply to wrappers that add pose/mask stabilization, QA metrics, and human-in-the-loop correction around these models rather than a new generator.

### Gaps
- Unverified: FlashVSR, MiniMax-Remover, MuseTalk, GFPGAN, SAM 2, RVM, IC-Light, frame interpolation, stabilization, Gaussian splatting licenses. Dataset provenance not audited beyond Dolphin's note.
- Weight licenses for SeedVR2 and LatentSync on HF not read.
- No hands-on quality tests versus Topaz/Runway/Adobe; no run-cost measurements.

## 3. Licensing gotchas (summary)

### Takeaway
Code license does not equal weight license; always check the HF model card and the datasets.

### Cited Findings
- S-Lab License 1.0 (CodeFormer, ProPainter, MatAnyone family) = non-commercial [V for first two, U for MatAnyone 2].
- Dolphin: Apache code but weights not cleared (AV-HuBERT upstream) [V].
- DiffuEraser: Apache code, but ProPainter dependency imposes its license [V].
- Video Depth Anything: Small Apache-2.0, Base/Large CC-BY-NC-4.0 [V].
- SAM Audio / SAM 3: SAM License permits commercial use but has defense/export carve-outs and indemnity obligations [V].
- pyannote community-1: CC-BY-4.0 attribution required [V via search snippet of HF card].
- TTS: XTTS, Voxtral, F5-TTS weights restricted [U].

### Inferences
- [H] Budget a one-week license/provenance audit with counsel before committing to any of items 3, 17, 21, 22, 23.

### Gaps
- Full OpenMDW-1.1 text not read.

## Suggested MVP-ready shortlist [H]
SAM Audio + Nemotron 3.5/pyannote + ClearerVoice (audio); SAM 3 + SeedVR2 + a ProPainter-free inpainter + VDA-Small (video). Verify licenses first.
