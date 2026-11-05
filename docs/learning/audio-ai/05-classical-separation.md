# 05. Classical separation and how separation is measured

## 1. The problem statement

**Mixing models.**
- **Instantaneous mixing:** x(t) = Σᵢ sᵢ(t).
- **Convolutive mixing** (rooms): x(t) = Σᵢ (hᵢ * sᵢ)(t).
- **Multiple microphones:** a matrix of filters.

**Underdetermined.** With 1 or 2 channels and 3 or more sources there are more unknowns than equations. Any solution needs **priors**: assumptions about what the sources look like. Classical methods hand-code these priors; neural networks learn them from data (lecture 06).

## 2. Time-frequency masking: the main idea

**Sparsity.** In the STFT domain, speech and music are sparse: in most time-frequency bins one source dominates. This is called "W-disjoint orthogonality". So you can separate by deciding, bin by bin, how much of each source is present:

  Ŝᵢ(m,k) = Mᵢ(m,k) · X(m,k),  0 ≤ Mᵢ ≤ 1.

**Oracle masks.** Computed from the true stems, these give upper bounds for any masking method:

| Mask | Formula |
|---|---|
| Ideal binary mask (IBM) | M = 1 if \|S\| > \|N\| else 0 |
| Ideal ratio mask (IRM) | M = \|S\|² / (\|S\|² + \|N\|²) |

The IRM is the per-bin **Wiener filter**.

**The Wiener filter, in the language you know.**
- If source and noise are uncorrelated Gaussian processes with power spectra P_s and P_n, the minimum-mean-square-error linear estimate is

  H(f) = P_s(f) / (P_s(f) + P_n(f)).

- It is the frequency-domain cousin of the Kalman filter.
- Every separator that predicts "how much of this bin is source i" is estimating P_s and P_n.
- Open-Unmix's *multichannel Wiener filter* post-processing applies the same idea using stereo covariances.

**Spectral subtraction.** A crude ancestor of the Wiener filter:
1. estimate the noise spectrum during pauses;
2. subtract it from every frame;
3. clamp the result at zero.

The leftover isolated peaks sound like "musical noise", the chirpy artifact still heard from poor denoisers.

## 3. NMF: modal decomposition with a non-negativity constraint

**Factorisation.** Factor the magnitude spectrogram V (frequency × time) as **V ≈ W H**:
- the columns of W are **spectral templates** (a note, a drum hit, a phoneme class);
- the rows of H are their **activations** over time;
- the non-negativity of both makes the parts additive, which matches how sound energy adds.

**Solving it.** Lee and Seung's multiplicative updates minimise a divergence, usually Kullback–Leibler or Itakura–Saito:

  H ← H ⊙ (Wᵀ(V ⊘ WH)) ⊘ (Wᵀ1),  W ← W ⊙ ((V ⊘ WH)Hᵀ) ⊘ (1Hᵀ)

**Separation with NMF.**
1. Assign templates to sources, for example templates learned beforehand on clean piano and clean voice ("supervised NMF").
2. Build Wiener-like masks: Mᵢ = WᵢHᵢ / WH.

**Limits.** NMF is great for teaching and for repetitive music. It struggles with voices whose spectra vary continuously. It was the leading approach around 2010.

## 4. Structure-based tricks

- **HPSS (harmonic–percussive separation):**
  - Harmonic sounds draw **horizontal** lines in a spectrogram (stable pitch). Percussive hits draw **vertical** lines (broadband, short).
  - A median filter along time enhances the harmonic part; one along frequency enhances the percussive part. Masks follow (Fitzgerald 2010).
  - It is cheap and still used as a feature and pre-step.
- **REPET:** music accompaniment repeats (loops, bars). Find the period by autocorrelation, average the repeats to model the background, and the non-repeating rest is the vocal.
- **Pitch-based:** track f₀ and keep its harmonics. This works for one clean melody and breaks down with chords or with several singers.

## 5. Spatial methods (2 or more microphones)

**DUET.** For two mics, compute the inter-channel **level ratio** and **phase (time) difference** in every bin, plot their 2-D histogram, and cluster the peaks. Each peak is a source at a different direction.
- This is a direct use of the stereo information SAM Audio discards (lecture 02).
- It is very relevant to studio mixes with panned instruments.

**Beamforming.** With mic arrays (meeting rooms, smart speakers), steer a spatial filter towards a direction: delay-and-sum, or MVDR.

**ICA (independent component analysis).** It needs at least as many mics as sources, so it rarely applies to consumer content.

## 6. Metrics: how "good" is measured

**SI-SDR (scale-invariant signal-to-distortion ratio).** This is the metric our lab uses. With s the true source and ŝ the estimate (both zero-mean):

  s_target = (⟨ŝ, s⟩ / ‖s‖²) · s,  e = ŝ − s_target,  **SI-SDR = 10 log₁₀(‖s_target‖² / ‖e‖²)**

- It is a projection, so a global gain error is not penalised.
- **SI-SDRi** is the improvement over just using the mixture as the estimate. It is the number to report.
- Rough feel: +3 dB is audible, +10 dB is good, +15 dB or more is close to clean.
- Our Korean test, for example: a voice out of music plus crowd improved by +7.0 dB, while voice-from-voice improved by about 0 to +1 dB.

**BSSEval SDR, SIR and SAR.** This is the music-separation standard (`museval`, the MUSDB leaderboards). It decomposes the error into:
- **interference**, other sources leaking in, measured by SIR;
- **artifacts**, invented or distorted sound, measured by SAR.

The decomposition is diagnostic: a model can score a high SIR but a low SAR (clean but "watery").

**Speech metrics.** PESQ and POLQA estimate quality, STOI estimates intelligibility, and DNSMOS is a neural mean-opinion-score predictor.

**Listening tests.** **MUSHRA** (rate several versions against a hidden reference) and **A/B preference**.
- Metrics disagree with ears, especially for **generative** outputs: a perfectly plausible but slightly time-shifted output can score poorly on SDR.
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

How close is SAM-guided masking to the oracle, and does it sound more faithful?
