# 05. Classical separation and how separation is measured

"Classical" here means methods designed by hand with signal processing and statistics, before neural networks took over. They are still worth learning because (a) neural separators reuse their ideas, (b) their formulas are the basis of the evaluation metrics, and (c) several are cheap and still used as building blocks.

## 1. The problem statement

**Mixing models.** A **mixture** x is what the microphone hears. The sources are s₁, s₂, … (voice, guitar, crowd). There are three common ways to write how they combine:
- **Instantaneous mixing:** x(t) = Σᵢ sᵢ(t). The sources just add, sample by sample. This is the simplest model, like a studio mixer summing tracks.
- **Convolutive mixing** (rooms): x(t) = Σᵢ (hᵢ * sᵢ)(t).
  - hᵢ is the room impulse response from source i to the microphone, and * is convolution.
  - Each source reaches the mic through a different path, with delays and echoes. This is the linear-system model you know: output = impulse response convolved with input.
- **Multiple microphones:** one such equation per microphone. Together they form a matrix of filters, one filter per (source, microphone) pair.

**Underdetermined.** A problem is underdetermined when there are fewer equations than unknowns.
- Example: a stereo file has 2 channels, so 2 measured numbers per time sample. With 3 sources there are 3 unknowns per sample. Two equations with three unknowns have infinitely many solutions.
- Any solution needs **priors**: assumptions about what the sources look like, used to pick one answer from the infinite set. A prior is the same idea as the regulariser in a least-squares problem, or the prior in Bayesian estimation.
- Classical methods hand-code these priors (for example "sources are sparse" or "the accompaniment repeats"). Neural networks learn them from data (lecture 06).

## 2. Time-frequency masking: the main idea

**STFT and the spectrogram.** To see which source is active at which moment and frequency, we use the **short-time Fourier transform (STFT)**.
- Cut the signal into short overlapping windows (for example 32 ms).
- Take a Fourier transform of each window.
- The result X(m,k) is a grid of complex numbers. m is the **frame** (time) index and k is the frequency **bin**: one narrow slot of the Fourier transform. Each bin has a **magnitude** (how strong) and a **phase** (the timing offset of the sinusoid).
- The magnitude plotted as an image is the **spectrogram**: time on the x axis, frequency on the y axis. Treat it like a picture, which is why computer-vision methods carry over.

**Sparsity.** In the STFT domain, speech and music are **sparse**: in most time-frequency bins one source dominates and the others are nearly zero. This is called **W-disjoint orthogonality** ("W" stands for the window used by the STFT; "disjoint" means the sources occupy different bins).
- Analogy: in modal analysis, different modes sit at different frequency lines. Here different sources mostly sit in different bins.
- So you can separate by deciding, bin by bin, how much of each source is present. That amount is a **mask** Mᵢ, a number between 0 and 1 for every bin:

  Ŝᵢ(m,k) = Mᵢ(m,k) · X(m,k),  0 ≤ Mᵢ ≤ 1.

- Here Ŝᵢ is the estimated spectrogram of source i (the hat means "estimate"), and X is the mixture's STFT. Multiplying keeps the bins that belong to source i and turns down the others. An inverse STFT then gives back a waveform, usually reusing the mixture's phase.
- It is like a per-pixel soft segmentation of the spectrogram image.

**Oracle masks.** An **oracle** is a method that is allowed to cheat by looking at the true answer. An oracle mask is computed from the true stems, which you would not have in real use. It therefore gives an **upper bound** for any masking method: no real masking system can do better than the best mask. In the table, S is the true source and N is everything else (noise or the other sources) in that bin.

| Mask | Formula |
|---|---|
| Ideal binary mask (IBM) | M = 1 if \|S\| > \|N\| else 0 |
| Ideal ratio mask (IRM) | M = \|S\|² / (\|S\|² + \|N\|²) |

- **IBM:** a hard yes/no decision per bin. The bin goes entirely to whichever side is louder.
- **IRM:** a soft fraction between 0 and 1, the share of the bin's power that belongs to the source.
- Example: in one bin |S| = 3 and |N| = 1. IBM = 1. IRM = 9 / (9 + 1) = 0.9. In another bin |S| = 1 and |N| = 2: IBM = 0 and IRM = 1 / (1 + 4) = 0.2.

The IRM is the per-bin **Wiener filter**.

**The Wiener filter, in the language you know.**
- Suppose source and noise are uncorrelated Gaussian processes (random signals with no linear relationship between them) with **power spectra** P_s and P_n.
  - A power spectrum, or **power spectral density (PSD)**, says how a random signal's power is spread over frequency. It is the PSD plot you get from a vibration measurement.
- Then the **minimum-mean-square-error (MMSE)** linear estimate of the source is the one that makes the average squared error as small as possible. It is

  H(f) = P_s(f) / (P_s(f) + P_n(f)).

- In words: H is the gain applied to frequency f. Where the source is much stronger than the noise (P_s ≫ P_n), H ≈ 1 and the signal passes. Where the noise dominates, H ≈ 0 and the signal is blocked. Example: P_s = 9, P_n = 1 gives H = 0.9.
- It is the frequency-domain cousin of the Kalman filter. Both blend a prediction with a measurement, weighting by how reliable each is, and minimise the mean-square error.
- Every separator that predicts "how much of this bin is source i" is estimating P_s and P_n.
- Open-Unmix's *multichannel Wiener filter* post-processing applies the same idea using stereo **covariances**. For each bin, a small matrix (2×2 for stereo) describes how the left and right channels relate. Open-Unmix is a separation model from lecture 06.

**Spectral subtraction.** A crude ancestor of the Wiener filter:
1. estimate the noise spectrum during pauses;
2. subtract it from every frame;
3. clamp the result at zero (a magnitude cannot be negative).

Example: if the noise estimate in a bin is 2 and the frame's magnitude is 5, the result is 3. If the frame's magnitude is 1, the result is −1, which is clamped to 0.

The estimate is never exact, so some bins end up slightly above zero for a single frame and then vanish. The leftover isolated peaks sound like **"musical noise"**: short random tonal blips, the chirpy, bubbly artifact still heard from poor denoisers.

## 3. NMF: modal decomposition with a non-negativity constraint

**Factorisation.** **NMF** is **non-negative matrix factorization**. Factor the magnitude spectrogram V (frequency × time, all entries ≥ 0) as **V ≈ W H**, a product of two smaller non-negative matrices:
- the columns of W are **spectral templates** (a note, a drum hit, a phoneme class): fixed spectral shapes;
- the rows of H are their **activations** over time: how loudly each template plays at each moment;
- the non-negativity of both makes the parts additive, which matches how sound energy adds. Nothing can cancel, unlike in PCA or a Fourier series where positive and negative terms cancel.
- Analogy: in modal analysis, a response is a sum of mode shapes times time-varying amplitudes. NMF is the same, with the extra rule that all numbers are non-negative.
- Example sizes: a spectrogram with 513 frequency bins and 1,000 frames has 513,000 numbers. With K = 10 templates, W and H together hold 513·10 + 10·1000 = 15,130 numbers. That compression is only possible because the spectrogram is built from a few repeated spectral shapes.

**Solving it.** We need W and H such that WH is close to V. "Close" is measured by a **divergence**, a distance-like measure that need not be symmetric.
- **Kullback–Leibler (KL) divergence:** Σ (V log(V/WH) − V + WH). It comes from statistics and weights errors in loud bins more.
- **Itakura–Saito (IS) divergence:** Σ (V/WH − log(V/WH) − 1). It was designed for speech and is scale-invariant: it treats a quiet bin and a loud bin by relative error, which suits the way audio spans a huge dynamic range. It is normally applied to the power spectrogram.
- Lee and Seung's **multiplicative updates** minimise the divergence by repeating two update steps, one for H and one for W. The divergence is usually KL or IS. The formulas below are the KL version:

  H ← H ⊙ (Wᵀ(V ⊘ WH)) ⊘ (Wᵀ1),  W ← W ⊙ ((V ⊘ WH)Hᵀ) ⊘ (1Hᵀ)

- Symbols: ⊙ is element-by-element multiplication, ⊘ is element-by-element division, ᵀ is transpose, and 1 is a matrix of all ones with the same shape as V.
- What it does: V ⊘ WH is the ratio of the real spectrogram to the current model. If a bin of the model is too small, the ratio is above 1 and the update raises H and W there. If too large, the ratio is below 1 and they are lowered.
- Why "multiplicative": every entry is multiplied by a positive factor, so starting from positive numbers they stay non-negative, and no step size is needed. It is gradient descent with a step size chosen so that the update becomes a multiplication.

**Separation with NMF.**
1. Assign templates to sources, for example templates learned beforehand on clean piano and clean voice ("supervised NMF"). Supervised means the templates W come from clean training audio. On the mixture you then solve only for the activations H.
2. Build Wiener-like masks: Mᵢ = WᵢHᵢ / WH. Here WᵢHᵢ is the part of the model explained by source i's templates, and WH is the whole model. The ratio is again "share of this bin that belongs to source i".

**Limits.** NMF is great for teaching and for repetitive music. It struggles with voices whose spectra vary continuously, because a voice does not have a few fixed spectral shapes. It was the leading approach around 2010.

## 4. Structure-based tricks

- **HPSS (harmonic–percussive source separation):**
  - Harmonic sounds have energy at a fundamental frequency and its integer multiples (a Fourier series). In a spectrogram they draw **horizontal** lines (stable pitch).
  - Percussive hits are short and contain all frequencies at once (the Fourier transform of an impulse is flat). They draw **vertical** lines (broadband, short).
  - A **median filter** replaces each pixel by the median of its neighbours in a window. It removes spikes that are narrower than the window and keeps long smooth features.
  - A median filter along time keeps horizontal lines and removes vertical clicks, so it enhances the harmonic part. One along frequency does the opposite and enhances the percussive part. Masks follow from comparing the two (Fitzgerald 2010).
  - It is cheap and still used as a feature and pre-step.
- **REPET** (REpeating Pattern Extraction Technique): music accompaniment repeats (loops, bars). A vocal does not repeat in the same way.
  - Find the period by **autocorrelation**: compare the signal with delayed copies of itself. The correlation peaks when the delay equals the repeat period.
  - Average the repeats to model the background (the accompaniment). The non-repeating rest is the vocal.
- **Pitch-based:** track f₀ (the fundamental frequency, the pitch) and keep its harmonics (the integer multiples). This works for one clean melody and breaks down with chords or with several singers, because harmonics of different notes overlap.

## 5. Spatial methods (2 or more microphones)

These use the fact that sources sit at different positions, so they reach each microphone with different levels and delays.

**DUET** (Degenerate Unmixing Estimation Technique). For two mics, compute the inter-channel **level ratio** and **phase (time) difference** in every bin, plot their 2-D histogram, and cluster the peaks. Each peak is a source at a different direction.
- A source off to one side is louder in one channel and arrives earlier at one mic. For a time delay τ, the phase difference at frequency f is 2πfτ.
- Because of sparsity (section 2), each bin belongs to mostly one source, so each bin votes for one direction.
- This is a direct use of the stereo information SAM Audio discards (lecture 02).
- It is very relevant to studio mixes with panned instruments, where the "direction" is the pan setting.

**Beamforming.** With mic arrays (meeting rooms, smart speakers), steer a spatial filter towards a direction. It is the same idea as a phased-array antenna or an accelerometer array.
- **Delay-and-sum:** delay each mic's signal so that a wave from the target direction lines up in all channels, then add. The target adds up in phase while sounds from other directions partly cancel.
- **MVDR** (minimum variance distortionless response): choose the filter weights that minimise the output power (mostly noise and interference) subject to the constraint that the gain towards the target direction stays exactly 1. This is a constrained least-squares problem solved with a Lagrange multiplier.

**ICA (independent component analysis).** It finds an unmixing matrix that makes the outputs statistically independent, using the fact that real sources are independent and non-Gaussian. It needs at least as many mics as sources, so it rarely applies to consumer content, which usually has only one or two channels.

## 6. Metrics: how "good" is measured

All the metrics below compare an estimate to the truth. Most of them need the true stems, so they are used on test sets where stems exist.

**SI-SDR (scale-invariant signal-to-distortion ratio).** This is the metric our lab uses. "Signal-to-distortion ratio" is the energy of the wanted signal divided by the energy of the error, in decibels. With s the true source and ŝ the estimate (both zero-mean, meaning the average value has been subtracted):

  s_target = (⟨ŝ, s⟩ / ‖s‖²) · s,  e = ŝ − s_target,  **SI-SDR = 10 log₁₀(‖s_target‖² / ‖e‖²)**

- Symbols: ⟨ŝ, s⟩ is the inner product (dot product) of the two signals as vectors, and ‖·‖² is the signal's energy. Sources are treated as long vectors of samples.
- s_target is the projection of ŝ onto s. The factor ⟨ŝ, s⟩/‖s‖² is the least-squares gain that scales s to best match ŝ. Whatever is left, e, is the error.
- So SI-SDR is the ratio of "the part that matches the truth" to "everything else", on a dB scale. A ratio of 10 gives 10 dB, a ratio of 100 gives 20 dB.
- It is a projection, so a global gain error is not penalised. Example: an estimate that is a perfect copy but twice as loud has e = 0, so SI-SDR is infinite. Plain SDR (no projection) would give 0 dB, because the error would equal the source.
- **SI-SDRi** is the improvement over just using the mixture as the estimate: SI-SDR(estimate) − SI-SDR(mixture). It is the number to report, because it says how much the separator helped.
- Rough feel: +3 dB is audible, +10 dB is good, +15 dB or more is close to clean.
- Our Korean test, for example: a voice out of music plus crowd improved by +7.0 dB, while voice-from-voice improved by about 0 to +1 dB.

**BSSEval SDR, SIR and SAR.** BSSEval (Blind Source Separation Evaluation) is the music-separation standard (`museval`, the Python package that computes it, and the MUSDB leaderboards). A **leaderboard** is a public ranking of systems scored on the same test set. BSSEval decomposes the error into:
- **interference**, other sources leaking in, measured by **SIR** (source-to-interference ratio);
- **artifacts**, invented or distorted sound, measured by **SAR** (source-to-artifacts ratio).

The overall **SDR** (source-to-distortion ratio) combines all error types. The decomposition is diagnostic: a model can score a high SIR but a low SAR (clean but "watery", with a bubbly, underwater texture).

**Speech metrics.**
- **PESQ** (Perceptual Evaluation of Speech Quality) estimates the quality a listener would hear by comparing to a clean reference. It was designed for phone-call quality.
- **POLQA** (Perceptual Objective Listening Quality Analysis) is its newer successor.
- **STOI** (Short-Time Objective Intelligibility) estimates how well the words can be understood, from 0 to 1.
- **DNSMOS** (Deep Noise Suppression Mean Opinion Score) is a neural network that predicts how people would rate the audio, without needing a clean reference.
- **MOS** (mean opinion score) is the underlying idea: listeners rate quality from 1 to 5 and you average the ratings.

**Listening tests.**
- **MUSHRA** (MUltiple Stimuli with Hidden Reference and Anchor) is a test where a listener rates several versions on a 0–100 scale. One of them is the hidden true reference and another is a deliberately degraded anchor, which keeps the ratings honest.
- **A/B preference:** the listener hears two versions and picks the better one.
- Metrics disagree with ears, especially for **generative** outputs. A generative model synthesises new sound instead of filtering the mixture. A perfectly plausible but slightly time-shifted output can score poorly on SDR, because SDR compares waveforms sample by sample.
- See *SDR — half-baked or well done?* (paper), and the CrowdioSet authors' caution in lecture 08.

## Read or watch

- ISMIR 2020 tutorial, *Open-Source Tools & Data for Music Source Separation*, for the masking, evaluation and classical-methods chapters: https://source-separation.github.io/tutorial/
- FMP notebooks, chapter 8 (decomposition), in particular:
  - HPSS: https://www.audiolabs-erlangen.de/resources/MIR/FMP/C8/C8S1_HPS.html
  - NMF basics: https://www.audiolabs-erlangen.de/resources/MIR/FMP/C8/C8S3_NMFbasic.html
  - Chapter overview: https://www.audiolabs-erlangen.de/resources/MIR/FMP/C8/C8.html
- Le Roux et al., *SDR — half-baked or well done?* (paper, short and readable; the source of SI-SDR): https://arxiv.org/abs/1811.02508
- `museval` / BSSEval v4, the reference implementation: https://github.com/sigsep/sigsep-mus-eval

## Exercise (1 h): the most useful one in the course

This exercise directly sets up lab experiment E2 ("faithful masking").

1. Take a clip from `tools/separation-lab/data/clips/US-2.1/` (a toast over music and crowd) with ground-truth stems.
2. Compute the **oracle IRM** for the speech stem, apply it to the mixture STFT, invert, and measure the SI-SDR.
3. Compare it with SAM Audio's output for the same clip, which you can get from the demo.
4. Build a mask from SAM's estimate, M = |Ŝ_SAM|² / (|Ŝ_SAM|² + |X − Ŝ_SAM|²), apply it to the *mixture*, and measure again.

How close is SAM-guided masking to the oracle, and does it sound more faithful? ("Faithful" means the output keeps the true content of the original recording instead of a regenerated look-alike. Applying a mask to the mixture can only remove energy, not invent it.)
