# Audio and Speech Separation: Deployment Economics and Licensing (second pass)

Research date: 2026-11-04. Tool budget was about 20 calls, so several items are marked as gaps. Labels used: [VERIFIED] read on the primary page that day; [VENDOR] vendor claim; [ESTIMATE] my arithmetic; [ANECDOTE]; [HYPOTHESIS]. This is not legal advice.

## Compute: real-time factors, throughput, and cloud cost per audio hour

### Takeaway
No independent, measured HTDemucs or BS-RoFormer benchmark on A10, L4, or RTX 4090 was found. The available figures are vendor or blog numbers that disagree by about 10x, so the cost per audio hour is a wide estimate of roughly cents to a few tens of cents on a rented GPU. Run an in-house benchmark before pricing.

### Cited Findings
- [VERIFIED 2026-11-04] The official Demucs README says CPU processing time is "roughly equal to 1.5 times the duration of the track" (hardware not specified), that htdemucs_ft takes 4x the time of htdemucs, and that GPU memory needs are at least 3GB, or about 7GB with default arguments. — [adefossez/demucs](https://github.com/adefossez/demucs)
- [VENDOR] A StemSplit blog table gives about 30 s (htdemucs) and about 60 s (htdemucs_ft) for a 4-minute track on an RTX 4090. That is about 7.5 s per audio minute, so a real-time factor (RTF, processing time divided by audio duration) of about 0.125 for htdemucs. The measurement method is not stated. — [StemSplit local setup guide](https://stemsplit.io/ja/blog/demucs-local-setup-guide)
- [VENDOR, extrapolated by the vendor] StemSplit ONNX cards list an NVIDIA L4 with onnxruntime CUDA at about 0.4 s per 7.8 s segment (about 5 s per 3-minute song) and an RTX 4090 at about 2 s per 3-minute song. These are labelled extrapolated, not measured. — [StemSplit htdemucs-ft ONNX](https://huggingface.co/StemSplitio/htdemucs-ft-drums-onnx)
- [VENDOR/community, measured] A Demucs v4 TensorRT card reports about 116 ms GPU compute per 7.8 s chunk on an RTX 3090 with FP16. That is about 2.7 s of GPU compute for a 3-minute track. — [Demucs_v4_TRT](https://huggingface.co/MansfieldPlumbing/Demucs_v4_TRT)
- [VENDOR] An ONNX drums specialist runs at RTF 0.20 on an M4 Pro CPU (about 22 s for a 3-minute song). — [StemSplit ONNX export blog](https://stemsplit.io/blog/htdemucs-ft-onnx-export)
- [VERIFIED 2026-11-04, paper] An arXiv paper on diffusion refinement reports BS-RoFormer variants at about 231 ms per pass for the deterministic model, and 1291 ms (RTF 0.117) and 2351 ms (RTF 0.214) for one-step and two-step consistency refinement. The snippet did not name the GPU, so treat the hardware as unknown. — [arXiv 2412.06965](https://arxiv.org/pdf/2412.06965)
- [VERIFIED 2026-11-04] The ZFTurbo Music-Source-Separation-Training README has no inference timings; it mentions only that training batch sizes were tuned for an A6000 48GB. — [ZFTurbo repo](https://github.com/ZFTurbo/Music-Source-Separation-Training)
- No A10 numbers and no CPU numbers for BS-RoFormer were found.

### Inferences
- [ESTIMATE] Assume a throughput range of RTF 0.01 to 0.13 for htdemucs on a modern GPU (the 0.01 end is the vendor extrapolation, the 0.125 end is the blog table). One GPU-hour then processes about 8 to 100 audio hours. At assumed rental prices of about $0.5 to $1.0 per hour for an L4 or A10 class GPU (I did not verify current prices this session), that is about $0.005 to $0.13 per audio hour for htdemucs. Allow 2 to 4x more for htdemucs_ft and for BS-RoFormer, giving roughly $0.02 to $0.5 per audio hour. Add overhead for decoding, idle time and utilisation below 100%.
- [HYPOTHESIS] Compute is likely a minor cost line for batch music separation compared with licensing, support and storage. It matters more for live streaming, where a GPU must be held per stream.

### Gaps
- No measured A10, L4 or 4090 results from ZFTurbo, jarredou or GitHub issues were retrieved. GPU rental prices were not looked up.
- No CPU RTF for BS-RoFormer and Mel-RoFormer.

## On-device: mobile separation models and real-time latency

### Takeaway
Offline, file-based HTDemucs conversions exist for CoreML and ONNX, and several iOS apps advertise fully local separation. Sub-100 ms streaming dialogue isolation is claimed by vendors (AudioShake 11 ms), but I found no independent phone or TV measurements.

### Cited Findings
- [VENDOR] A CoreML HTDemucs conversion is used by the Kioku iOS app for on-device vocal isolation before lyric alignment. — [HTDemucs CoreML](https://huggingface.co/matthewmorrone/HTDemucs-CoreML)
- [VENDOR] Another CoreML export recommends fp16 for iPhone and iPad as Neural Engine-eligible and processes full tracks with 25% segment overlap. — [schism-audio/htdemucs-coreml](https://huggingface.co/schism-audio/htdemucs-coreml)
- [VENDOR] StemSplit ONNX exports of HT-Demucs FT are positioned for iOS, Android and browser use. Its roadmap lists the CoreML execution provider as TBD, with a first graph compile of over 5 minutes, and INT8 quantization as planned. — [StemSplit ONNX blog](https://stemsplit.io/blog/htdemucs-ft-onnx-export)
- [VENDOR] The iOS app VSep advertises "Powered by CoreML, all processing happens locally". — [VSep App Store](https://apps.apple.com/us/app/vsep/id6759715582?uo=4)
- [VENDOR, conflicting] Apple said Music Sing uses an on-device machine learning algorithm that processes music in real time and needs a recent device. — [TechCrunch 2022-12-06](https://techcrunch.com/2022/12/06/apple-music-is-getting-a-new-karaoke-like-feature-apple-sing). A competitor blog claims the opposite, that Apple uses pre-processed server-side stems. That is unverified: [StemSplit](https://stemsplit.io/blog/how-to-karaoke-apple-music).
- [VENDOR, 2026] AudioShake's Dialogue RT claims about 11 ms latency for live broadcast dialogue isolation, and says Waves Clarity Vx Pro runs at about 42 ms. — [AudioShake](https://www.audioshake.ai/post/audioshake-debuts-dialogue-rt-the-first-ai-dialogue-isolation-model-built-for-live-broadcast)
- [VERIFIED 2026-11-04] DeepFilterNet's README gives no RTF or ms latency; it provides a 48 kHz `deep-filter` binary and a LADSPA plugin, and the DeepFilterNet2 paper targets embedded devices. — [DeepFilterNet](https://github.com/Rikorose/DeepFilterNet)

### Inferences
- [HYPOTHESIS] A pre-approved Neural Engine path is plausible for offline separation of a single track on recent iPhones, but live separation of full-band stereo with Demucs-class models is unproven.

### Gaps
- Moises offline mode was not verified. No TFLite port was found. No measured phone or TV latency for dialogue enhancement. No RNNoise numbers (not searched). DeepFilterNet latency figures were not found on the README and need the paper.

## Licenses: code and weights, separately

### Takeaway
Most code is permissive (MIT or Apache-2.0), but weights are the risk. SAM Audio uses a custom Meta license, Demucs weights have no clear license, and community RoFormer weights are trained on MUSDB-class data that is academic-only.

### Cited Findings
- SAM Audio. [VERIFIED 2026-11-04] The SAM License (updated 2025-11-19) covers code and weights ("SAM Materials"). It is a non-exclusive, worldwide, non-transferable, royalty-free limited license. It does not mention commercial use directly. It bans military/ITAR uses and reverse engineering, requires carrying the license with redistributions, lets Meta terminate for breach, and is governed by California law. Access is gated on Hugging Face. — [LICENSE](https://github.com/facebookresearch/sam-audio/blob/main/LICENSE), [HF card](https://huggingface.co/facebook/sam-audio-large). Commercial use is not expressly prohibited by that text, but get counsel's reading because the fetch tool summarised the page and I did not read the full text line by line.
- Demucs. [VERIFIED 2026-11-04] Code is MIT. The README says "The license of the weights is not clear". The 6-source model was trained on a Meta internal dataset, "which likely means CC-NC-BY license is applicable". Models were trained on MUSDB HQ plus 800 extra songs, and the README notes MUSDB contains research-only data. The repo is a maintained fork, and the author is no longer active. — [adefossez/demucs](https://github.com/adefossez/demucs)
- ZFTurbo training repo. [VERIFIED] Code is MIT. The README states no weight licenses or commercial-use position and links to a separate model list. — [repo](https://github.com/ZFTurbo/Music-Source-Separation-Training). Licenses and training data for viperx and KimberleyJSN weights were not found (gap).
- AudioSep. [VERIFIED] Code is MIT. No weights license is stated on the README, and training data licenses were not given. — [AudioSep](https://github.com/Audio-AGI/AudioSep)
- DeepFilterNet. [VERIFIED] Code is dual MIT or Apache-2.0. The README states no separate weights license or training data. — [DeepFilterNet](https://github.com/Rikorose/DeepFilterNet)
- pyannote. [VENDOR/search summary] The speaker-diarization-3.1 model card lists MIT, with gating (accept conditions and a token), and nudges users to paid pyannoteAI. A third-party site mentions a newer "community-1" model under CC BY 4.0, which is unconfirmed. — [model card mirror](https://www.github.com/pyannote/hf-speaker-diarization-3.1)
- SepFormer (SpeechBrain) and TF-GridNet (ESPnet): not checked this session (gap). The brief states SepFormer is Apache-2.0, which I did not confirm.

### Datasets
- MoisesDB. [VERIFIED, conflicting] The GitHub README says NC-RCL (non-commercial research community license), while the Hugging Face card was changed to CC BY-NC-SA 4.0. Both bar commercial use. — [GitHub](https://github.com/moises-ai/moises-db), [HF](https://huggingface.co/datasets/wearemusicai/moisesdb)
- MUSDB18 and MUSDB18-HQ. [VERIFIED] Academic use only, with track-level terms: 46 MedleyDB tracks CC BY-NC-SA 4.0, 2 tracks CC BY-NC-SA 3.0, and 100 DSD100 tracks under Mixing Secrets terms. — [SigSep](https://sigsep.github.io/datasets/musdb.html)
- FMA. [VERIFIED] Metadata is CC BY 4.0 and code MIT. Audio is under each artist's chosen license, and the dataset is "meant for research purposes". — [mdeff/fma](https://github.com/mdeff/fma)
- FSD50K. [VERIFIED] The dataset is CC BY 4.0 overall, but each clip has its own license (CC0, CC-BY, CC-BY-NC, Sampling+), so per-clip filtering is needed for commercial use. — [FSD50K paper](https://arxiv.org/pdf/2010.00475)
- DnR v3. [VERIFIED, paper pre-release statement] The paper says CC BY-SA 4.0 for the dataset and Apache-2.0 for code, and the sources were limited to public domain, CC BY, CC BY-SA, Open Audio License and Free Art License audio. — [arXiv 2407.07275](https://arxiv.org/html/2407.07275v2). The Hugging Face mirror of the test set lists "other". — [HF](https://huggingface.co/datasets/MusicDemixingBenchmarks/dnr_v3). DnR v2 license was not confirmed (gap).

### Inferences
- [HYPOTHESIS] Because the ShareAlike clause could be argued to reach derived models, DnR v3 is the cleanest known open training source for speech/music/effects, but the question is unsettled.
- [HYPOTHESIS] Without clear weights licenses, a commercial product on Demucs or community RoFormer weights carries risk; retraining on cleared data is the safer route.

### Gaps
- Exact viperx/KimberleyJSN/ZFTurbo licenses, SepFormer, TF-GridNet, DnR v2, and a full read of the SAM License for commercial implications.

## Training data for commercial models and legal commentary

### Takeaway
Commercial vendors say they train on licensed data. Legal commentary says training on NC data is an unsettled risk, with the strict reading being that commercial use of resulting models is barred.

### Cited Findings
- [VENDOR] AudioShake says separation models can be trained on licensed production-library data rather than a specific artist's tracks, and has a case study with Persona Music for custom models on its catalog. — [AudioShake AI ethics](https://www.audioshake.ai/ai-ethics), [Persona Music](https://www.audioshake.ai/case-studies/persona-music)
- [VENDOR] AudioShake's $14M Series A announcement says it works with most of the "Mag 7" and processes millions of hours of licensed audio. — [AudioShake press release](https://www.audioshake.ai/press-releases/audioshake-raises-14m-to-make-sound-more-usable-in-the-ai-era)
- [Commentary, not a ruling] A Black Duck post says CC BY-NC or research-only data means "you can't use models commercially that are trained on this data", and it cites an audit in which 76% of open source AI models were trained on data with a more restrictive license than the model's own. The same commentary says the law is unclear on trained models. — [Black Duck](https://www.blackduck.com/blog/open-source-ai-model-licensing-risk.html). Counterarguments rely on fair use and the non-commercial origin of data: [Morgan Lewis via Law360](https://www.morganlewis.com/-/media/files/news/2024/ai-models-link-to-nonprofit-data-raises-fair-use-question-law360.pdf).

### Gaps
- No Music.AI training data statement found. No court ruling specific to separation models.

## Quality perception: artifacts and broadcast acceptability

### Takeaway
Reported artifacts are bleed, phasiness and a watery or underwater top end. I found no practitioner thread on broadcast acceptability, only vendor and trade material.

### Cited Findings
- [VENDOR/tutorial blogs, not practitioner forums] Common complaints: hi-hat and cymbal bleed in vocals, "phasey / underwater" highs, watery sound on sustained notes and reverb tails, hollow sound on wide stereo mixes, and reverb staying in instrumental stems. Spleeter reportedly is more watery than Demucs. Each extra process magnifies artifacts. — [Dubspot mixing guide](https://blog.dubspot.com/mixing-ai-generated-stems-2026), [StemSplit Spleeter vs Demucs](https://stemsplit.io/blog/spleeter-vs-demucs.md), [Sonicstate 2026-09-22](https://sonicstate.com/news/2026/09/22/restoration-plug-in-for-separated-stems/)
- [VENDOR] MyAudioFactory pitches DialogueExtractor 2.0 as avoiding the "metallic" artifacts of spectral or purely AI separation. — [Production Expert](https://www.production-expert.com/production-expert-1/myaudiofactory-dialogueextractor-20-ai-dialogue-separation-gets-ara-support-for-reaper-cubase-and-studio-one)
- [VENDOR] A StemSplit guide says iZotope RX is the de facto tool in pro post workflows. — [StemSplit](https://stemsplit.io/blog/pro-tools-stem-separation.md)

### Inferences
- [HYPOTHESIS] Artifacts are tolerated in music-practice and remix use, but broadcast delivery of separated dialogue likely needs human QC; this is not supported by a professional source.

### Gaps
- No Gearspace or Reddit r/audioengineering threads were retrieved, and no broadcast delivery specs on AI stems. Production Expert has a head-to-head test of eight dialogue separation tools whose results were not read.
