# 08. Generative and foundation models (SAM Audio and its relatives)

## 1. Why generative models entered separation

**Discriminative separators** (lecture 06) predict the *expected* source given the mixture. Where the mixture is ambiguous, for example strong overlap, the expectation is a blurry average, heard as "watery" or "underwater" artifacts.

**Generative separators** instead *sample* a plausible clean source from the conditional distribution p(source | mixture, prompt).
- They sound cleaner.
- They can **invent** content: small timing shifts, re-synthesised timbre, filled-in gaps.
- They do not sum back to the mixture.

**This trade-off between plausible and faithful** is the main issue for our product (differentiator 2).

## 2. Neural audio codecs: the latent space that generative models work in

**Why a latent space.** Raw 48 kHz audio is far too long for a transformer. Neural codecs compress it to a short sequence of latent frames.

**The models:**
- **SoundStream** (Google, 2021);
- **EnCodec** (Meta, 2022);
- **DAC**, the Descript Audio Codec (2023).

**How they work.** Each is a convolutional encoder, a quantiser and a decoder:
- trained with reconstruction losses plus **adversarial** (GAN) losses, so the output sounds real;
- the quantiser uses **residual vector quantisation (RVQ)**: quantise with codebook 1, quantise the remaining error with codebook 2, and so on. This is like successive approximation in an ADC;
- the output is a few dozen to a few hundred frames per second.

**VAE variants** keep continuous latents instead of discrete tokens. Diffusion and flow models prefer these. SAM Audio uses a DAC-style VAE (a "DAC-VAE") at 48 kHz.

**Language models over tokens.** Treating codec tokens as language gives AudioLM and **MusicGen** (Meta audiocraft), the basis of many music generators. They don't separate, but they use the same plumbing.

## 3. Diffusion and flow matching: integrating an ODE

**Diffusion.**
- *Forward process:* add Gaussian noise step by step until the data is pure noise.
- *Training:* train a network to predict the noise, or the clean signal, at each noise level.
- *Sampling:* run the process backwards.

**Flow matching (rectified flow).** Simpler, and what SAM Audio uses.
- *Path:* draw noise x₀ and data x₁, and define the straight path x_t = (1 − t)x₀ + t·x₁.
- *Training:* regress a network v_θ(x_t, t, condition) onto the constant velocity (x₁ − x₀). This is plain least squares.
- *Sampling:* **integrate the ODE** dx/dt = v_θ(x, t, c) from t = 0 to t = 1, using Euler or midpoint steps.
  - More steps give better quality at a slower speed.
  - The step count is a direct cost and quality dial.

**Conditioning.**
- The network sees the **mixture latent** plus **prompt embeddings** (text, visual, time spans).
- *Classifier-free guidance* exaggerates the effect of the condition.

**Dieleman's insight.** Diffusion on audio works roughly *coarse-to-fine in frequency*: it is "spectral autoregression". This explains why low frequencies are usually right and high-frequency detail is where generative models improvise.

## 4. Joint embeddings: connecting text, images and sound

- **CLAP** (LAION): contrastive audio–text embeddings, the audio version of CLIP. It scores "does this audio match 'crowd cheering'?".
- **ImageBind** (Meta): one embedding space for images, audio, text and more. Its licence is **CC BY-NC-SA, non-commercial**, which is why our lab disables SAM Audio's visual ranker.
- **Uses in separation:**
  1. *Conditioning:* the prompt goes in as an embedding.
  2. *Reranking:* generate several candidates and keep the best-scoring one. This is SAM Audio's `reranking_candidates` option with CLAP plus the judge model.

## 5. Query-based separation, up to SAM Audio

**AudioSep** (2023, "Separate Anything You Describe"). Text-queried, CLAP-conditioned, mask-based: "separate whatever the sentence describes".

**SAM Audio** (Meta, December 2025, paper arXiv 2512.18099):
- *Architecture:* a diffusion transformer trained with **flow matching** on DAC-VAE latents.
- *Prompts:*
  - **text** (short English noun phrases);
  - **visual** (a masked video of the object; the `-tv` models);
  - **time spans** ("the target is active from 3.2 s to 5.0 s").
- *Outputs:* **target** and **residual**, both generated.
- *Extras:*
  - an optional span predictor;
  - a judge model for reranking.
- *Licence:* the SAM License. It allows commercial use, with conditions such as acceptable-use rules and the licence having to accompany any redistribution.

**What our lab measured:**

| Finding | Detail |
|---|---|
| Large vs small model | Large beats small by about 2–3 dB |
| Voice out of music and crowd | Works: about +6–7 dB SI-SDRi |
| Voice from voice | Weak: about 0 to +1 dB mean; identity can swap between chunks |
| Sum check | target + residual ≠ mixture; only about 7–9 dB SI-SDR against the input, because the output is generated |
| Prompt language | The text encoder (T5) turns Korean into unknown tokens, so prompts must be English; Korean *audio* separates as well as English |

**Outside evidence.** The CrowdioSet authors (live concerts, 2026) report SAM Audio at about 3.7 dB on vocals against about 10 dB for their specialist. They also note that diffusion **misalignment** depresses SDR. Treat this as one data point.

## 6. Making generative separation faithful (open problems and our angle)

- **Refinement:** use a discriminative separator first, then a diffusion model to clean up its artifacts. One 2024 paper reports gains of about +0.5 dB on music.
- **Generative-guided masking**, our differentiator 2: use the generative estimate only to build a mask, then apply it to the real mixture (lecture 05 exercise).
- **Verification:** check every output against identity embeddings (lecture 07) and prompts (CLAP or judge), and re-run where the check fails.
- **Industry signal:** Suno says its stem separation "regenerates each stem from scratch" rather than cutting up the mix. That is fine for AI-generated songs, but a red flag for wedding or podcast audio.

## Read or watch

- Neural codecs:
  - Google Research blog, *SoundStream*: https://research.google/blog/soundstream-an-end-to-end-neural-audio-codec/
  - Meta AI blog, *EnCodec*: https://ai.meta.com/blog/ai-powered-audio-compression-technique/
  - Descript Audio Codec repo: https://github.com/descriptinc/descript-audio-codec
- Generative models:
  - Meta audiocraft (MusicGen and others): https://github.com/facebookresearch/audiocraft
  - Lilian Weng, *What are diffusion models?* (the standard blog explainer): https://lilianweng.github.io/posts/2021-07-11-diffusion-models/
  - Cambridge MLG blog, *An introduction to flow matching*: https://mlg.eng.cam.ac.uk/blog/2024/01/20/flow-matching.html
  - Sander Dieleman:
    - *Diffusion is spectral autoregression*: https://sander.ai/2024/09/02/spectral-autoregression.html
    - *Generative modelling in latent space*: https://sander.ai/2025/04/15/latents.html
- Joint embeddings and query separation:
  - LAION CLAP: https://github.com/LAION-AI/CLAP
  - AudioSep repo: https://github.com/Audio-AGI/AudioSep, and paper: https://arxiv.org/abs/2308.05037
- SAM Audio:
  - project page: https://ai.meta.com/samaudio/
  - announcement: https://about.fb.com/news/2025/12/our-new-sam-audio-model-transforms-audio-editing/
  - code: https://github.com/facebookresearch/sam-audio
  - paper: https://arxiv.org/abs/2512.18099
  - press coverage (The Register): https://www.theregister.com/2025/12/16/meta_sam_ai_audio/
  - our runs: [sam-audio-first-run.md](../../../tools/separation-lab/spike-results/sam-audio-first-run.md) and [korean-speech.md](../../../tools/separation-lab/spike-results/korean-speech.md)
- Evidence on generative separation quality (papers):
  - CrowdioSet: https://arxiv.org/abs/2607.27828
  - Diffusion and consistency refinement: https://arxiv.org/abs/2412.06965

## Exercise (45 min, in the demo, no extra model loading)

1. Run one `US-2.1` clip with the small and the large model, and with and without spans.
2. Download the stems and compute SI-SDR of (target + residual) against the input. Compare it with the "mix − Σ targets" variant, which is exact by construction.
3. Listen to the silent stretches of the target. Does SAM invent anything there?
