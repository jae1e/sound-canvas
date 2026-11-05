# 06. Deep learning for separation

## 1. The supervised recipe

**Data.**
- Collect isolated stems.
- Create training mixtures on the fly by **randomly remixing** stems: stems from different songs, random gains, channel swaps, pitch and tempo shifts.
- Remixing creates a huge number of mixtures from a few hundred songs. It is the most important trick in the field.

**Model.** Map the mixture to either:
- a **mask** per source (spectrogram models), or
- the source **waveforms** directly (time-domain models).

**Loss functions:**
- L1 or L2 on magnitudes or waveforms;
- negative SI-SDR;
- a **multi-resolution STFT loss** (spectral losses at several window sizes, which addresses the time-frequency trade-off from lecture 03).

**Inference.**
- Long files are processed in overlapping chunks and crossfaded, exactly as our lab does with SAM Audio.
- Test-time tricks: the "shift trick" (average predictions over small time shifts) and ensembles of several models.

**For a computer-vision person:** spectrogram separation is **image-to-image regression**, essentially semantic segmentation with soft labels. Masks are per-pixel source probabilities. Many architectures came straight from vision.

## 2. How the architectures evolved

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

**Why band-splitting works.**
- Different frequency regions have different statistics: bass fundamentals around 100 Hz, vocal formants around 1–3 kHz, cymbals above 8 kHz.
- Splitting lets the model spend capacity per band and then reason across bands.
- It mirrors the ear's critical bands (lecture 01).

**Where the state of the art is now** (2026, see our research note [separation_tech_sota.md](../../market-studies/audio-video-separation/research-notes/separation_tech_sota.md)):
- Community-trained RoFormer variants and ensembles lead public leaderboards such as MVSEP, at roughly 12 dB SDR for vocals on its multi-song set.
- Gains are now fractions of a dB per year. **Fixed-stem quality is close to saturated** as a differentiator.

## 3. Cinematic and dialogue separation

- **The Cocktail Fork Problem** (MERL, 2021) defined the **dialogue / music / effects** task with the **DnR** dataset. It is the academic counterpart of the DME separation that Gaudio and AudioShake sell.
- Sound Demixing Challenge 2023 had a cinematic track alongside the music track.
- Speech separation (speaker against speaker) has its own lineage; see lecture 07.

## 4. Limits of fixed-stem models: why prompt models appeared

**What fixed stems cannot do.** A model trained for {vocals, drums, bass, other} cannot answer:
- "the second guitar";
- "the woman on the left";
- "the dog barking".

Each new stem type needs new isolated training data.

**The data problem is also a licence problem.**
- MUSDB18 and MoisesDB are **non-commercial**.
- Many popular community weights were trained on them.
- Commercial vendors (AudioShake says so explicitly) license their training data.

**Query-conditioned models** answer the first problem. They separate "whatever the prompt describes": text-queried models such as AudioSep, and then SAM Audio (lecture 08).

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
- Use a separate venv.
- Run it while the demo is idle, inside a capped scope: `systemd-run --user --scope -p MemoryMax=8G -p MemorySwapMax=0 python ...`.
- Run one GPU job at a time.

**Questions to answer:**
1. Which output is cleaner for standard stems?
2. Which can do "the lead guitar only"?
3. Which output adds back up to the mixture? Check with SI-SDR of Σ outputs against the mix.
