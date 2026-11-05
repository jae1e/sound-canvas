# 06. Deep learning for separation

Deep learning means fitting a large, flexible function (a neural network with millions of parameters) to data. For separation, the function takes a mixture and outputs the sources. Instead of hand-coding priors as in lecture 05, we let the data supply them.

## 1. The supervised recipe

**Supervised learning** means learning from examples of input and desired output. It is regression: choose the parameters that minimise the error between the model's output and the known right answer, over a big training set. Here the input is a mixture and the right answer is the true stems.

**Data.**
- Collect isolated stems.
- Create training mixtures on the fly by **randomly remixing** stems: stems from different songs, random gains, channel swaps (left and right exchanged), pitch and tempo shifts.
- This is **augmentation**: making many new training examples from a few real ones by applying changes that keep the label valid. In image work it is the random flips and crops you already know.
- Remixing creates a huge number of mixtures from a few hundred songs. It is the most important trick in the field.

**Model.** Map the mixture to either:
- a **mask** per source (spectrogram models). The network predicts, for every time-frequency bin, the fraction (0 to 1) that belongs to the source, as in lecture 05. The mask is multiplied with the mixture's spectrogram, and the result is inverted to a waveform; or
- the source **waveforms** directly (time-domain models). The network outputs the samples. No mask and no separate phase handling are needed.

**Loss functions.** The loss is the single number that measures how wrong the output is. Training adjusts the weights to reduce it, by gradient descent.
- **L1** or **L2** on magnitudes or waveforms. L1 is the mean absolute difference, mean |a − b|. L2 is the mean squared difference, mean (a − b)², the least-squares error you know. L1 is less dominated by a few large errors.
- **Negative SI-SDR** (lecture 05). Minimising the negative of a score is the same as maximising the score.
- A **multi-resolution STFT loss**: compare the spectrograms of the output and the true source with several window sizes at once, for example 512, 1024 and 2048 samples.
  - Why: a short window gives sharp timing but blurry frequency, and a long window gives sharp frequency but blurry timing. This is the time-frequency trade-off from lecture 03, the same as the uncertainty trade-off in vibration signal analysis.
  - Using several window sizes penalises errors at all of these scales.

**Inference.** Inference means running the trained model on new data.
- Long files do not fit in memory at once. They are processed in **overlapping chunks** (for example 10-second pieces that overlap) and **crossfaded**: in the overlap, one chunk fades out while the next fades in, so there are no clicks at the joins. This is exactly what our lab does with SAM Audio.
- Test-time tricks that improve quality at the cost of compute:
  - The **shift trick**: shift the input by a few samples, separate, shift the output back, and average over several shifts. It is like averaging repeated measurements to cut random error.
  - **Ensembles**: run several different models and average their outputs.

**For a computer-vision person:** spectrogram separation is **image-to-image regression**, essentially semantic segmentation with soft labels. Masks are per-pixel source probabilities. Many architectures came straight from vision.

## 2. How the architectures evolved

An **architecture** is the wiring diagram of the network: which layers there are and how they connect.

| Year | Model (who) | Idea | Why it mattered |
|---|---|---|---|
| 2017 | U-Net for singing voice (Spotify research) | Image U-Net on magnitude spectrograms | Showed CV architectures transfer to audio |
| 2019 | **Spleeter** (Deezer) | U-Net; 2, 4 or 5 stems; MIT licence; very fast | Put separation into every karaoke app and DAW plugin |
| 2019 | **Open-Unmix** (Inria and Sony) | BiLSTM on magnitudes plus a multichannel Wiener post-filter | Clean reference implementation for research |
| 2018–19 | Wave-U-Net, **Conv-TasNet** | Time domain: a *learned* encoder and decoder replace the STFT | Beat the ideal magnitude masks on speech; solved phase |
| 2019–21 | **Demucs** to **Hybrid Demucs** (Meta) | Waveform U-Net with an LSTM, then two branches (waveform and spectrogram) | Best open music model for years |
| 2022 | **HTDemucs** (Meta) | Hybrid with a cross-domain transformer between branches | Strong, widely used, small enough for laptops |
| 2022 | **BSRNN** (band-split RNN) | Split the spectrum into sub-bands, model each band and the interactions across bands | Band-splitting became the winning pattern |
| 2023 | **BS-RoFormer** (ByteDance) | Band-split plus transformers with rotary position embeddings, alternating attention over time and over bands | Ranked first in the Sound Demixing Challenge 2023 music track (per the paper); still the backbone of the leaderboards |
| 2023–24 | **Mel-RoFormer**, SCNet | Mel-scale overlapping bands; a sparse compression network | Small improvements; community fine-tunes build on these |

**Terms in the table, one by one.**
- **U-Net:** a network shaped like the letter U. The left side shrinks the image step by step (to see wide context), the right side enlarges it back (to restore detail), and **skip connections** copy the fine detail across from left to right. It was invented for medical image segmentation, which is why it transfers from vision. The output has the same size as the input, which is what a mask needs.
- **Spleeter:** an open-source separator from Deezer, a music streaming company. **Karaoke** apps remove the vocals from songs. A **DAW plugin** is an add-on inside a digital audio workstation (the mixing software from lecture 04). **MIT licence** is a permissive open-source licence: anyone may use and modify the code, including commercially.
- **RNN and LSTM:** a **recurrent neural network (RNN)** reads a sequence one step at a time and carries a hidden state forward, like a state-space model x_{k+1} = f(x_k, u_k) with a learned f. A **long short-term memory (LSTM)** is an RNN with gates that learn what to remember and what to forget, so it can keep information over long stretches. A **BiLSTM** (bidirectional LSTM) runs one LSTM forward in time and one backward and joins them, so each frame sees both past and future. That needs the whole clip, so it cannot run live.
- **Open-Unmix:** a reference separation model from Inria (a French research institute) and Sony. "Post-filter" means a processing step after the network; here the multichannel Wiener filter from lecture 05.
- **Wave-U-Net:** a U-Net that works directly on the raw waveform (one-dimensional) instead of a spectrogram.
- **Conv-TasNet** (convolutional time-domain audio separation network):
  - The STFT is a fixed set of sinusoid filters. Conv-TasNet instead uses a **learned encoder**: a convolution layer whose filters are learned from data. It turns the waveform into a feature grid, a mask is applied in that learned space, and a **decoder** converts back to a waveform.
  - Because it never splits the signal into magnitude and phase, there is no separate phase problem. This is what "solved phase" refers to.
  - "Beat the ideal magnitude masks" means its output scored better than the oracle-mask upper bound from lecture 05, which keeps the mixture's phase.
- **Demucs** (Deep Extractor for Music Sources) and **Hybrid Demucs**: Demucs is a waveform U-Net with an LSTM in the middle. Hybrid Demucs has two U-Nets side by side, one on the waveform and one on the spectrogram, and combines their outputs. **Meta** is the company that released them.
- **Transformer:** a network built from **attention** layers.
  - **Attention** lets every element of a sequence compute a weighted average over all other elements, with weights learned from content. Any two positions can interact directly, however far apart. The cost grows with the square of the sequence length.
  - A **cross-domain transformer** in HTDemucs lets the waveform branch and the spectrogram branch exchange information.
- **BSRNN** (band-split RNN): split the spectrogram into frequency bands, apply a small encoder to each, then run RNNs along time within a band and across bands.
- **RoFormer / RoPE:** attention does not know the order of elements by itself, so a **position embedding** adds that information. **Rotary position embedding (RoPE)** encodes position by rotating pairs of features by an angle proportional to the position. This makes attention depend on the *relative* distance between two elements. BS-RoFormer applies it to a grid with one axis for time and one for bands, and alternates attention along each axis. In vision this is called axial attention.
- **Mel scale:** a frequency scale that follows pitch perception: roughly linear below 1 kHz and logarithmic above. **Mel-RoFormer** uses bands that follow this scale and overlap.
- **SCNet** (sparse compression network): a lighter network that compresses the frequency axis band by band.
- **Sound Demixing Challenge (SDX):** a competition in which teams separate hidden test songs and are ranked. A **leaderboard** is the public ranking from such a test.
- **Fine-tune:** to continue training an existing trained model on extra or different data. A community **fine-tune** starts from a released model and adapts it. Fine-tuning needs far less compute than training from scratch.

**Why band-splitting works.**
- Different frequency regions have different statistics: bass fundamentals around 100 Hz, vocal **formants** around 1–3 kHz, cymbals above 8 kHz. (Formants are the resonance peaks of the vocal tract that shape vowels, like the modes of a tube.)
- Splitting lets the model spend capacity per band and then reason across bands.
- It mirrors the ear's **critical bands** (lecture 01): the ear analyses sound in a set of frequency bands that are narrow at low frequencies and wide at high frequencies.

**Where the state of the art is now** (2026, see our research note [separation_tech_sota.md](../../market-studies/audio-video-separation/research-notes/separation_tech_sota.md)). "State of the art" means the best published or available results.
- Community-trained RoFormer variants and ensembles lead public leaderboards such as MVSEP, at roughly 12 dB SDR for vocals on its multi-song set. SDR is the signal-to-distortion ratio from lecture 05, in dB.
- Gains are now fractions of a dB per year. **Fixed-stem quality is close to saturated** as a differentiator.

## 3. Cinematic and dialogue separation

- **The Cocktail Fork Problem** (MERL, 2021) defined the **dialogue / music / effects** task with the **DnR** (Divide and Remaster) dataset. MERL is Mitsubishi Electric Research Laboratories. The name extends the "cocktail party problem" (hearing one voice among many) from two kinds of source to three: a "fork" has three prongs. DnR is the academic counterpart of the **DME** (dialogue, music, effects) separation that Gaudio and AudioShake sell (lecture 04).
- Sound Demixing Challenge 2023 had a cinematic track alongside the music track.
- Speech separation (speaker against speaker) has its own lineage; see lecture 07.

## 4. Limits of fixed-stem models: why prompt models appeared

**What fixed stems cannot do.** A model trained for {vocals, drums, bass, other} cannot answer:
- "the second guitar";
- "the woman on the left";
- "the dog barking".

Each new stem type needs new isolated training data.

**The data problem is also a licence problem.**
- **MUSDB18** (a standard set of 150 songs with four stems each) and **MoisesDB** (a larger set with finer instrument labels) are **non-commercial**: the licence forbids commercial use.
- Many popular community **weights** were trained on them. Weights are the learned numbers inside a trained model; a "weights file" is the model itself.
- Commercial vendors (AudioShake says so explicitly) license their training data.
- Where the data came from and what you may do with it is called **provenance** and **licensing**. Customers in media ask about it, because a model trained on data it should not have used is a legal risk.

**Query-conditioned models** answer the first problem. They take a **prompt** (a text description or an example) and separate "whatever the prompt describes". Text-queried models such as AudioSep came first, and then SAM Audio (lecture 08).

## Read or watch

- ISMIR 2020 tutorial, the "deep learning approaches" chapters, with code: https://source-separation.github.io/tutorial/
- Open-Unmix website, with an architecture explainer and audio demos: https://sigsep.github.io/open-unmix/
- Spleeter repo: https://github.com/deezer/spleeter
- Demucs repo (its README is a good architecture history): https://github.com/adefossez/demucs
- PyTorch tutorial, *Music source separation with Hybrid Demucs* (runnable): https://docs.pytorch.org/audio/stable/tutorials/hybrid_demucs_tutorial.html
- Community tooling, to see what practitioners use:
  - ZFTurbo, *Music Source Separation Training*: https://github.com/ZFTurbo/Music-Source-Separation-Training
  - Ultimate Vocal Remover GUI: https://github.com/Anjok07/ultimatevocalremovergui
  - MVSEP quality checker (leaderboard): https://mvsep.com/quality_checker/
  - BS-RoFormer reference implementation (lucidrains): https://github.com/lucidrains/BS-RoFormer
- Papers, if you want the source (each is short and has figures):
  - BSRNN: https://arxiv.org/abs/2209.15174
  - BS-RoFormer: https://arxiv.org/abs/2309.02612
  - Mel-RoFormer: https://arxiv.org/abs/2310.01809
  - HTDemucs: https://arxiv.org/abs/2211.08553
  - Conv-TasNet: https://arxiv.org/abs/1809.07454
  - The Cocktail Fork Problem (DnR): https://arxiv.org/abs/2110.09958

## Exercise (1 h)

Run the PyTorch Hybrid Demucs tutorial on a lab music clip (`US-6.1` or `US-7.1`) and compare it with SAM Audio's text prompt in the demo.

**Before you run anything:**
- Use a separate venv (a virtual environment: an isolated set of Python packages, so installs do not break other projects).
- Run it while the demo is idle, inside a capped scope: `systemd-run --user --scope -p MemoryMax=8G -p MemorySwapMax=0 python ...`.
  - `systemd-run --scope` starts the program in a Linux resource-limited group.
  - `MemoryMax=8G` caps its RAM at 8 GiB. `MemorySwapMax=0` forbids it from spilling to disk swap.
  - On a shared machine, a runaway job then gets stopped by itself instead of exhausting memory (an out-of-memory, or OOM, kill) and taking other work down.
- Run one GPU job at a time.

**Questions to answer:**
1. Which output is cleaner for standard stems?
2. Which can do "the lead guitar only"?
3. Which output adds back up to the mixture? Check with SI-SDR of Σ outputs against the mix.
