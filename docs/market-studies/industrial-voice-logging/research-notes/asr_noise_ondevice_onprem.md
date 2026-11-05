# ASR for Noisy Industrial and Field Voice Logging: On-Device (Android) and On-Prem (Single RTX 4090), Korean and English, Commercial Licences

Research date: 2026-11-05 (web research only; no models downloaded or run).
Scope: speech recognition for a voice-first logging app. The phone (Galaxy S25 class) transcribes offline for immediate feedback. A self-hosted server (1x RTX 4090 24 GB, 29 GiB RAM, 16 threads) re-transcribes after sync. External cloud AI is not allowed.

Labels: **[F]** verified on a primary source (model card, licence file, official docs, paper abstract); **[V]** vendor claim (benchmarks published by the model's own maker); **[P]** third-party report; **[A]** anecdote; **[E]** estimate; **[H]** hypothesis.

Builds on prior repo research. Not redone here:
- [technical-decisions.md](../../../products/voice-life-companion/technical-decisions.md) sections 2 and 4.3-4.5: sherpa-onnx in an Expo module, Korean zipformer data-licence doubt, Moonshine Korean, Qwen3-ASR-0.6B, Moonshine v2 English.
- [apps/mobile/SPIKE.md](../../../../apps/mobile/SPIKE.md): the first S25 run, where platform SODA recognized ko/en with language detection.
- [earbud-compatibility.md](../../../products/voice-life-companion/earbud-compatibility.md) section 5.

Where those documents are now stale, this note says so explicitly.

---

## Q0. Shortlist: which candidates should go into the bake-off?

### Takeaway
The server now has strong commercially licensed Korean+English options that did not exist a year ago:
- Qwen3-ASR-1.7B: Apache-2.0, Korean, noise-robust per the vendor, supports context biasing.
- Cohere Transcribe 2B: Apache-2.0, Korean, gated download.
- Whisper large-v3 via faster-whisper or WhisperX: MIT. It remains the code-switching baseline.

On the phone, the new primary candidate for true streaming Korean+English in one model is NVIDIA Nemotron 3.5 ASR Streaming 0.6B (OpenMDW-1.1, already in sherpa-onnx, about 650 MB int8). Keep the zero-size platform recognizer (SODA / ML Kit GenAI) alongside it. None of the NVIDIA Parakeet, Canary, Granite, Phi-4-multimodal or Kyutai models transcribe Korean.

### Cited Findings

**Server-side shortlist (Korean + English)**

| Candidate | Size | Korean accuracy | English accuracy | Noise evidence | Latency / throughput | Licence |
|---|---|---|---|---|---|---|
| Qwen3-ASR-1.7B (Jan 2026) | ~2B params, BF16 | FLEURS-ko 2.57, CommonVoice-ko 5.88, MLC-SLM-ko 8.61 [V] | LibriSpeech 1.63/3.38; Open ASR mean WER 5.76, RTFx 147.93 [V] | ExtremeNoise (Mandarin) 16.17 vs Whisper-large-v3 63.17 [V] | TTFT 102 ms; offline RTF 0.01482 at concurrency 1; 1,219 s of audio per second at concurrency 128 (GPU not stated in the extract) [V] | Apache-2.0 [F] |
| Qwen3-ASR-0.6B | ~0.6B | FLEURS-ko 3.72, CV-ko 8.48, MLC-SLM-ko 10.31 [V] | n/a | ExtremeNoise 17.88 [V] | TTFT 92 ms; 2,000 s of audio per second at concurrency 128 [V] | Apache-2.0 [F] |
| Cohere Transcribe 03-2026 | 2B | Korean supported; per-language CER only in a figure [V] | Open ASR #1 at 5.42 avg WER (Mar 2026); LS clean/other 1.25/2.37 [V] | Trained with 0-30 dB SNR noise augmentation; tends to transcribe non-speech sounds, so the vendor recommends a VAD or noise gate [V] | "3x throughput of similar-size models", vLLM support merged [V] | Apache-2.0, gated HF download [V/P] |
| Whisper large-v3 / large-v3-turbo (faster-whisper / WhisperX) | 1.55B / 809M | FLEURS-ko CER 3.2 for "Whisper-Large" (HiKE paper) [P]; KsponSpeech eval_clean CER 17.03 for raw large-v3 on a 3,000-utterance subset [P] | FLEURS-en WER 4.4 (HiKE) [P] | Hallucinates on non-speech; VAD needed (see Q5) [P] | faster-whisper large-v2 fp16 batch 8: 13 min of audio in 17 s on an RTX 3070 Ti, 6.1 GB VRAM [F] | MIT (faster-whisper) [F]; WhisperX BSD-2 [F] |
| Nemotron 3.5 ASR Streaming 0.6B (2026-06-04) | 600M, cache-aware FastConformer RNNT | FLEURS-ko CER 7.59 (80 ms chunk) to 7.12 (1.12 s); auto-LID 8.31 to 7.30 [V] | en-US/en-GB WER 9.43 (80 ms) to 7.91 (1.12 s) [V] | "Diverse and challenging acoustic conditions"; no numbers [V] | H100: ~240 streams at 80 ms, 2,400 at 1.12 s [V] | OpenMDW-1.1, "ready for commercial use" [F] |
| Voxtral Mini 4B Realtime 2602 (Feb 2026) | ~4B (3.4B LM + 970M encoder) | FLEURS-ko 12.29 offline, 15.74 at 480 ms, 19.81 at 160 ms (metric not labelled) [V] | FLEURS-en 3.32 offline, 4.90 at 480 ms [V] | Not stated for Realtime | Delay 240 ms-2.4 s; BF16 on a single ≥16 GB GPU; vLLM Realtime API [V] | Apache-2.0 [F] |

**Server-side, English only (no Korean)**

| Candidate | Notes | Licence |
|---|---|---|
| Parakeet-TDT-0.6B-v3 (2025-08-14) | 25 European languages, **no Korean** [F]. Open ASR avg 6.34; MUSAN noise: 7.12 at 10 dB, 8.23 at 5 dB, 11.66 at 0 dB, 19.88 at -5 dB; RTFx 3,332.74 [V] | CC-BY-4.0, commercial OK [F] |
| Canary-1B-v2 / Canary-Qwen-2.5B | Canary-1B-v2: 25 European languages, no Korean [P]. Canary-Qwen-2.5B: English only per its card [P] | Not rechecked |
| Granite 4.0 1B Speech (2026-03-06) | en, fr, de, es, pt, ja, **no Korean**; Open ASR 5.52 WER, RTFx 280; "Keywords:" biasing [F/V] | Apache-2.0 [F] |
| Phi-4-multimodal-instruct | Speech languages en, zh, de, fr, it, ja, es, pt; **no Korean** ("not designed for Korean speech-to-text"); only a PoC Korean fine-tune at 3.54% WER on Zeroth [F/V] | MIT [F] |
| Kyutai STT | stt-1b-en_fr (500 ms delay, semantic VAD) and stt-2.6b-en (2.5 s delay); no Korean [F]. 400 real-time streams on an H100 claimed [V] | CC-BY-4.0 weights per mirrored cards [P]; not stated on kyutai.org/stt [F] |

**On-device (Android) shortlist**

| Candidate | Size | Korean | Streaming | Speed evidence | Licence |
|---|---|---|---|---|---|
| Platform `SpeechRecognizer` on-device (Google SODA) | 0 MB in the app | Worked for ko/en with platform language detection on the user's S25 (Android 17) in the first spike run ([SPIKE.md](../../../../apps/mobile/SPIKE.md)) | Yes (partials) | End of speech is reported together with the final; real end-of-speech to final is estimated at 600-900 ms in [speech-cloud-vs-device.md](../../../products/voice-life-companion/speech-cloud-vs-device.md) [E] | Platform API |
| ML Kit GenAI Speech Recognition `1.0.0-alpha2` | 0 MB (system model) | Basic mode: ko-KR **beta**. Advanced mode: ko-KR **not beta** [F] | Yes, continuous partial stream; mic, file, or 16 kHz PCM via `fromPfd()` [F] | Not published | Alpha, "not subject to any SLA or deprecation policy" [F] |
| sherpa-onnx `nemotron-3.5-asr-streaming-0.6b-{80,160,560,1120}ms-int8-2026-06-11` | encoder 627 MB + decoder 14 MB + joiner 9.1 MB (560 ms build) [F] | ko-KR in the "ready" tier; FLEURS CER ~7.1-7.6 [V] | True streaming, 80-1120 ms chunks [F] | English sibling: RTF 0.16 on 1 thread (hardware not named) [F]. No Android APK listed for the multilingual build [F] | OpenMDW-1.1 [F] |
| sherpa-onnx Korean streaming zipformer (`kangkyu/...-174m`, or k2-fsa `...-korean-2024-06-16`) | ~160 MB int8 (kangkyu) | 7.53% CER claimed (prior doc). k2-fsa model converted from a KsponSpeech recipe [F] | Yes | Already integrated in the spike | Weights Apache-2.0; training-data terms in Q2 |
| sherpa-onnx `qwen3-asr-0.6B-int8-2026-03-25` | conv 42 MB + encoder 174 MB + decoder 721 MB ≈ 937 MB [F] | FLEURS-ko 3.72 [V] | Offline in sherpa (streaming not documented) [F] | Galaxy S10 (Exynos 9820), ONNX Runtime INT8: RTF 0.53 for a 30 s clip [P] | Apache-2.0 [F] |
| SenseVoice-Small (sherpa-onnx) | ~240 MB, 234M params [P] | FLEURS-ko CER 6.4 (HiKE) [P] | Offline | Galaxy S10: RTF 0.06 [P]; "70 ms for 10 s audio" [V] | FunASR Model Licence v1.1: use, copy, modify and share allowed, attribution and model-name retention required; commercial use **not expressly addressed**; auto-updating terms; no-denigration clause [F] |
| Moonshine v2 streaming (English) | Tiny 34M / Small 123M / Medium 245M [P] | n/a | Yes | WER 12.00 / 7.84 / 6.65 [P via README]; Pi 5 latency 237 / 527 / 802 ms [P] | MIT for all streaming models [F] |
| Parakeet-TDT-0.6B-v3 (sherpa-onnx, English/European) | ~671 MB [P] | No | Offline | Galaxy S10 RTF 0.09 [P] | CC-BY-4.0 [F] |

**Front-ends and VAD**

| Component | Fact | Licence |
|---|---|---|
| Silero VAD | ~2 MB; under 1 ms per 30 ms chunk on one CPU thread; 8/16 kHz [F] | MIT ("Copyright (c) 2020-present Silero Team") [F] |
| TEN VAD | 10/16 ms hop at 16 kHz; Android library 373-532 KB; claims better precision/recall than Silero and WebRTC VAD, and faster speech-to-silence transitions [V] | Apache-2.0 "with additional conditions" [F] |
| Speech enhancement (DeepFilterNet, MetricGAN+, FRCRN, SAM-Audio) | Mostly neutral to harmful for modern ASR WER (Q4) [P] | Varies |

### Inferences
- [E] Proposed server bake-off set:
  - Korean/mixed: Qwen3-ASR-1.7B, Cohere Transcribe, Whisper large-v3 (and turbo) via faster-whisper with Silero VAD.
  - Streaming or very high concurrency: Nemotron 3.5 streaming.
  - English-only: Parakeet-TDT-0.6B-v2/v3, which is the fastest and most noise-robust published option.
  - All of these fit on one 4090 at once if loaded one or two at a time.
- [E] Proposed on-device bake-off set: platform SODA, ML Kit GenAI (basic, and advanced if the S25 qualifies), sherpa Nemotron 3.5 streaming int8, sherpa Korean zipformer (dev only until the data question is closed), Qwen3-ASR-0.6B int8 for a non-streaming "second pass on endpoint".
- [H] The 100 MB per-model cap decided for Voice Life Companion (technical-decisions 4.5) is a constraint from that product. If it is applied here, it excludes Nemotron, Qwen3-ASR and SenseVoice on device. The user should confirm whether the cap carries over to the logging app.

### Gaps
- No primary-source Korean CER for Cohere Transcribe (figure only), Fun-ASR-MLT-Nano, or Meta Omnilingual ASR.
- No measured RTF, memory or battery for Nemotron 3.5 multilingual or Qwen3-ASR on a Snapdragon 8 Elite phone.

---

## Q1. Server-side models: Korean CER, English WER, noise robustness, single-4090 throughput

### Takeaway
For Korean, the best published open numbers are from Qwen3-ASR-1.7B (vendor) and Whisper-Large (third party), both around 2.5-3.5% CER on FLEURS-ko. Streaming models (Nemotron, Voxtral Realtime) lose several points on Korean. No vendor publishes Korean results in noise. The only noise numbers are English (MUSAN) and Mandarin (ExtremeNoise). All shortlisted models fit a 24 GB 4090. Throughput is far beyond a logging app's needs, so pick by accuracy, not speed.

### Cited Findings
- **Qwen3-ASR family** [F, V]:
  - Release, sizes and languages: two ASR models (1.7B, 0.6B) plus Qwen3-ForcedAligner-0.6B; 52 languages and dialects; tech report arXiv 2601.21337, submitted 2026-01-29 — [arXiv](https://arxiv.org/abs/2601.21337).
  - Interface: unified streaming and offline in one model. Streaming works only on the vLLM backend, with no batching and no timestamps there — [HF card](https://huggingface.co/Qwen/Qwen3-ASR-1.7B).
  - Korean per-language numbers, Tables A.2a/b [V]: FLEURS-ko 3.72 (0.6B), 2.57 (1.7B), 2.07 (API Flash-1208); CommonVoice-ko 8.48 / 5.88 / 3.82; MLC-SLM-ko 10.31 / 8.61 / 8.09 — [arXiv HTML](https://arxiv.org/html/2601.21337v1).
  - Streaming vs offline (average of LibriSpeech, FLEURS-en, FLEURS-zh) [V]: 1.7B 2.69 → 3.33; 0.6B 3.48 → 4.40 — [arXiv HTML](https://arxiv.org/html/2601.21337v1).
  - Relative to Whisper-large-v3 [V]: Qwen3-ASR-1.7B beats it on MLS, Common Voice and MLC-SLM, but falls behind it on the full 30-language FLEURS set — [arXiv HTML](https://arxiv.org/html/2601.21337v1).
  - Forced aligner [V]: covers Korean, 37.2 ms average alignment shift on Korean — [HF card](https://huggingface.co/Qwen/Qwen3-ASR-1.7B).
- **Cohere Transcribe (cohere-transcribe-03-2026)**, 2026-03-26 [V]:
  - 2B encoder-decoder (Fast-Conformer encoder) with 14 languages including Korean; Apache-2.0.
  - Expects a language tag (no automatic language ID) and monolingual audio. Code-switched audio "sometimes works but was not explicitly trained".
  - Noise augmentation at 0-30 dB SNR. Transcribes non-speech sounds, so a VAD or noise gate is recommended.
  - vLLM support merged.
  - Source: [HF blog](https://huggingface.co/blog/CohereLabs/cohere-transcribe-03-2026-release).
  - Download is gated (request access) [P] — [search summary of HF mirror](https://dell.huggingface.co/models/CohereLabs/cohere-transcribe-03-2026).
  - No timestamps per one Reddit user [A] — [Reddit snapshot](https://reddit.sentinel-team.org/posts/1s48jtu/snapshots/2026-03-27T22%3A19%3A49.793866Z).
- **NVIDIA Nemotron 3.5 ASR Streaming 0.6B**, HF release 2026-06-04 [F, V]:
  - Licence and fit: OpenMDW-1.1, "ready for commercial use". 40 locales, ko-KR "transcription-ready".
  - Architecture: 24-layer cache-aware FastConformer + RNNT with language-ID prompt; native punctuation.
  - Interface: chunks of 80/160/320/560/1120 ms. Runtimes: NeMo 26.06, Transformers ≥5.13, and NeMo-Speech.cpp (GGUF).
  - Korean FLEURS CER: 7.59 / 7.70 / 7.27 / 7.18 / 7.12 (80 ms → 1.12 s). English: 9.43 → 7.91.
  - The card warns that its normalization may inflate error rates.
  - H100 concurrency: about 240 streams at 80 ms and 2,400 at 1.12 s.
  - Source: [HF card](https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b).
- **Licence conflict on Nemotron 3.5 ports**: a LiteRT INT8 community port says "NVIDIA Open Model License" [P] — [soniqo port](https://huggingface.co/soniqo/Nemotron-3.5-ASR-Streaming-Multilingual-0.6B-LiteRT-INT8). The primary card says OpenMDW-1.1 [F], so use the primary card.
- **OpenMDW-1.1**: Linux Foundation licence released 2026-05-28. Termination now covers copyright as well as patent assertions, and the NOTICE / statement-of-changes requirements are dropped. Submitted to OSI in August 2026 (outcome not found). Adopted by NVIDIA for Nemotron in June 2026 [P] — [OSI license-review list](https://lists.opensource.org/pipermail/license-review_lists.opensource.org/2026-August/006125.html), [BetaNews](https://betanews.com/article/linux-foundation-openmdw-osi-license/).
- **Voxtral (Mistral)**, Feb 2026 [F, V]:
  - Voxtral Realtime is open-weight Apache-2.0. Voxtral Mini Transcribe V2 (batch, diarization, context biasing up to 100 words) is **API only**, so it is not usable here. Both support 13 languages including Korean.
  - The vendor claims Mini Transcribe V2 "maintains accuracy" on factory floors, with no numbers [V].
  - Source: [Mistral news](https://mistral.ai/news/voxtral-transcribe-2).
  - Realtime Korean FLEURS: 12.29 offline, 17.56 at 240 ms, 15.74 at 480 ms, 14.30 at 2.4 s. Korean is the second-worst language after Arabic at every delay. Runs in BF16 on a ≥16 GB GPU. ExecuTorch port marked untested — [HF card](https://huggingface.co/mistralai/Voxtral-Mini-4B-Realtime-2602).
- **Parakeet-TDT-0.6B-v3** [F/V]:
  - CC-BY-4.0, "ready for commercial/non-commercial use", 25 European languages, no Korean.
  - Open ASR avg 6.34 / LibriSpeech 1.93 / 3.59.
  - MUSAN noise: clean 6.34, SNR 10 → 7.12, SNR 5 → 8.23, SNR 0 → 11.66, SNR -5 → 19.88.
  - RTFx 3,332.74.
  - Source: [HF card](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3).
- **Canary-1B-v2 vs Parakeet-v3 on LibriSpeech-clean + MUSAN (NVIDIA report)** [V via search summary]: Parakeet about 2.6% at 5 dB, 4.8% at 0 dB, 12.2% at -5 dB; Canary about 2.8%, 5.1% and 19.4% — [arXiv 2509.14128](https://arxiv.org/pdf/2509.14128).
- **Open ASR Leaderboard** [F]:
  - Paper v4 dated 2026-03-30: 86 systems, 12 datasets, three tracks (English short-form, English long-form, multilingual short-form).
  - Findings: Conformer encoders with transformer decoders have the best average WER; CTC/TDT decoders have the best RTFx.
  - Source: [arXiv 2510.06961](https://arxiv.org/abs/2510.06961).
- The multilingual track evaluates only de, fr, it, es and pt, so **Korean is not on the leaderboard** [P] — [search summary of paper](https://arxiv.org/html/2510.06961v3).
- The live Space did not render for the fetch tool [F: fetch failed] — [Space](https://huggingface.co/spaces/hf-audio/open_asr_leaderboard).
- **Current English #1**: Cohere Transcribe at 5.42 (March 2026) [V] — [HF blog](https://huggingface.co/blog/CohereLabs/cohere-transcribe-03-2026-release).
- **Meta Omnilingual ASR** (Nov 2025) [V/P]:
  - Apache-2.0 models (300M-7B, CTC and LLM-ASR variants); corpus CC-BY-4.0.
  - CER <10 for 78% of 1,600+ languages. No Korean figure found.
  - Source: [Meta blog](https://ai.meta.com/blog/omnilingual-asr-advancing-automatic-speech-recognition/), [HF README](https://huggingface.co/facebook/omniASR-LLM-7B/blob/main/README.md).
  - The 300M model failed an English check in a phone benchmark [P] — [VoicePing benchmark](https://voiceping-landingpage-prod.pages.dev/en/blog/research-offline-speech-transcription-benchmark/).
- **Fun-ASR**:
  - Fun-ASR-Nano-2512 (800M) covers zh/en/ja only. Korean is in the sibling Fun-ASR-MLT-Nano-2512 (31 languages) [P] — [GitHub release](https://github.com/FunAudioLLM/Fun-ASR/releases/tag/v1.0.0).
  - Fun-ASR-MLT-Nano scores 36.55 on Mandarin ExtremeNoise [V] — [Qwen3-ASR report](https://arxiv.org/html/2601.21337v1).
  - Licence: FunASR Model Open Source License v1.1 [P via GGUF card] — [GGUF card](https://huggingface.co/handy-computer/Fun-ASR-MLT-Nano-2512-gguf).
- **faster-whisper benchmark** (RTX 3070 Ti 8 GB, 13 min audio, large-v2) [F]:
  - fp16 beam 5: 1m03s, 4.5 GB.
  - Batch 8 fp16: 17 s, 6.1 GB.
  - int8 batch 8: 16 s, 4.5 GB.
  - Licence MIT. Silero VAD filter is on by default for batched mode.
  - Source: [GitHub](https://github.com/SYSTRAN/faster-whisper).
- **4090-specific Whisper numbers** are vendor marketing only [P]: turbo about 80x real time single-stream and about 175x at batch 16 — [gigagpu](https://gigagpu.com/rtx-4090-24gb-whisper-benchmark/).
- **WhisperX** [F]: BSD-2-Clause; "70x realtime with large-v2" batched; under 8 GB VRAM; VAD preprocessing reduces hallucination; diarization via pyannote community-1; wav2vec2 alignment models for en/fr/de/es/it by default (Korean not listed) — [GitHub](https://github.com/m-bain/whisperX).
- **Speech Robust Bench (ICLR 2025)** [P]: Whisper was the most robust on average across 114 perturbations and beat Canary on average; both were highly robust to non-adversarial noise — [arXiv 2403.07937](https://arxiv.org/html/2403.07937v3).

### Inferences
- [E] VRAM on a 4090:
  - Qwen3-ASR-1.7B in BF16: about 4-6 GB plus KV cache.
  - Whisper large-v3 int8 or fp16: 3-6 GB.
  - Nemotron 3.5: about 2-3 GB.
  - Voxtral Realtime BF16: about 9-10 GB (the vendor says it fits in 16 GB).
  - Two ASR models plus a 4-bit LLM can therefore share the card only if the LLM is 14B or smaller, or quantized hard (see Q8).
- [E] Throughput is not the constraint. At about 1/3 of an H100's ASR throughput, a 4090 still processes 100 hours of daily speech in well under an hour of GPU time with any shortlisted model:
  - faster-whisper reaches about 46x real time even on a 3070 Ti.
  - Qwen3-ASR claims 1,219-2,000 s of audio per second at concurrency 128.
- [H] For re-transcription after sync, accuracy-first, non-streaming models (Qwen3-ASR-1.7B, Cohere, Whisper large-v3) should beat any streaming model on Korean by 3-5 CER points. Compare Nemotron's 7.1 vs Qwen3's 2.57 on FLEURS-ko, with the caveat on normalization differences below.
- [H] Metric caveat: FLEURS-ko numbers are not directly comparable across vendors. Qwen3 and HiKE give CER. Voxtral's table is unlabelled (12.29 may be WER). Nemotron warns its normalization inflates errors. Run one in-house normalized CER on our own data.

### Gaps
- No vendor publishes **Korean** WER/CER in noise. No noisy Korean benchmark was found for Qwen3-ASR, Cohere, Nemotron or Voxtral.
- The Qwen3-ASR RTF table's GPU type was not captured.
- No independent 4090 benchmark for Qwen3-ASR, Cohere or Nemotron.
- The Canary-Qwen-2.5B and Canary-1B-v2 licences were not rechecked on their primary cards in this pass.
- The current live Open ASR Leaderboard ranking (November 2026) could not be read.

---

## Q2. Korean specifically: best open models, fine-tunes, data licences, code-switching

### Takeaway
On FLEURS-ko, the best published open results are Qwen3-ASR-1.7B (2.57 [V]) and Whisper-Large (CER 3.2 [P]). SenseVoice-Small (6.4) and streaming models (Nemotron about 7.2, zipformer about 7.5 claimed) trail.

Korean-English code-switching is a real weakness. On the HiKE benchmark, Whisper-Large has 26.1% MER versus 21.8% for GPT-4o-transcribe. Fine-tuning on natural code-switched data cut Whisper-Medium from 31.3 to 9.0 MER.

The AI Hub general policy allows "영리적·비영리적 연구·개발" (for-profit and non-profit R&D) with conditions. That is better than the prior "maybe non-commercial" note, but deploying a model trained on AI Hub data is not explicitly addressed.

### Cited Findings
- **HiKE Korean-English code-switching benchmark** (arXiv 2509.24613; Findings of EACL 2026) [F/P]:
  - Overall MER and monolingual FLEURS (KOR CER / ENG WER):

    | Model | Overall MER | KOR CER | ENG WER |
    |---|---|---|---|
    | GPT-4o-transcribe | 21.8 | 2.5 | 3.3 |
    | Whisper-Large | 26.1 | 3.2 | 4.4 |
    | Whisper-Medium | 31.3 | 3.4 | 4.6 |
    | SenseVoice-Small | 32.5 | 6.4 | 7.6 |
    | Whisper-Small | 43.5 | 4.5 | 8.3 |
    | Gemma-3n | 76.6 | 10.7 | 13.0 |
    | Seamless-M4T-v2 | 83.6 | 6.4 | 6.3 |

  - Fine-tuning Whisper-Medium on natural intra-sentential code-switching cut MER from 31.3 to 9.0 but raised Korean CER from 3.4 to 6.0. Synthetic code-switching alone reached 22.1.
  - Evaluation code Apache-2.0; dataset licence not stated.
  - Source: [arXiv HTML](https://arxiv.org/html/2509.24613v4).
- **Nemotron 3.5 auto mode** emits a language tag after terminal punctuation (strippable) and switches language without a fixed setting. Korean CER is 7.30-8.31 in auto mode vs 7.12-7.59 with a fixed language [V] — [HF card](https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b).
- **Cohere Transcribe** was not trained on code-switched audio [V] — [HF blog](https://huggingface.co/blog/CohereLabs/cohere-transcribe-03-2026-release).
- **Korean fine-tunes** (all self-reported on model cards) [P]:
  - `ghost613/whisper-large-v3-turbo-korean`: Zeroth-trained; Zeroth test CER 7.58% → 2.06% (WER 4.89%); "not fully converged" — [HF](https://huggingface.co/ghost613/whisper-large-v3-turbo-korean).
  - `batiai/batisay-ko-base`: KsponSpeech 1,000 h + Zeroth 50 h; 8.68% CER on a 3,000-sample KsponSpeech eval_clean subset vs 17.03% for raw Whisper large-v3; Apache-2.0 — [HF](https://huggingface.co/batiai/batisay-ko-base).
  - `imTak/whisper_large_v3_turbo_Korean2`: Zeroth + Common Voice 17; Zeroth WER ~5.27% — [HF](https://huggingface.co/imTak/whisper_large_v3_turbo_Korean2/blob/main/README.md?code=true).
  - `lee1jun/kanary-v2-1b-ko-34800`: a Korean-only Canary-1B-v2 fine-tune; licence not checked — [HF](https://huggingface.co/lee1jun/kanary-v2-1b-ko-34800).
  - `TLSJ/whisper-wesol-ko`: trained with synthetic construction-site noise. The card says robustness on real sites is not guaranteed and that Whisper models may invent or repeat text in heavy noise — [Friendli listing](https://friendli.ai/models/TLSJ/whisper-wesol-ko).
- **k2-fsa `sherpa-onnx-streaming-zipformer-korean-2024-06-16`** is converted from `johnBamma/icefall-asr-ksponspeech-pruned-transducer-stateless7-streaming-2024-06-12` (zipformer v1, icefall PR 1651), so it is KsponSpeech-derived [F] — [HF](https://huggingface.co/k2-fsa/sherpa-onnx-streaming-zipformer-korean-2024-06-16).
- **Zeroth-Korean** [F]: 51.6 h train (105 speakers) plus 1.2 h test (10 speakers), **CC BY 4.0** — [OpenSLR 40](https://www.openslr.org/40/).
- **AI Hub general data policy** (read 2026-11-05) [F] — [AI Hub usage policy](https://www.aihub.or.kr/intrcn/guid/usagepolicy.do):
  - Permitted use: "지능형 제품・서비스, 챗봇 등 다양한 분야에서 영리적・비영리적 연구・개발 목적으로 활용할 수 있습니다" (may be used for for-profit and non-profit R&D in fields such as intelligent products, services and chatbots).
  - Data use is limited to "인공지능 학습모델의 학습용으로만" (only for training AI models).
  - Selling the dataset requires separate agreement.
  - Overseas entities and overseas transfer (국외 반출) need separate agreement with the performing institution and NIA.
  - Users must credit NIA ("한국지능정보사회진흥원의 사업결과임을 밝혀야"), including in derivative works.
  - Some datasets are stricter (non-commercial or research-only, e.g. KETI datasets and competition datasets), so each dataset page must be checked.
  - The page does not address commercial deployment of trained models.
- **KsponSpeech** is described as governed by AI Hub terms. An ETRI paper page carries a CC BY notice, and HF dataset cards leave the licence empty, so the sources conflict [P] — [HF dataset card](https://huggingface.co/datasets/Murple/ksponspeech/blob/main/README.md), [ETRI KSP](https://ksp.etri.re.kr/ksp/article/read?id=62525).
- **Meta Omnilingual ASR** has a per-language CER CSV in its GitHub repo; the Korean value was not retrieved [P] — [GitHub mirror summary](https://github.com/chrisciokler/ai-meta-omnilingual-asr).

### Inferences
- [H] Licence path for Korean fine-tuning that is cleanest commercially:
  - Start from Apache-2.0 or MIT bases (Qwen3-ASR, Whisper, Cohere).
  - Fine-tune on our own field recordings, Zeroth (CC BY 4.0) and synthetic noise.
  - Treat KsponSpeech/AI Hub-trained weights (kangkyu zipformer, batisay) as usable only by a Korean entity, with NIA attribution, after checking the specific dataset page's terms. Get written confirmation from AI Hub on deploying trained models, especially if the product will be used or hosted abroad.
- [H] Code-switching (Korean speech with English part numbers and equipment names) is the most likely accuracy gap for industrial logging. Three mitigations:
  - Context biasing with the site vocabulary (Q6).
  - A small natural code-switching fine-tune set from our own users.
  - LLM post-correction on the server against an equipment dictionary (Q8).
- [E] Korean on-device streaming will likely land at 7-10% CER clean and much worse in noise. Server re-transcription with Qwen3-ASR or Whisper-class models should reach about 3% clean.

### Gaps
- No independent head-to-head of Qwen3-ASR vs Whisper vs Cohere on KsponSpeech or Zeroth.
- No Common Voice-ko numbers except Qwen3's.
- Not checked: the Korean CER values in Cohere's figure, and the licences of the ghost613, imTak and kanary fine-tunes.
- KsponSpeech's own AI Hub dataset page (dataset-specific terms) was not opened.
- Unknown how Qwen3-ASR and Whisper spell English loanwords in Korean output (Hangul transliteration vs Latin).

---

## Q3. On-device Android options: real-time factor, memory, battery, Korean, streaming, licence

### Takeaway
On the phone, the zero-size options (platform SODA, ML Kit GenAI) are the cheapest. SODA already worked in Korean on the S25. Among app-bundled models, the most important new option is the Nemotron 3.5 multilingual streaming model in sherpa-onnx: Korean and English in one true-streaming model under a commercial licence, at about 650 MB int8.

Qwen3-ASR-0.6B int8 (about 937 MB) is more accurate but non-streaming and slow on older phones (RTF 0.53 on an S10). whisper.cpp is not competitive for streaming on Android.

ML Kit GenAI's Advanced mode now lists the SM8750 chipset (Snapdragon 8 Elite), so the prior "S25 cannot use Advanced mode" note may be stale.

### Cited Findings
- **ML Kit GenAI Speech Recognition** [F] — [docs](https://developers.google.com/ml-kit/genai/speech-recognition/android):
  - Version `com.google.mlkit:genai-speech-recognition:1.0.0-alpha2`, alpha with no SLA.
  - Basic mode runs on API 31+ with ko-KR in **beta**.
  - Advanced mode supports Pixel 10/11 and Gemini Nano devices on Qualcomm **SM8750**, SM8845, SM8850, SM8950, SM8975; MediaTek MT6991/6993/6995; and Exynos 2600. Its ko-KR is **not** beta.
  - Not supported on unlocked bootloaders. Inputs: mic, file, or raw 16 kHz mono 16-bit PCM via `fromPfd()`.
- **Conflicting snapshot**: other page versions say Advanced mode is "supported by Pixel 10 devices" only, and list the Galaxy S25 only under the Prompt API [P] — [overview snapshot](https://developers.google.com/ml-kit/genai?authuser=9).
- **Phone benchmark** (VoicePing, updated 2026-09-21): Galaxy S10 (Exynos 9820, 8 GB, Android 12), 30 s English clip. Accuracy was not measured; only a keyword check. Quantization mostly not stated [P] — [VoicePing benchmark](https://voiceping-landingpage-prod.pages.dev/en/blog/research-offline-speech-transcription-benchmark/).

  | Engine | Size | RTF on S10 |
  |---|---|---|
  | Moonshine Tiny (sherpa) | ~125 MB | 0.05 |
  | SenseVoice Small (sherpa) | ~240 MB | 0.06 |
  | Whisper Tiny (sherpa) | — | 0.07 |
  | Parakeet TDT 0.6B v3 (sherpa) | ~671 MB | 0.09 |
  | Android SpeechRecognizer offline | built-in | 0.12 |
  | Zipformer streaming 20M | ~73 MB | 0.12 |
  | Whisper Small (sherpa) | — | 0.41 |
  | Qwen3-ASR 0.6B, ONNX Runtime INT8 | ~1.9 GB | 0.53 |
  | Whisper Turbo (sherpa) | ~1.0 GB | 0.60 |
  | whisper.cpp Tiny | — | 3.52 |
  | Qwen3-ASR 0.6B, pure C | — | 11.28 |

- **sherpa-onnx Nemotron** [F] — [docs](https://k2-fsa.github.io/sherpa/onnx/nemo/nemotron-streaming.html):
  - English package `nemotron-speech-streaming-en-0.6b-*-int8-2026-04-25`: encoder 623 MB, RTF 0.16 on 1 thread; an arm64 APK exists.
  - Multilingual `nemotron-3.5-asr-streaming-0.6b-*-int8-2026-06-11`: encoder 627 MB, decoder 14 MB, joiner 9.1 MB; ko-KR included; language set by code or `auto`.
  - No APK listed for the multilingual build.
- **sherpa-onnx changelog**: "Add multilingual Nemotron-3.5 streaming ASR support (#3671)" [P] — [pub.dev changelog](https://pub.dev/packages/sherpa_onnx_linux/changelog). Feature request [F] — [issue #3664](https://github.com/k2-fsa/sherpa-onnx/issues/3664).
- **LiteRT port** of Nemotron 3.5: 687 MB, CPU INT8 weights, optional delegates, Android SDK `speech-android`; no device benchmarks [P] — [soniqo](https://huggingface.co/soniqo/Nemotron-3.5-ASR-Streaming-Multilingual-0.6B-LiteRT-INT8).
- **sherpa-onnx Qwen3-ASR** [F] — [export page](https://k2-fsa.github.io/sherpa/onnx/qwen3-asr/export.html):
  - Package `sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25`: conv_frontend 42 MB, encoder.int8 174 MB, decoder.int8 721 MB.
  - The page does not document streaming, hotwords or Android.
  - A LiteRT INT8 Qwen3-ASR-0.6B encoder is 180.5 MB, with the decoder run separately via LiteRT-LM [P] — [HF](https://huggingface.co/soniqo/Qwen3-ASR-0.6B-Encoder-LiteRT-INT8).
- **Moonshine licence (updates the prior doc)** [F] — [LICENSE](https://raw.githubusercontent.com/moonshine-ai/moonshine/main/LICENSE):
  - All streaming models and all English models are MIT.
  - Only the legacy non-streaming non-English models stay under the Moonshine Community License. That covers Korean Base and Tiny, plus Arabic, Japanese, Mandarin, Spanish Base, Ukrainian and Vietnamese.
  - Community License terms: free for research and non-commercial use. Commercial use is allowed under Section III **after registering** with Moonshine AI, and terminates above **US$1M annual revenue**. Requires a "Powered by Moonshine AI" notice and bans use to build foundation models.
  - The README itself still calls it "the non-commercial Moonshine Community License" [F] — [README](https://github.com/moonshine-ai/moonshine).
  - No Korean streaming Moonshine model was found [P] — [search summary](https://huggingface.co/moonshine-ai/moonshine-tiny-ko).
- **Moonshine Korean accuracy**: the GGUF port of base-ko reports 8.00% FLEURS-ko CER; tiny-ko reports 8.9 [P] — [base-ko GGUF](https://huggingface.co/handy-computer/moonshine-base-ko-gguf), [tiny-ko GGUF](https://huggingface.co/handy-computer/moonshine-tiny-ko-gguf).
- **Qualcomm AI Hub** Whisper-large-v3-turbo profiling on Galaxy S26 (8 Elite Gen 5) [V]:
  - Quantized encoder: about 1.13-1.16 s per 30 s window.
  - Decoder: about 6.1-6.3 ms per step.
  - Sources: [AI Hub job](https://aihub.qualcomm.com/jobs/jgl0qrv2g), [AI Hub job](https://aihub.qualcomm.com/jobs/jgj0old8p).
  - Whisper-Base-En encoder on 8 Elite QRD: 140 ms (TFLite GPU) [V] — [HF](https://huggingface.co/qualcomm/Whisper-Base-En/blob/main/README.md).
- **whisper.cpp on Android**: one Reddit user reports quantized tiny was still about 5x slower than real time in a streaming loop on CPU [A] — [Reddit snapshot](https://reddit.sentinel-team.org/posts/1po663c/snapshots/2025-12-16T19%3A11%3A19.845159Z).
- **Voxtral Realtime ExecuTorch** port: listed by Mistral as community and **untested** [F] — [HF card](https://huggingface.co/mistralai/Voxtral-Mini-4B-Realtime-2602).
- **Platform SODA on S25 (internal)**:
  - First S25 run: platform language detection worked and finals switched ko/en.
  - `EXTRA_SEGMENTED_SESSION` was not honoured, so a restart loop is used.
  - Background and screen-off behaviour are untested.
  - Source: [SPIKE.md](../../../../apps/mobile/SPIKE.md) (internal, 2026-11-03).

### Inferences
- [E] The Galaxy S25 (Snapdragon 8 Elite for Galaxy, Oryon cores) is several times faster per core than the Exynos 9820 in the S10. Expect:
  - Nemotron 3.5 int8 at 160-560 ms chunks: RTF about 0.05-0.15 on 1-2 threads.
  - Qwen3-ASR-0.6B int8 on 5-15 s endpointed segments: RTF about 0.1-0.25.
  - Both need measurement. Memory: about 0.8-1.2 GB RSS for Nemotron and 1.2-1.8 GB for Qwen3-ASR [E].
- [H] Hybrid on device:
  - Stream Nemotron (or SODA) for live partials.
  - On endpoint, optionally re-decode the segment with Qwen3-ASR-0.6B when the device is plugged in or idle.
  - Do the authoritative re-transcription on the server after sync.
- [H] Android 17's on-device `SpeechRecognizer` has no hotword API and may stop under screen-off or background restrictions. The SPIKE fallback design (switching to sherpa) stays necessary.
- [H] ML Kit GenAI Advanced mode may now work on the S25 because SM8750 is listed. Call `checkFeatureStatus` at runtime before relying on it. This replaces the "Advanced needs S26" line in technical-decisions 1.1.

### Gaps
- No published battery-drain figures for any on-device ASR engine on Android.
- No S25 or 8 Elite RTF for sherpa-onnx models.
- No Korean CER for ML Kit GenAI basic or advanced mode or for SODA.
- Licence of Qualcomm AI Hub Whisper exports not checked.
- LiteRT/TFLite Whisper and Moonshine Android ports not examined.

---

## Q4. Noise robustness: enhancement front-ends vs noise-trained models; WER at 0-10 dB; subway noise

### Takeaway
Modern ASR models (Whisper, Parakeet, Qwen3-ASR) are usually hurt, not helped, by a generic single-channel speech-enhancement front-end:
- In a December 2025 study, MetricGAN+ made results worse in all 40 model and noise configurations.
- At 10 dB, Whisper's semantic WER rose from 8.82% to 25.83% after enhancement.
- In July 2026 work, only weak (partial) magnitude correction helped Whisper.

Noise-robust training and fine-tuning on matched noise is the more reliable lever. Multi-microphone and close-talk capture (Q7) gives far more than any post-hoc denoiser.

Parakeet-v3 degrades from 6.3% WER clean to 7.1% at 10 dB, 8.2% at 5 dB and 11.7% at 0 dB on MUSAN. Seoul and Korean subway cars run at about 72-79 dBA LAeq.

### Cited Findings
- **"When De-noising Hurts"** (arXiv 2512.17562, 2025-12-19) [F/P]:
  - Setup: MetricGAN-plus-voicebank in front of Whisper, Parakeet, Gemini Flash 2.0 and Parrotlet-a; 500 medical recordings.
  - Result: enhanced audio had higher semWER in all 40 configurations, with absolute increases of 1.1-46.6 points.
  - At 10 dB, Whisper went from 8.82% to 25.83% [P via search summary].
  - Sources: [arXiv](https://arxiv.org/abs/2512.17562), [papers.cool](https://papers.cool/arxiv/2512.17562).
- **"Where Speech Enhancement Hurts Recognition"** (arXiv 2607.11157, v2 2026-09-28) [F]:
  - Method: FRCRN on VoiceBank+DEMAND, with SE and ASR frozen and the mask's magnitude and phase scaled separately at inference time.
  - Whisper WER 6.44 → 5.57 at weak magnitude correction (α=0.25), back to 6.46 at full correction (α=1).
  - wav2vec2.0 improved 17.13 → 10.20.
  - Phase correction was "not a stable ASR lever".
  - Source: [arXiv](https://arxiv.org/abs/2607.11157).
- **SAM-Audio before Whisper** (arXiv 2603.04710) [P]: cleaner-sounding output but higher WER/CER than the raw noisy input — [arXiv](https://arxiv.org/abs/2603.04710).
- **Bridge-module paper** (arXiv 2406.12699) [P]: CMGAN/DEMUCS plus Whisper lowered average WER, mostly for small Whisper models, so enhancement can help weak recognizers — [arXiv](https://arxiv.org/pdf/2406.12699).
- **Noise-augmented fine-tuning vs an enhancement module** (singing/lyrics domain) [P]:
  - Whisper-medium fine-tuned on -5 to 5 dB noisy data reached 18.05% WER vs 63.45% for an enhancement-module baseline.
  - Fine-tuning on clean data alone was worse than with noise.
  - Source: [lyric transcription PDF](https://kwangaji.github.io/assets/pdf/lyric_transcription.pdf).
- **Korean noise evidence** (2024 Korean military-noise study) [P]:
  - Whisper's average CER under battlefield noise was 72.4%: robust to low-intensity noise, failing at high intensity — [earticle](https://m.earticle.net/Article/A452775).
  - A Korean defence voice-command study reports a 6.17% CER reduction from denoising before Whisper [P] — [koreascience](https://koreascience.kr/article/JAKO202422243264597.pdf).
  - These conflict with the general literature above. Results depend on the denoiser and noise type.
- **Built-in noise robustness of new models** [V]:
  - Qwen3-ASR ExtremeNoise (Mandarin): 16.17 (1.7B) vs Whisper-large-v3 63.17 vs GPT-4o-Transcribe 36.11 vs Gemini-2.5-Pro 29.06 — [arXiv HTML](https://arxiv.org/html/2601.21337v1).
  - Cohere Transcribe trained at 0-30 dB SNR — [HF blog](https://huggingface.co/blog/CohereLabs/cohere-transcribe-03-2026-release).
- **WER vs SNR (MUSAN)** for Parakeet-TDT-0.6B-v3, Open ASR average [V]: 6.34 clean → 7.12 @10 dB → 8.23 @5 dB → 11.66 @0 dB → 19.88 @-5 dB — [HF card](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3).
- **Whisper** degrades sharply below 0 dB [P] — [arXiv 2312.13873](https://arxiv.org/pdf/2312.13873). It is especially weak to babble and side-talk compared with other noise types [P] — [search summary](https://arxiv.org/pdf/2601.18396).
- **CHiME-7/8 DASR review** (arXiv 2507.18161) [P]:
  - The best systems (STCON, NTT) beat even an oracle-diarization GSS + Whisper-large-v3 system.
  - Adding NOTSOFAR-1 (many speakers, short meetings) made the task much harder.
  - Source: [arXiv](https://arxiv.org/pdf/2507.18161).
- **Subway noise** [P]:
  - Korean subway interiors measured 72.0-79.1 dBA LAeq (Japanese 71.8-83.2, Chinese 73.1-79.9) — [Hanyang ScholarWorks](https://scholarworks.bwise.kr/hanyang/handle/2021.sw.hanyang/161903).
  - 15 Seoul-area lines at peak hours averaged 72.8 dB, line averages 62.5-78.3 dB (2017) — [PMC5516701](https://pmc.ncbi.nlm.nih.gov/articles/PMC5516701).
  - Older Seoul data: 88 dB average, 109.2 dB peak (pre-2000, short samples).
  - Strong low-frequency content (around 8 Hz and 20-80 Hz) [P].
- **Speech levels at 1 m** [P]:
  - Normal about 58-60 dB, raised 64, loud 70, shout 76 (ESTA table, traced to ANSI S3.5) — [ESTA](https://protocol.esta.org/fall-2019/page-25).
  - Higher values at 0.3 m (70/76/82/88) and -6 dB per doubling of distance — [Engineering ToolBox](https://engineeringtoolbox.com/voice-level-d_938.html).
  - The Lombard effect starts around 45 dB ambient — [Rindel & Christensen](https://www.odeon.dk/pdf/C118-IN12_Paper%20209_Rindel_Christensen.pdf).

### Inferences
- [E] Subway SNR at the microphone (A-weighted, broadband; ambient about 75 dBA):
  - Phone held at about 30 cm, speaking raised or loud (Lombard, about 76-82 dB at 0.3 m): SNR about 0 to +7 dB.
  - Phone in a pocket or on a chest-mounted bodycam: speech is muffled and SNR drops to about -5 to +3 dB.
  - Earbud mic (about 10-12 cm from the mouth, about +8 dB vs 30 cm, plus 2-mic beamforming): about +8 to +15 dB.
  - Close-talk boom mic at 2-3 cm (about +20 dB vs 30 cm): about +20 to +25 dB.
- [E] Factory or site at 85-100 dBA, shouting:
  - Phone at 30 cm: about -15 to 0 dB, where every published model is badly degraded (Parakeet already 19.9% WER at -5 dB on MUSAN).
  - Close-talk noise-cancelling boom: about +5 to +15 dB, the usable range.
  - Much of subway noise is below 100 Hz, so a high-pass filter at about 80-100 Hz is a cheap, safe pre-step [H].
- [H] Recommended noise strategy:
  1. Best microphone first (Q7).
  2. Feed raw or minimally processed audio to a noise-trained model (Qwen3-ASR, Cohere, Parakeet). Test Android `VOICE_RECOGNITION` vs `VOICE_COMMUNICATION` / `UNPROCESSED` sources, because the platform's own noise suppression is also a "front-end".
  3. Fine-tune on our recorded site and subway noise mixed at -5 to 10 dB.
  4. Use enhancement only for the human-listening copy of the audio, or test weak or partial enhancement as an A/B arm.

### Gaps
- No Korean ASR benchmark at controlled 0-10 dB SNR was found for any 2026 model.
- No measured SNR for earbud or phone mics in a subway car. The SNR figures above are estimates from acoustics rules of thumb.
- No published ASR result for DeepFilterNet, RNNoise, ClearerVoice/MossFormer2 or NVIDIA Maxine BNR in front of Whisper-class models. The ClearerVoice repo is Apache-2.0 per prior repo notes ([enabling_open_models.md](../../../market-studies/ai-media-saas-screening/research-notes/enabling_open_models.md)).
- Factory, construction-site and vehicle-cabin dBA ranges were not separately sourced in this pass.

---

## Q5. VAD and segmentation: Silero, WebRTC, TEN; push-to-talk vs always-on

### Takeaway
Silero VAD (MIT) remains the default. TEN VAD (Apache-2.0 with extra conditions) claims sharper endpoints and better precision and recall.

In loud, non-stationary noise all VADs false-trigger. Silero v5 reportedly classifies only 61% of pure-noise ESC-50 clips correctly at utterance level. That pushes Whisper-type models toward hallucinations, and Cohere also transcribes non-speech sounds.

For 85-100 dB sites, use push-to-talk (earbud, PTT button, or headset VOX) as the primary trigger. Keep VAD-gated always-on for quieter settings.

### Cited Findings
- **Silero VAD** [F]: MIT licence (LICENSE file). About 2 MB; under 1 ms per 30 ms chunk on one CPU thread; 8/16 kHz; trained on 6,000+ languages. The README's quality claims have no numbers — [GitHub](https://github.com/snakers4/silero-vad), [LICENSE](https://raw.githubusercontent.com/snakers4/silero-vad/master/LICENSE).
- **TEN VAD** [F/V] — [GitHub](https://github.com/TEN-framework/ten-vad):
  - Apache-2.0 "with additional conditions" (LPCNet-derived BSD code).
  - 10/16 ms hops at 16 kHz.
  - Android arm64 library 532 KB; RTF 0.049-0.057 on low-end Android phones.
  - Claims the best precision-recall vs WebRTC (pitch-based) and Silero, and says Silero "suffers from a delay of several hundred milliseconds" at speech-to-silence transitions [V].
- **Calm-Whisper**: Silero VAD v5 had 61% utterance-level accuracy on ESC-50 noise clips, so up to about 40% of pure noise could be passed as speech. Fine-tuning cut non-speech hallucinations by more than 80% with under 0.1% WER loss [P] — [arXiv 2505.12969](https://arxiv.org/html/2505.12969v1).
- **Korean paper**: on UrbanSound8K, vanilla Whisper hallucinated on 100% of 3,429 noise samples; Silero VAD filtering reduced that to 0.73% [P, second-hand] — [SNU PDF](https://hi.snu.ac.kr/wp-content/uploads/sites/103/2026/07/26하계전자공학회_박우성.pdf).
- **SAE steering** reduced Whisper large-v3's non-speech hallucination rate from 86.88% to 27.33% [P] — [emergentmind](https://www.emergentmind.com/papers/2606.07473).
- **faster-whisper** `vad_filter=True` uses Silero. The default removes only silences longer than 2 s; it is on by default in batched mode [F] — [GitHub](https://github.com/SYSTRAN/faster-whisper).
- **WhisperX**: VAD preprocessing "reduces hallucination and enables batching without WER degradation" [F] — [GitHub](https://github.com/m-bain/whisperX).
- **Cohere** recommends a VAD or noise gate [V] — [HF blog](https://huggingface.co/blog/CohereLabs/cohere-transcribe-03-2026-release).
- **Kyutai STT 1B** has a built-in semantic VAD that predicts end-of-turn (Rust server only) [F] — [kyutai.org/stt](https://kyutai.org/stt).
- **Prior repo decision**: VAD-gated listening during sessions, push-to-talk always available, no free Korean wake word ([technical-decisions.md](../../../products/voice-life-companion/technical-decisions.md) section 4.1).

### Inferences
- [H] Recommended for the logging app:
  - Push-to-talk is the default in loud sites: earbud tap, hardware PTT, or a Peltor-style headset with VOX.
  - VAD-gated always-on is an option in quiet or moderate noise.
  - Always keep 300-600 ms of pre-roll; the SPIKE found word-onset clipping with 640 ms pre-roll vs about 0.7 s VAD confirmation.
  - Raise the VAD threshold adaptively with the measured noise floor.
  - Server-side, drop segments with low ASR confidence or a high no-speech probability, and flag rather than log them.
- [H] TEN VAD is worth A/B testing against Silero on our own recordings for endpoint latency. Its "additional conditions" must be read before shipping.

### Gaps
- No independent Silero vs TEN vs WebRTC comparison at 85-100 dB industrial noise.
- WebRTC VAD licence not rechecked in this pass.
- The TEN VAD "additional conditions" text not read in full.

---

## Q6. Contextual biasing and hotwords for domain vocabulary

### Takeaway
Biasing is available in every candidate family, through different mechanisms:
- sherpa-onnx: hotwords only for transducer models with `modified_beam_search`. That covers the Korean zipformer and likely Nemotron in sherpa.
- NeMo: GPU phrase boosting (GPU-PB), including per-stream lists for cache-aware streaming RNNT/TDT. That covers Nemotron 3.5 and Parakeet on the server.
- Qwen3-ASR: free-text context in the system prompt, up to 10k tokens per Alibaba docs.
- Whisper: `initial_prompt` / `hotwords`, limited to about 224 tokens.
- Granite: a "Keywords:" prompt (English only).

### Cited Findings
- **sherpa-onnx hotwords** [F] — [docs](https://k2-fsa.github.io/sherpa/onnx/hotwords/index.html):
  - "Only transducer models support hotwords"; requires `modified_beam_search`; works offline and online.
  - Per-hotword scores (e.g. `word :3.5`); Aho-Corasick boosting at inference time.
  - Modeling units `cjkchar`, `bpe`, `cjkchar+bpe` (bpe needs `bpe-vocab`). Examples cover only Chinese and English.
- **NeMo GPU-PB / TurboBias** [F]:
  - Decode-time shallow fusion for CTC, RNNT/TDT and AED with no retraining.
  - Per-stream (per-utterance) phrase lists are supported only for greedy label-looping RNNT/TDT, including cache-aware streaming models.
  - Sources: [NeMo docs 3.0.0](https://docs.nvidia.com/nemo/speech/3.0.0/asr/asr_customization/word_boosting.html), [arXiv 2508.07014](https://arxiv.org/html/2508.07014v2).
- **Qwen3-ASR "context enhancement"** [V/P]:
  - Word lists or paragraphs in the system message, up to 10,000 tokens, tolerant of irrelevant text — [Alibaba docs](https://docs.platform.qianwenai.com/developer-guides/accuracy-tuning/speech-recognition).
  - Speech LLMs are order-sensitive: target words early in the prompt work better [P] — [arXiv 2608.05759](https://arxiv.org/pdf/2608.05759).
  - The exact parameter name in the `qwen-asr` package is unverified (an open HF discussion) — [HF discussion](https://huggingface.co/Qwen/Qwen3-ASR-1.7B/discussions/22).
- **Granite 4.0 1B Speech** keyword-list biasing ("Keywords:" at the end of the prompt) [F] — [HF](https://huggingface.co/ibm-granite/granite-4.0-1b-speech).
- **Voxtral Mini Transcribe V2** context biasing (up to 100 phrases) exists, but only in the API model [F] — [Mistral](https://mistral.ai/news/voxtral-transcribe-2).
- **Whisper prompt**: about 224 tokens max (half the text context, per the whisper.cpp header). Truncation behaviour in faster-whisper disputed [P] — [whisper.cpp diff](https://huggingface.co/spaces/Xenobd/whisper.cpp/commit/15949a981ba2a5797602634844ffb70bad7be11c), [Spokenly](https://spokenly.app/docs/whisper-prompting).
- **Platform STT**: no hotword API was used in the spike. The prior repo design uses n-best lists plus session-context alignment instead ([technical-decisions.md](../../../products/voice-life-companion/technical-decisions.md) section 5.5).

### Inferences
- [H] Part numbers and alphanumerics (e.g. "P-203B", "KS D 3503") are poorly served by token boosting. Combine three layers:
  1. Biasing with the site's equipment list.
  2. A deterministic normalizer: spoken digits and letters to codes, Korean numerals.
  3. A server LLM pass that snaps candidates to a site dictionary and flags low confidence for user confirmation.
- [H] On device, sherpa transducer hotwords (zipformer, Nemotron) are the only fully offline biasing option. Platform SODA has none. That favours sherpa models for sites with heavy jargon.

### Gaps
- Not confirmed: whether sherpa-onnx hotwords work with Korean BPE vocabularies and with the Nemotron 3.5 multilingual transducer.
- No measured gains from biasing on Korean domain terms in any source.

---

## Q7. Microphones and hardware for 85-100 dB sites and subways

### Takeaway
The microphone is the biggest lever. In order of expected SNR:
1. Close-talk noise-cancelling boom mics on hearing-protection headsets (3M Peltor WS LiteCom Pro III class; required as PPE at 85 dB+ anyway). Also wearables with mic arrays rated for speech recognition at up to 100 dBA (RealWear Navigator 520).
2. Bone-conduction or voice-pickup sensors fused with air mics.
3. Earbud beamforming mics.
4. Phone or chest bodycam mics.

For Bluetooth, use at least HFP wideband (mSBC, 16 kHz). Avoid CVSD 8 kHz. LE Audio LC3 SWB (about 14 kHz bandwidth) is better where both ends support it.

### Cited Findings
- **Android Bluetooth** [P]:
  - LC3 is the default LE Audio codec and replaces mSBC for HFP voice — [Android BLE audio overview](https://developer.android.com/guide/topics/connectivity/ble-audio/overview) (seen via search).
  - HFP wideband covers 50 Hz-7 kHz; SWB through LC3 (HFP 1.9) covers 50 Hz-14 kHz — [MobileSyrup](https://mobilesyrup.com/2023/04/17/android-bluetooth-calls-improved-super-wideband-speech/), [Wikipedia LC3](https://en.wikipedia.org/wiki/LC3_(codec)).
- **Galaxy Buds3 Pro** [P]: LE Audio, LC3, Bluetooth 5.4; stem mics closer to the mouth; super-wideband calls (about 16 kHz voice bandwidth); ML voice reconstruction in noise. One user reported mic failures with LE Audio on a Windows ARM laptop [A] — [SamMobile](https://www.sammobile.com/samsung/galaxy-buds-3-pro/), [Samsung Community](https://us.community.samsung.com/t5/Galaxy-Buds/Galaxy-Buds3-Pro-Microphone-not-working-properly/m-p/3129277).
- **RealWear Navigator 520** [V]: "4 digital microphones with active noise cancellation (up to 100 dBA)", "accurate voice recognition in noise up to 100 dBA". The older HMT-1 was rated at 95 dBA — [RealWear specs](https://shop.realwear.com/pages/realwear-navigator-520-specifications), [datasheet](https://cot.de/files/datasheets/RealWear-Navigator-520-Datenblatt.pdf).
- **3M Peltor WS LiteCom Pro III** [V/P]:
  - Noise-cancelling speech mic (dynamic differential boom), IP67 per 3M (IP68 per a retailer); voice-operated transmission; Bluetooth with A2DP/HFP and multipoint.
  - Attenuation NRR 24-28 dB depending on variant.
  - Sources: [3M](https://3m.com/3M/en_US/p/d/b10263723), [CDW](https://www.cdw.com/product/3m-peltor-ws-litecom-pro-iii-headset-bluetooth-noise-canceling-2-way/6004832).
- **Shokz OpenComm2** [P]: DSP plus cVc noise-cancelling boom mic, sensitivity -38 dB ±3, 100 Hz-10 kHz response, Bluetooth 5.1 with HSP/HFP. Wideband (mSBC) support not confirmed — [Clear-Com](https://clearcom.com/Product/shokz-opencomm2).
- **Bone-conduction evidence** [P]:
  - PMUT bone-conduction mic fused with an air-conduction mic: over 20% relative CER reduction; at 68 dB noise the bone-conduction signal had more than 5x the SNR amplitude ratio of air conduction — [PMC12195400](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12195400/).
  - Bone-conduction mic with a denoising autoencoder: 9.13% CER vs 58.75% for an air mic in real 61.7-73.9 dBA noise — [NTU](https://scholars.lib.ntu.edu.tw/handle/123456789/488045).
  - At 0 dB SNR, bone conduction as an auxiliary input cut CER by more than 59% vs an air-only baseline — [ICASSP 2022](https://rc.signalprocessingsociety.org/conferences/icassp-2022/spsicassp22vid0058).
  - Bone conduction alone loses high frequencies, so systems fuse it with air conduction.
- **Prior repo**: classic Bluetooth headset mics are narrowband [P], and the QCY earbuds are likely classic HFP ([technical-decisions.md](../../../products/voice-life-companion/technical-decisions.md) sections 1.1 and 8).

### Inferences
- [E] Ranking for 85-100 dB environments, with SNR estimated as in Q4:
  - Peltor-class boom inside earmuffs (also the PPE answer) > RealWear-class head-worn array > Shokz-style boom > earbuds with VPU/beamforming > lanyard or chest bodycam > phone in hand or pocket.
- [H] Avoid letting a headset's aggressive DSP noise suppression (cVc) run unchecked. Like software enhancement, it may hurt ASR. Bake off each headset by recording the same scripted Korean/English phrases at controlled noise playback.
- [H] Record the best available raw stream (16 kHz minimum, 32-48 kHz when the route supports it) for server re-transcription. The on-device model can still consume a 16 kHz downmix.
- [H] For TBM (toolbox) meetings, a single table or phone mic in the middle of a group in a noisy yard will be poor. A small boundary or conference mic, or one lapel or headset mic per speaker, makes diarization and ASR far easier.

### Gaps
- Bodycam audio specs (sample rate, codec, mic type) could not be found for Axon Body 4 or similar.
- Not found:
  - whether Android exposes LE Audio LC3 SWB capture at 32 kHz to apps (vs downsampling to 16 kHz);
  - Peltor's Bluetooth codec or wideband status;
  - any measured ASR WER for Peltor, Shokz, RealWear or Galaxy Buds at 85-100 dB.
- Sena industrial headsets (Tufftalk) were not researched.

---

## Q8. Diarization and local LLM post-processing on the 4090 (brief)

### Takeaway
Diarization:
- pyannote community-1 (CC-BY-4.0, gated) is the default on-prem choice.
- NeMo streaming Sortformer v2 (CC-BY-4.0) is limited to 4 speakers.
- Nemotron-3-Diarization (8 speakers) is newer.

For structuring transcripts with a commercial licence and Korean ability on 24 GB:
- Usable: Qwen3 / Qwen3.5 (Apache-2.0), Gemma 4 (Apache-2.0 since April 2026), Kanana 1.5 (Apache-2.0), A.X 4.0 Light (Apache-2.0 per SKT), HyperCLOVA X SEED (commercial with exceptions).
- Excluded: EXAONE 4.0, which is non-commercial (NC).

### Cited Findings
- **pyannote speaker-diarization-community-1** [F]:
  - CC-BY-4.0; gated (accept the conditions and use an HF token); input 16 kHz mono; `exclusive_speaker_diarization` output for aligning with ASR.
  - DER, community-1 vs legacy 3.1:

    | Dataset | community-1 | legacy 3.1 |
    |---|---|---|
    | AMI-IHM | 17.0 | 18.8 |
    | AMI-SDM | 19.9 | 22.7 |
    | DIHARD3 | 20.2 | 21.4 |
    | AliMeeting | 20.3 | 24.5 |
    | AISHELL-4 | 11.7 | 12.2 |

  - pyannoteAI precision-2 (hosted, cloud only, so not allowed here) scores AMI-IHM 12.9.
  - Source: [HF card](https://huggingface.co/pyannote/speaker-diarization-community-1).
- **NVIDIA `diar_streaming_sortformer_4spk-v2`** [F]:
  - CC-BY-4.0; maximum 4 speakers.
  - Latency 0.32-30.4 s, RTF 0.002-0.18.
  - DIHARD III ≤4 speakers DER about 13.2-14.9; CALLHOME full 9.5-13.6.
  - The card points to Nemotron-3-Diarization (8 speakers).
  - The v2.1 licence differs per ports (NVIDIA Open Model License) [P].
  - Sources: [HF card](https://huggingface.co/nvidia/diar_streaming_sortformer_4spk-v2), [v2.1 GGUF](https://huggingface.co/handy-computer/diar_streaming_sortformer_4spk-v2.1-gguf).
- **Prior repo note**: Nemotron 3.5 Transcribe (ASR plus speaker attribution, about 40 languages, OpenMDW-1.1) is reported but unverified [U] ([enabling_open_models.md](../../../market-studies/ai-media-saas-screening/research-notes/enabling_open_models.md)).
- **Local LLM licences**:

  | Model | Licence | Source |
  |---|---|---|
  | EXAONE 4.0 (32B, 1.2B) | **EXAONE AI Model License Agreement 1.2 - NC** [F] | [HF](https://huggingface.co/LGAI-EXAONE/EXAONE-4.0-32B) |
  | K-EXAONE 2.0 (750B MoE, 2026-07-31) | Reportedly Apache-2.0, far too big for a 4090 [P] | [Korea JoongAng Daily](https://www.koreajoongangdaily.com/business/lg-unveils-kexaone-20-koreas-largest-opensource-ai-model/12802076) |
  | Gemma 4 (E2B, E4B, 26B MoE with 3.8B active, 31B dense; 2026-04-02) | Apache-2.0 [P] | [The Decoder](https://the-decoder.com/googles-gemma-4-is-now-available-with-apache-2-0-licensing-for-the-first-time/) |
  | Qwen3.5 (0.8B-397B, incl. 27B and 35B-A3B) | Apache-2.0 [P, single secondary source] | [Verdent guide](https://www.verdent.ai/guides/model/qwen-3-5) |
  | Kanana 1.5 8B instruct | Apache-2.0 [P]; an older Kanana Nano card says CC-BY-NC-4.0 [P] | [HF](https://huggingface.co/kakaocorp/kanana-1.5-8b-instruct-2505), [Nano card](https://huggingface.co/kakaocorp/kanana-nano-2.1b-base) |
  | A.X 4.0 Light (7B, Qwen2.5-based) | Apache-2.0 per SKT [V] | [SKT](https://sktelecom.github.io/en/project/axllm) |
  | HyperCLOVA X SEED | Commercial use free "with limited exceptions"; large competitors excluded; attribution required [V/P] | [CLOVA blog](https://clova.ai/en/tech-blog/sowing-the-seeds-in-the-ai-ecosystem-introducing-hyperclova-x-seed-a-commercial-open-source-ai) |

### Inferences
- [E] One 4090 at 24 GB can host one ASR model (about 3-6 GB) plus one of: a 4-bit 26B-35B MoE (about 15-18 GB), or an 8-bit 7-9B dense model (about 9-10 GB), served via vLLM or llama.cpp. Run ASR and the LLM as sequential batch jobs after sync to avoid contention. Per the user's memory notes, run heavy jobs one at a time under memory caps.
- [H] For structuring Korean field logs into fields such as equipment, location, action and hazard, first-pass candidates are Qwen3.5-27B/35B-A3B or Gemma 4 26B/31B (Apache-2.0), with Kanana 1.5 8B or A.X 4.0 Light as smaller Korean-tuned alternatives. Avoid EXAONE 4.0 (NC).
- [H] Diarization for TBM meetings: run pyannote community-1 on the server (via WhisperX or directly). Expect DER around 20% on far-field noisy audio, so a mic per speaker (Q7) matters more than the model.

### Gaps
- Not checked on primary pages: the Gemma 4, Qwen3.5 and A.X 4.0 Light licence files, and HyperCLOVA X SEED's exact exception thresholds.
- Not checked: Kanana 2 availability and licence; the Nemotron 3.5 Transcribe card (HF returned 401 in earlier repo research).
- No Korean-specific benchmarks for transcript structuring were compared.

---

## Q9. What in the prior repo research is now stale or should be updated?

### Takeaway
Six items in technical-decisions.md (sections 1.1, 4.3 and 4.5) should be updated:
- The Moonshine licence characterization.
- ML Kit GenAI Advanced-mode device eligibility.
- The Qwen3-ASR-0.6B on-device size.
- The KsponSpeech/AI Hub licence status.
- The absence of Nemotron 3.5 streaming as a Korean+English on-device candidate.
- The absence of 2026 server models (Qwen3-ASR-1.7B, Cohere Transcribe, Voxtral Realtime).

### Cited Findings
- **Moonshine**:
  - Prior doc: Korean tiny/base "non-commercial per the repository LICENSE".
  - Current LICENSE: the Korean legacy models are under the Community License, which permits commercial use after registration for organizations under US$1M annual revenue, with a "Powered by Moonshine AI" notice. All streaming and English models are MIT [F] — [LICENSE](https://raw.githubusercontent.com/moonshine-ai/moonshine/main/LICENSE).
  - The README's own wording still says "non-commercial", so the wording conflicts.
- **ML Kit GenAI Speech Recognition**:
  - Prior doc: Advanced mode needs S26/Fold8/Flip8, not the S25.
  - Current page: SM8750 (Snapdragon 8 Elite) is listed for Advanced mode, ko-KR is non-beta there, and the SDK is at alpha2 [F] — [docs](https://developers.google.com/ml-kit/genai/speech-recognition/android). Another snapshot conflicts [P].
- **Qwen3-ASR-0.6B int8 sherpa package**:
  - Prior doc: "Unverified, likely > 100 MB".
  - Now verified at about 937 MB (42 + 174 + 721 MB) [F] — [sherpa export page](https://k2-fsa.github.io/sherpa/onnx/qwen3-asr/export.html).
- **KsponSpeech / AI Hub**:
  - Prior doc: "terms may be non-commercial [U]".
  - The AI Hub general policy allows for-profit R&D, with conditions: NIA attribution, no redistribution, overseas transfer and overseas entities only by agreement, and per-dataset exceptions [F] — [AI Hub policy](https://www.aihub.or.kr/intrcn/guid/usagepolicy.do).
- **New Korean+English streaming option**: Nemotron 3.5 ASR Streaming 0.6B, with sherpa-onnx int8 packages dated 2026-06-11 [F] — [sherpa docs](https://k2-fsa.github.io/sherpa/onnx/nemo/nemotron-streaming.html).

### Inferences
- [H] These updates belong in a new logging-product technical-decisions file, or as a dated addendum to the Voice Life Companion one. The rest of the repo's earlier STT decisions (adapter pattern, Silero VAD, sherpa-onnx Expo module, platform STT first) carry over unchanged.

### Gaps
- No legal reading of OpenMDW-1.1's full text (termination on copyright assertions) was done. Other researchers cover legal topics.
