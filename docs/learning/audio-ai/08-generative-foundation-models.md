# 08. Generative and foundation models (SAM Audio and its relatives)

A **foundation model** is one large model trained on a very broad set of data, which can then be steered to many tasks by prompts instead of being retrained. SAM Audio is a foundation model for separation. This lecture explains the parts it is built from.

## 1. Why generative models entered separation

Two families of models:
- A **discriminative** model learns to *decide or predict* something from the input. Here: mixture in, one best-guess source out.
- A **generative** model learns to *produce* new samples that look like real data.

**Discriminative separators** (lecture 06) predict the *expected* source given the mixture. Where the mixture is ambiguous, for example strong overlap, the expectation is a blurry average, heard as "watery" or "underwater" artifacts.

This is the same effect you know from least squares. A network trained with a squared-error loss learns the **conditional mean** of the answer. Suppose a mixture could have come from clean source A or from clean source B, equally likely. The best squared-error guess is (A + B) / 2, which is neither. It is the mixture of both: a blur.

**Generative separators** instead *sample* a plausible clean source from the conditional distribution p(source | mixture, prompt).
- Read p(source | mixture, prompt) as: "how likely is each possible clean source, given what we heard (the mixture) and what we asked for (the prompt)?"
- *Sampling* means drawing one answer at random according to those likelihoods. In the example it returns A *or* B, never the blur.
- Compare estimation theory: the discriminative model is like the minimum-mean-square-error estimate (the mean of the posterior), and the generative model draws a sample from the posterior.

The results:
- They sound cleaner.
- They can **invent** content: small timing shifts, re-synthesised timbre (the tone colour of a sound), filled-in gaps.
- They do not sum back to the mixture.

**This trade-off between plausible and faithful** is the main issue for our product (differentiator 2). Plausible means "sounds like a real clean source". Faithful means "is what was really in the recording".

## 2. Neural audio codecs: the latent space that generative models work in

**Why a latent space.** Raw 48 kHz audio is far too long for a transformer. Neural codecs compress it to a short sequence of latent frames.
- A **transformer** is a neural network built on *attention*: every position in the sequence looks at every other position. The cost grows with the square of the sequence length.
- Ten seconds of 48 kHz audio is 480,000 samples. Attention over that many positions is impractical.
- A **latent** is a hidden, compressed representation: a short list of numbers that summarises a stretch of audio. The **latent space** is the set of all such representations.
- Illustration with made-up numbers: if one latent frame (one vector) covers 20 ms, 10 s becomes 500 frames instead of 480,000 samples. That is easy for a transformer.
- The **frame rate of the latents** is how many latent vectors there are per second of audio.

**What "codec" means.** A codec (coder-decoder) compresses a signal and restores it. MP3 is a codec (lecture 02). A *neural* codec uses neural networks for both halves, and is trained to rebuild the input as faithfully as possible.

**The models:**
- **SoundStream** (Google, 2021);
- **EnCodec** (Meta, 2022);
- **DAC**, the Descript Audio Codec (2023).

**How they work.** Each is a convolutional encoder, a quantiser and a decoder:
- The **encoder** turns the waveform into the short latent sequence. It is a convolutional network, a stack of learned filters that slide over time.
- The **quantiser** rounds each latent vector to an entry of a **codebook**, a table of learned vectors. The entry's index is a **token**: an integer. A codebook with 1,024 entries gives 10 bits per token (illustration).
- The **decoder** turns the quantised latents back into a waveform.

Training:
- They are trained with **reconstruction losses** (how far the rebuilt audio is from the original) plus **adversarial** losses. An adversarial loss uses a GAN (generative adversarial network): a second network, the discriminator, tries to tell real audio from decoded audio, and the decoder is trained to fool it. This keeps the output sharp and realistic, so the output sounds real.

Quantiser design:
- The quantiser uses **residual vector quantisation (RVQ)**: quantise with codebook 1, quantise the remaining error with codebook 2, and so on. This is like successive approximation in an ADC (lecture 02), where each stage resolves what the previous stage left over. Every extra codebook adds detail.
- The output is a few dozen to a few hundred frames per second (the latent frame rate above).

**VAE variants** keep continuous latents instead of discrete tokens.
- A **VAE** (variational autoencoder) is an encoder-decoder pair whose encoder outputs a distribution (a mean and a spread) rather than one fixed point, with training that keeps the latent space smooth and well behaved.
- Its latents are ordinary real-valued vectors, with no rounding to a codebook.
- Diffusion and flow models (section 3) prefer these, because they add and remove continuous noise.
- SAM Audio uses a DAC-style VAE (a "DAC-VAE") at 48 kHz.

**Language models over tokens.** Treating codec tokens as language gives AudioLM and **MusicGen** (Meta audiocraft), the basis of many music generators.
- A **language model** predicts the next token from the previous ones, like phone auto-complete.
- It is **autoregressive**: it generates one token at a time and feeds each output back in as input. It is the same idea as an AR time-series model x(k) = f(x(k−1), x(k−2), …).
- They don't separate, but they use the same plumbing.

## 3. Diffusion and flow matching: integrating an ODE

**Diffusion.**
- *Forward process:* add Gaussian noise step by step until the data is pure noise. It is like heat spreading until the temperature field is flat.
- *Training:* train a network to predict the noise, or the clean signal, at each noise level. A network that does this is called a **denoiser**.
- *Sampling:* run the process backwards. Start from pure noise and remove a little noise at each step.
- The denoiser's output is tied to the **score**: the direction in which the data's probability density rises fastest (the gradient of the log probability). Each denoising step nudges the sample uphill towards likelier, more data-like signals.

**Flow matching (rectified flow).** Simpler, and what SAM Audio uses. Read each symbol:
- x₀ is a sample of pure random noise (the same shape as the data).
- x₁ is a real data sample, here the latent of a clean target sound.
- t is a progress variable from 0 (all noise) to 1 (all data).
- x_t is the point a fraction t of the way along the straight line from x₀ to x₁.
- v_θ is the neural network (θ are its trainable weights). It takes the current point x_t, the time t and the condition, and returns a **velocity**.
- "Rectified" means the paths are made straight lines.

*Path:* draw noise x₀ and data x₁, and define the straight path x_t = (1 − t)x₀ + t·x₁.
- Numerical example in 2-D: x₀ = (0, 0), x₁ = (4, 2). At t = 0.5 the point is x_t = (2, 1). It moves at constant velocity x₁ − x₀ = (4, 2).

*Training:* regress a network v_θ(x_t, t, condition) onto the constant velocity (x₁ − x₀). This is plain least squares.
- Pick a random pair (x₀, x₁) and a random t, build x_t, and minimise the squared difference ‖v_θ(x_t, t, c) − (x₁ − x₀)‖².
- Many different pairs pass through the same point x_t. So the network learns the *average* velocity at that point. Following those averaged velocities carries a cloud of noise samples onto the data distribution.

*Sampling:* **integrate the ODE** dx/dt = v_θ(x, t, c) from t = 0 to t = 1, using Euler or midpoint steps.
- This is the numerical integration you already know. The state x starts at a random noise sample. The "right-hand side" f(x, t) is the network.
- **Euler** step with step size h: x ← x + h·v_θ(x, t, c), then t ← t + h. With 4 steps, h = 0.25 and the network is called 4 times.
- **Midpoint** step (second order): evaluate the velocity, move half a step, evaluate the velocity again there, and take the full step with that second velocity. It costs two network calls per step but is more accurate.
- If all paths were straight lines, one Euler step would be exact. The averaged paths are curved, so more steps help.
  - More steps give better quality at a slower speed.
  - The step count is a direct cost and quality dial. Each step is one forward pass of the network.

**Conditioning.** *Conditioning* means giving the network extra information that steers the output.
- The network sees the **mixture latent** plus **prompt embeddings** (text, visual, time spans).
- *Classifier-free guidance* exaggerates the effect of the condition. The network is also trained with the condition sometimes removed, so it can make an unconditional prediction. At sampling time, take both velocities and extrapolate: v = v_uncond + w·(v_cond − v_uncond), with w > 1. This pushes the result harder towards the prompt, at the cost of two network calls per step.

**Dieleman's insight.** Diffusion on audio works roughly *coarse-to-fine in frequency*: it is "spectral autoregression". This explains why low frequencies are usually right and high-frequency detail is where generative models improvise.
- Real sounds have far more energy at low frequencies than at high ones.
- At a given noise level the noise buries the weak high frequencies first, while strong low frequencies still stick out.
- So the backward process settles the low frequencies first, then the next band up, and so on. It behaves like an autoregressive model that moves along the frequency axis instead of time.
- The last details, at the top, are produced from the least information, so they are the most "improvised".

## 4. Joint embeddings: connecting text, images and sound

A **joint embedding** puts different kinds of data (text, images, audio) into the same vector space (lecture 07, section 2), so their similarity can be compared directly.

**Contrastive learning** is how it is trained.
- Take a batch of matching pairs, for example (audio clip, its caption).
- Train so that matching pairs end up close and all mismatched pairs in the batch end up far apart.

- **CLAP** (LAION): contrastive audio–text embeddings, the audio version of **CLIP** (contrastive language–image pre-training, which does the same for images and captions). It scores "does this audio match 'crowd cheering'?". The score is the cosine similarity between the audio embedding and the text embedding.
- **ImageBind** (Meta): one embedding space for images, audio, text and more. Its licence is **CC BY-NC-SA, non-commercial**, which is why our lab disables SAM Audio's visual ranker.
  - **CC BY-NC-SA** is Creative Commons Attribution-NonCommercial-ShareAlike. You may reuse the work if you credit the author (BY), you do not use it commercially (NC), and you share derived work under the same licence (SA).
  - The *visual ranker* is the part of SAM Audio that uses ImageBind to score candidate outputs against the video.
- **Uses in separation:**
  1. *Conditioning:* the prompt goes in as an embedding.
  2. *Reranking:* generate several candidates and keep the best-scoring one. This is SAM Audio's `reranking_candidates` option with CLAP plus the **judge model**, a separate network trained to score how well an output matches the prompt and how good it sounds.

## 5. Query-based separation, up to SAM Audio

**Query-based separation** means you give a *query*, a description of the sound you want, and the model returns just that sound. The research name for the text version is **LASS** (language-queried audio source separation).

**AudioSep** (2023, "Separate Anything You Describe"). Text-queried, CLAP-conditioned, mask-based: "separate whatever the sentence describes".
- *Mask-based* means the model predicts a 0-to-1 mask over the mixture's spectrogram (lecture 05). It can only remove, never invent.

**SAM Audio** (Meta, December 2025, paper arXiv 2512.18099):
- *Architecture:* a diffusion transformer (**DiT**: a transformer used as the denoiser / velocity network) trained with **flow matching** on DAC-VAE latents.
- *Prompts:*
  - **text** (short English noun phrases, such as "dog barking");
  - **visual** (a masked video of the object, meaning the object's pixels are outlined in each frame; the `-tv` models);
  - **time spans** ("the target is active from 3.2 s to 5.0 s").
- *Outputs:* **target** and **residual**, both generated. The target is the sound you asked for. The residual is everything else.
- *Extras:*
  - an optional span predictor, a model that guesses the time spans where the target is active;
  - a judge model for reranking.
- *Licence:* the SAM License. It allows commercial use, with conditions such as acceptable-use rules (a list of forbidden uses) and the licence having to accompany any redistribution (anyone you pass the model on to must also receive the licence).

**What our lab measured:**

| Finding | Detail |
|---|---|
| Large vs small model | Large beats small by about 2–3 dB |
| Voice out of music and crowd | Works: about +6–7 dB SI-SDRi |
| Voice from voice | Weak: about 0 to +1 dB mean; identity can swap between chunks |
| Sum check | target + residual ≠ mixture; only about 7–9 dB SI-SDR against the input, because the output is generated |
| Prompt language | The text encoder (T5) turns Korean into unknown tokens, so prompts must be English; Korean *audio* separates as well as English |

How to read the table:
- **SI-SDR** is a score in dB of how close an output is to the reference, ignoring volume. Higher is better. SI-SDRi is the improvement over the unprocessed mixture (lecture 07, section 4). SDR is the older version without scale invariance.
- An improvement of +6–7 dB means the ratio of error energy to wanted-signal energy has fallen by a factor of about 4 to 5 compared with the raw mixture (10 dB is a factor of 10).
- **Sum check:** a perfect separation would add back to the input exactly. Here target + residual lands only 7–9 dB (SI-SDR) from the input, so it is not an exact copy. The cause is that both outputs are generated rather than cut from the mix.
- **T5** is a Google text model. Its *text encoder* turns a prompt into embeddings. First it splits the text into pieces from a fixed vocabulary, and anything outside the vocabulary becomes an **unknown token**, a placeholder that carries no meaning. For Korean text, the prompt arrives as a string of placeholders.

**Outside evidence.** The CrowdioSet authors (live concerts, 2026) report SAM Audio at about 3.7 dB on vocals against about 10 dB for their specialist. They also note that diffusion **misalignment** depresses SDR. Treat this as one data point.
- **CrowdioSet** is a dataset of live-concert recordings.
- *Misalignment* means the generated output is shifted by a small amount of time against the reference. SDR compares sample by sample, so even a slight shift counts as error even if it sounds fine.

## 6. Making generative separation faithful (open problems and our angle)

- **Refinement:** use a discriminative separator first, then a diffusion model to clean up its artifacts. One 2024 paper reports gains of about +0.5 dB on music.
- **Generative-guided masking**, our differentiator 2: use the generative estimate only to build a mask, then apply it to the real mixture (lecture 05 exercise).
  - A mask can only turn parts of the real recording down. It cannot add sounds that were never there, so the result stays faithful.
- **Verification:** check every output against identity embeddings (lecture 07) and prompts (CLAP or judge), and re-run where the check fails.
- **Industry signal:** Suno says its stem separation "regenerates each stem from scratch" rather than cutting up the mix. (A **stem** is one instrument group's track: vocals, drums, and so on.) That is fine for AI-generated songs, but a red flag for wedding or podcast audio.

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
2. Download the stems and compute SI-SDR of (target + residual) against the input. Compare it with the "mix − Σ targets" variant, which is exact by construction (the residual is defined as the mix minus the targets, so the sum is the mix by definition).
3. Listen to the silent stretches of the target. Does SAM invent anything there?
