# Audio Source Separation: State of the Art, Open-Source Landscape, Licensing and Deployment (research date 2026-11-04)

Labels: [VF] verified fact (primary or direct page read), [VC] vendor claim, [EST] estimate, [HYP] hypothesis, [2ND] secondary/aggregator source (treat as unconfirmed). Research budget was about 16 tool calls; many items are listed under Gaps rather than guessed.

## 1. Music stem separation state of the art

### Takeaway
Band-split/mel-band RoFormer models (BS-RoFormer, Mel-RoFormer) and SCNet, trained by the community with ZFTurbo's MSST framework, lead MVSEP's Multisong leaderboard; Demucs v4 is frozen (archived Jan 2025) at roughly 9 dB MUSDB18-HQ SDR. The best vocal models on MVSEP reach about 12.3 dB vocals SDR, but these community weights are of unclear data provenance.

### Cited Findings
- [VF] facebookresearch/demucs was archived by its owner on 2025-01-01; the author left Meta and only important bug fixes go to the fork github.com/adefossez/demucs. Code license MIT; the README does not state a separate weights license. HT Demucs fine-tuned (v4) scores 9.0 dB overall SDR on MUSDB18-HQ (7.7 for Hybrid Demucs v3); the 9.20 dB sparse-attention variant is not released. — [GitHub](https://github.com/facebookresearch/demucs) (read 2026-11-04)
- [VF, paper claim] BS-RoFormer reached 11.99 dB average SDR on MUSDB18-HQ when trained with 500 extra songs, and ranked first in the SDX23 music separation track. Mel-Band RoFormer (ByteDance SAMI, Oct 2023) beat BS-RoFormer on vocals, drums and other with MUSDB18-HQ-only training; the mel mapping gained 0.43/0.58 dB on vocals for L=6/L=9 but was worse for bass. Metric is median SDR via museval. — [Mel-Band RoFormer arXiv 2310.01809](https://arxiv.org/pdf/2310.01809)
- [2ND, from MVSEP pages via search summary; verify live] MVSEP Multisong (vocals SDR / instrumental SDR): BS Roformer 124 bands (ver. 2026.07) 12.33 / 18.64; becruily "fullness duality" 12.25 / 18.47; ensemble of BS Roformer + MelBand Roformer + SCNet XL IHF (2025.06) 11.93 / 18.23; Kimberley Jensen MelBand Roformer 11.01 / 17.32; unwa Instrumental v1e plus 10.33 / 16.64. No Mel-RoFormer entry found beating the top BS-RoFormer variant. — [MVSEP algorithms](https://www.mvsep.com/algorithms)
- [VF] ZFTurbo/Music-Source-Separation-Training (MIT license) supports mdx23c, htdemucs, bs_roformer, mel_band_roformer, bandit/bandit_v2, scnet (and tran/masked variants), apollo, bs_mamba2, conformer, dttnet and others; pretrained list is in docs/pretrained_models.md; `pip install msst`. — [GitHub](https://github.com/ZFTurbo/Music-Source-Separation-Training)
- [VF] SDX23 overview: 884 participants, 68 teams, 2828 submissions, $42,000 prizes, Jan 23 to May 1 2023; organizers MERL, Sony, Moises AI, AudioShake, Meta. — search summary of [arXiv 2308.06981](https://arxiv.org/pdf/2308.06981)
- [2ND] A 2026 blog lists a becruily Mel-RoFormer "Deux" at 17.55 instrumental SDR; not from MVSEP. — [Lyruno blog](https://lyruno-website.pages.dev/blog/remove-vocals/ai-vocal-separation-guide-latest)

### Inferences
- [HYP] MUSDB18-HQ SDR is saturated as a differentiator; community Multisong/private sets and perceptual listening matter more. The ~3 dB MUSDB gap between Demucs v4 (9.0) and RoFormer (about 12 with extra data) is the "reachable by in-house" window if you have extra training data.
- [HYP] With the reference implementation frozen, the practical open-source base for a new team is MSST + RoFormer/SCNet architectures, not Demucs.

### Gaps
- Not verified: ByteDance and Sony 2025-2026 successors, SCNet paper numbers, MDX23 winners' scores, the SDX23 music-track leaderboard, UVR model list. Not enough budget; recommend a follow-up pass.
- MVSEP live leaderboard was only seen via search summaries, not fetched directly.

## 2. Cinematic DME separation

### Takeaway
Academic DME is much weaker than music: on the hidden real-movie set CDXDB23 the best SDX23 systems averaged about 8.1 dB when extra data was allowed and about 4.3 dB when restricted to DnR. Dataset realism (DnR v3 multilingual) and extra data, mainly for dialogue, drive gains. Vendor DME claims are unverified.

### Cited Findings
- [VF] SDX23 Cinematic track, Leaderboard A (DnR-only), mean/dialogue/effects/music dB: aim-less 4.345/7.981/1.217/3.837; mp3d 4.237/8.484/1.622/2.607; subatomicseer 4.144/7.178/2.820/2.433. Leaderboard B (any data): JusperLee 8.181/14.619/3.958/5.966; AudioShake 8.077/14.963/4.034/5.234; ZFTurbo 7.630/14.734/3.323/4.834. Cocktail-fork baseline on CDXDB23: 2.491 / 7.321 / -1.049 / 1.200. — [arXiv 2308.06981v4](https://arxiv.org/html/2308.06981v4)
- [VF] Findings: extra data gave about 6 dB on dialogue (B vs A); DnR music/effects stems contained vocals (removing gave 1.32 dB ablation gain); DnR dialogue is read speech without shouting/breathing; DnR is about 4 LUFS louder than real movies. Published in TISMIR 7(1):44-62, DOI 10.5334/tismir.172. — [arXiv](https://arxiv.org/html/2308.06981v4), [ISMIR 2024 poster](https://ismir2024program.ismir.net/poster_511.html)
- [VF] DnR v3 (Netflix Audio Algorithms, Watcharasupat, Wu, Orife; arXiv 2407.07275): dialogue in 30+ languages; music from FMA (vocals filtered), effects from FSD50K; mono, 48 kHz, 24-bit; splits 6000 train / 600 val / 1200 test clips per variant; motivated by Bandit (trained on DnR v2) failing on non-English dialogue in real Netflix content. — [arXiv HTML](https://arxiv.org/html/2407.07275v2)
- [2ND] MVSEP DnR v3 models: SCNet Large music/sfx/speech SDR 9.94/11.35/12.59; Mel Band Roformer 9.45/11.24/12.27; Bandit Plus 9.21 music/9.69 effects/15.62 speech; not verified against the official leaderboard. — [MVSEP algo 64](https://mvsep.com/algorithms/64)
- [VF] Banquet (query-based) outperformed Bandit when a singing-voice stem was added (ISMIR 2024 abstract). — [arXiv 2408.03588](https://arxiv.org/html/2408.03588v2)
- [VF] A 2026 paper (arXiv 2604.27403) reports a Bandit baseline at 12.01 dB speech SDR on the DnR nonverbal set vs 13.01 dB with an articulation-aware, alignment-informed separator. — [arXiv](https://arxiv.org/pdf/2604.27403)
- [VC] AudioShake lists dialogue/music/effects isolation for film, TV and dubbing, with on-device SDK (iOS, Android, Windows, Linux) and streaming or batch API. — [developer.audioshake.ai](https://developer.audioshake.ai), [SDK page](https://www.audioshake.ai/products/sdk)
- [VF] AudioShake (team entry) placed 2nd on SDX23 Leaderboard B (8.077 dB), 0.10 dB behind JusperLee; so the "highest SDR" claim in a review ([2ND](https://music.loop.fans/ai/audioshake-ai-review-the-major-label-choice-for-professional-stem-separation)) is not supported by the paper's table.

### Inferences
- [HYP] Real-world DME needs proprietary real-movie-like data (licensed stems, multilingual, emotive speech); public DnR alone is the main bottleneck, per the 6 dB extra-data effect.
- [EST] Reachable by a small team with DnR v3 + open weights: roughly the 9-13 dB per-stem synthetic range on DnR test; real-film performance will be notably lower (SDX23 DnR-only about 4 dB mean on real movies).

### Gaps
- Gaudio Lab and iZotope DME claims: not retrieved. Sony and MERL work beyond SDX23 organization: not found. iZotope RX dialogue isolate: unverified.
- Pricing for AudioShake API: no per-minute price found (third-party directories conflict).

## 3. Query-based and universal separation; audio-visual

### Takeaway
Meta SAM Audio exists (released 2025-12-16), is gated, and uses a custom "SAM License" whose commercial terms I could not read. Audio-visual separation has strong open research (Dolphin, ICLR 2026) with public code.

### Cited Findings
- [VF] SAM Audio: paper arXiv 2512.18099 (Dec 19, 2025); diffusion transformer trained with flow matching; unified text, visual-mask and time-span prompts; small/base/large (+ "-tv") checkpoints; claims SOTA for general sound, speech, music, instrument separation; reference-free judge model. Hugging Face checkpoints are gated; license id "sam-license". Python >= 3.11, CUDA GPU recommended. No RTF or parameter counts published on the pages read. — [arXiv](https://arxiv.org/abs/2512.18099), [GitHub](https://github.com/facebookresearch/sam-audio), [HF](https://huggingface.co/facebook/sam-audio-large)
- [VF, subjective scores, scale unstated] SAM Audio large: SFX 3.50, speech 4.03, speaker 3.60, music 4.22, instrument (wild) 3.66, instrument (pro) 4.49; base/small are similar. — [GitHub](https://github.com/facebookresearch/sam-audio)
- [2ND] Release date Dec 16, 2025 via Segment Anything Playground; a third-party mirror claims commercial use is permitted with bans on military/nuclear/espionage uses and reverse engineering; unconfirmed. — [The Register](https://www.theregister.com/2025/12/16/meta_sam_ai_audio/)
- [VF] Dolphin (arXiv 2509.23610, ICLR 2026): lip-motion discrete tokens distilled from AV-HuBERT; LRS2 16.8 dB SI-SNRi vs 16.0 for IIANet; claims over 50% fewer parameters, 2.4x fewer MACs, 6x faster GPU inference than prior SOTA; names CTCNet, IIANet, AV-Mossformer2 as prior SOTA. Code is public. — [arXiv](https://arxiv.org/abs/2509.23610v1), [ICLR](https://iclr.cc/virtual/2026/poster/10010025)

### Inferences
- [HYP] AV separation is a viable differentiator for a CV-strong team (face tracking + Dolphin-class model), but license of Dolphin code/weights and LRS2/VoxCeleb training-data terms (typically research only) must be checked before commercial use.

### Gaps
- Not verified: SAM Audio license text (commercial use), parameter count, RTF; AudioSep and CLAPSep licenses/scores; AV-TFGridNet/AV-Sepformer; Dolphin license.

## 4. Speech separation and enhancement

### Takeaway
ClearerVoice-Studio (MossFormer2) is Apache-2.0 per mirrors; the rest of this section was not researched in the budget.

### Cited Findings
- [2ND] ClearerVoice-Studio repo and MossFormer2_SR_48K weights listed as Apache-2.0; README warns of third-party components that may carry other licenses. — [HF model card](https://huggingface.co/alibabasglab/MossFormer2_SR_48K/raw/main/README.md), [ClearerVoice paper](https://arxiv.org/html/2506.19398v1)

### Gaps
- No verified data on SepFormer, TF-GridNet, DeepFilterNet, target speaker extraction, or the licenses of pyannote (code MIT but gated pretrained models; unverified from memory) and SpeechBrain (Apache-2.0 from memory; unverified). Recommend direct LICENSE checks.

## 5. Licensing of code, weights and training data

### Takeaway
Code is mostly MIT/Apache, but MUSDB18 is educational/non-commercial and community RoFormer weights have undisclosed provenance, so commercial use is a legal risk that needs counsel. AudioShake says it licenses training data.

### Cited Findings
- [VF] MUSDB18 Zenodo record: provided for educational purposes; not to be used commercially without copyright holders' permission; some tracks are CC BY-NC-SA; access is for academic purposes. The sigsep parser is MIT (code only). — [Zenodo](https://zenodo.org/record/1117372), [sigsep](https://sigsep.github.io/datasets/musdb.html)
- [VC] AudioShake: does not train on customer inputs/outputs unless contractually agreed; licenses training data from a wide range of providers (e.g., production library data); offers custom models from client catalogs. No independent audit; no explicit "commercially safe" statement found. — [AudioShake AI ethics](https://www.audioshake.ai/ai-ethics), [Persona Music case](https://www.audioshake.ai/case-studies/persona-music)
- [VF] MSST framework MIT; Demucs code MIT (weights license unstated in README). See sections 1 and 3.
- [VF] DnR v3 sources: FMA and FSD50K (per paper); their per-track licenses need checking. — [arXiv 2407.07275](https://arxiv.org/html/2407.07275v2)

### Inferences
- [HYP] Whether a model trained on a non-commercial dataset may be used commercially is legally unsettled; conservative practice is to retrain on licensed or CC-BY/CC0 data and treat community weights as research-only unless the author states otherwise.

### Gaps
- No legal analysis found; community RoFormer weights (Kimberley Jensen, unwa, becruily) licenses and training data not verified.

## 6. Compute and deployment

### Takeaway
Little hard RTF data was found. Apple Music Sing is a real on-device vocal attenuation precedent; BS-RoFormer models run on Apple Silicon via MLX/Core AI ports.

### Cited Findings
- [VF] Apple Music Sing (announced Dec 2022) uses an on-device ML model for real-time vocal isolation; supported iPhone 11 and later; vocals are reduced, not fully removed at lowest setting. A patent application describes a separator network on client device. — [TechCrunch](https://techcrunch.com/2022/12/06/apple-music-is-getting-a-new-karaoke-like-feature-apple-sing), [Justia patent](https://patents.justia.com/patent/20240184515)
- [2ND] mlx-audio-separator on M4 mini: speedups over original of 1.40x (htdemucs_ft), 2.16x (BS-RoFormer), 2.50x (Mel-RoFormer). — [PyPI](https://pypi.org/project/mlx-audio-separator/0.1.20/)
- [2ND] A BS-RoFormer Core AI export is 528 MB fp32 on GPU. — [HF](https://huggingface.co/arraypress/stems-roformer)
- [VF] Batching four BS-RoFormer stems gives no speedup because the roughly 283k-token T-F sequence saturates GPU. — [arXiv 2412.06965](https://arxiv.org/pdf/2412.06965)
- [VC] Gaudio Lab: GSEP (since 2021) emphasizes low compute; Gaudio Studio mobile app runs it. — [Gaudio](https://www.gaudiolab.com/technology/source-separation)
- [VC] AudioShake SDK claims on-device real-time across iOS/Android/desktop. — [AudioShake SDK](https://www.audioshake.ai/products/sdk)

### Inferences
- [EST] A 528 MB fp32 RoFormer implies about 130 MB at int8; still large for continuous mobile use, so real-time dialogue enhancement likely needs a much smaller speech-specific model rather than a music RoFormer. Needs benchmarking.

### Gaps
- No RTF for HTDemucs/BS-RoFormer on named GPU/CPU; no ONNX/TFLite/CoreML phone benchmarks; no cloud cost per audio hour (could be estimated from GPU hourly price once RTF is measured).

## 7. Evaluation

### Takeaway
SDR dominates papers, but SDX23 showed that mismatch of data (loudness, vocals in stems) matters more than architecture; perceptual evaluation was not covered further.

### Cited Findings
- [VF] Loudness alignment alone raised the baseline mean from -0.1 to 1.3 dB on CDXDB23. — [arXiv 2308.06981v4](https://arxiv.org/html/2308.06981v4)
- [VF] SAM Audio introduces a reference-free judge model and reports human subjective scores. — [arXiv 2512.18099](https://arxiv.org/abs/2512.18099)
- [2ND] MVSEP community metrics include SDR plus "fullness" and "bleedless" measures; models are noted as e.g. "max fullness, but noisy". — [MVSEP](https://www.mvsep.com/algorithms)

### Gaps
- No sources on user complaints (bleeding, phasiness, watery artifacts) or post-production "professional grade" criteria; not researched.
