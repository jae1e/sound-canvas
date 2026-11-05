# 03. Spectral analysis: FFT, STFT and spectrograms

Almost every separation method, classical or neural, either works on the **short-time Fourier transform (STFT)** or learns something similar to it. This is the most important lecture.

- **Spectral** means "about the frequency content". Spectral analysis answers: which sine waves, at which strengths, is this sound made of?
- **Short-time Fourier transform:** the Fourier transform you know, applied again and again to short slices of the signal, so you see how the frequency content changes over time.
- **Why it matters for us:** a mixture of two voices is hard to pull apart as a waveform, because the two waves are added together sample by sample. On a time-frequency picture, the voices often occupy different cells. Then separation becomes "decide which cells belong to whom".
- **Vibration analogy:** it is the same idea as a waterfall plot or a Campbell diagram for a machine that speeds up: frequency on one axis, time or RPM on the other, colour for amplitude.

## 1. DFT and FFT

**The DFT** (discrete Fourier transform: the Fourier transform for a list of N samples instead of a continuous function). For N samples:

  X[k] = Σₙ x[n] e^{−j2πkn/N},  k = 0 … N−1.

- x[n] are the N samples. j is the imaginary unit (engineers' i).
- Each X[k] is a complex number. It says how strongly the sine wave number k is present in the frame, and where in its cycle it starts.
- Output k "correlates" the frame with a sine wave that completes k full cycles inside the frame. This is the same orthogonal-projection idea as a Fourier series, with sums instead of integrals.

**Bins.** Bin k corresponds to frequency k·f_s / N, so the **resolution is Δf = f_s / N**. A bin is one output slot X[k], like one rung on a frequency ladder. For example, a 2048-point frame at 48 kHz gives bins 23.4 Hz apart.
- Check: 48,000 / 2048 = 23.4375 Hz.
- The frame lasts 2048 / 48,000 = 42.7 ms. Note Δf = f_s / N = 1 / T where T is the frame duration. This is the DAQ rule you know: to resolve 1 Hz you must record for 1 s.
- For a real-valued signal (audio always is), bins above N/2 just mirror the ones below. So only bins 0 … N/2 matter: 1025 useful bins for N = 2048, covering 0 to 24 kHz.

**The FFT** (fast Fourier transform) computes the DFT in O(N log N).
- Computing the sum directly needs about N² multiplications: for N = 2048 that is about 4.2 million.
- The FFT algorithm reuses partial results and needs about N log₂ N: about 22,500. That is roughly 190 times fewer.
- It gives the same numbers as the DFT, only faster. Every library "FFT" is this.

**Windowing and leakage.**
- Cutting a frame out of a signal is equivalent to multiplying it by a rectangle (1 inside the frame, 0 outside). In the frequency domain that convolves the true spectrum with the rectangle's spectrum, which spreads energy into neighbouring bins. This spreading is **leakage**.
- Example: a 1 kHz tone with the 2048-point frame above sits at bin 1000 / 23.4375 = 42.67, between bins 42 and 43. The frame does not contain a whole number of cycles, so the cut edges are discontinuous and energy leaks across many bins.
- A **window** is a weighting curve applied to the frame before the FFT. A **Hann window** (named after Julius von Hann) is a smooth bell: 0 at both ends, 1 in the middle, w[n] = 0.5 − 0.5 cos(2πn/N). Because it fades to zero at the edges, the discontinuity disappears.
- Tapered windows such as Hann trade a wider main lobe for much lower leakage.
  - The **main lobe** is the peak a pure tone makes in the spectrum. It is wider with a Hann window (about 4 bins null-to-null instead of 2).
  - The **side lobes** are the ripples on both sides. The first one is about −13 dB for a rectangle and about −31 dB for Hann.
  - So you give up a little sharpness for a much cleaner spectrum.

## 2. The STFT and its time–frequency trade-off

**Definition.** Slide a window of length N with a hop H, and take the FFT of each frame m:

  X(m, k) = Σₙ x[n + mH] w[n] e^{−j2πkn/N}

- w[n] is the window from section 1, and m counts frames.
- The **hop** H is how many samples the window advances between frames. With N = 2048 and H = 512 the frames overlap by 75%. Overlap is used so that no part of the signal is only seen at a window's faded edge.
- Example size: 10 s of audio at 48 kHz is 480,000 samples. That gives about 480,000 / 512 ≈ 940 frames, each with 1025 useful bins: a matrix of about 1025 × 940 complex numbers.

The result is a complex matrix with time on one axis and frequency on the other.
- **|X|** is the magnitude: how much energy sits in each cell. In dB it gives the familiar **spectrogram** image, a heat map with time to the right, frequency up, and colour for level.
- **∠X** is the phase: the angle of the complex number, which says where in its cycle each sine wave is at that frame.
- A *time-frequency bin* (or "cell") is one entry (m, k) of this matrix.

**Uncertainty.** You cannot have fine time *and* fine frequency resolution: Δt·Δf ≥ constant.
- A long window sees many cycles, so it can tell close frequencies apart. But it averages over a long time, so events inside it blur together.
- A short window pins down when something happened. But it sees few cycles, so nearby frequencies merge.
- It is the same trade-off as in a DAQ record: a short record gives coarse frequency resolution (Δf = 1/T).

| Window | Frequency detail | Time detail | Good for |
|---|---|---|---|
| Long (4096 samples at 48 kHz, 85 ms) | Sharp harmonics | Smeared drum hits | Tonal content |
| Short (512 samples, 11 ms) | Blurry harmonics | Crisp transients | Percussion |

- Check: 4096 / 48,000 = 85.3 ms, with bins 11.7 Hz apart. 512 / 48,000 = 10.7 ms, with bins 93.75 Hz apart.
- *Tonal* means made of steady pitched notes (harmonics). *Transients* are short sudden bursts such as drum hits. *Percussion* means drums and other struck instruments.

Multi-resolution losses and band-split models (lecture 06) are partly answers to this trade-off. A multi-resolution loss measures error with several window sizes at once. A band-split model treats each frequency band separately, so each can use its own detail level.

**Inverse STFT.** ISTFT (inverse short-time Fourier transform) with overlap-add reconstructs the signal exactly if the windows satisfy the constant-overlap-add (COLA) condition, for example Hann at 50% or 75% overlap. That is what makes the next step possible.
- Steps: inverse-FFT each frame back to a short piece of waveform, then place each piece at its original position and add. This placing-and-adding is **overlap-add**.
- **COLA:** the shifted copies of the window must sum to a constant, like overlapping tiles that add up to a flat floor. Then the window's weighting cancels out and the original signal returns. With Hann at 50% overlap the weights of neighbouring frames add up to exactly 1 everywhere.
- If you changed nothing between STFT and ISTFT, you get back your input (up to rounding error).

**The basic masking pattern.** Multiply the mixture's STFT by a mask, then invert:

  Ŝ(m,k) = M(m,k) · X(m,k),  then ŝ = ISTFT(Ŝ).

- A **mask** M(m,k) is a number for each cell, usually between 0 and 1. It says how much of that cell belongs to the target source: 1 = all of it, 0 = none.
- The **mixture** is the recorded sum of all sources; Ŝ and ŝ are the estimated target in the STFT and waveform domains (the hat means "estimate").
- This is a gain schedule: like an equaliser that changes its settings in every cell instead of only per frequency. Note that this is a different use of the word "masking" than the hearing effect in lecture 01.

## 3. Phase

**Why phase is usually ignored.** Magnitude carries most of what we perceive, and phase looks like noise. Most classical and early neural separators therefore estimate a magnitude mask and **reuse the mixture's phase**. This works well when one source dominates each time-frequency bin.
- Phase is the starting angle of each sine wave in each frame. A spectrogram of phase is a noisy-looking pattern with no clear structure to the eye.
- Reusing the mixture's phase means: take the mixture's phase angles unchanged, multiply only the magnitudes by the mask, and run ISTFT. If one source dominates a cell, the mixture's phase there is close to that source's own phase, so the error is small.

**When it fails.** It breaks down where sources overlap strongly (both contribute similar energy to one cell). There the mixture's phase is a blend of two phases and matches neither source. Newer models predict complex masks (a mask with a magnitude and a phase correction per cell) or the waveform directly.

**Link to our product.** Reusing the mixture's phase is also the basis of the "faithful masking" idea in our differentiation doc: keep the original recording and only re-weight it.

## 4. Perceptual and compact features

These are summaries of the spectrogram that keep what matters for hearing and throw away detail. Models take them as input because they are smaller and closer to what a listener perceives.

- **Mel spectrogram:** STFT power pooled into triangular mel-spaced bands (64–128). It compresses high frequencies the way the ear does (mel scale, lecture 01). It is the standard input for classifiers, ASR and tagging.
  - Power is magnitude squared. "Pooled" means each band adds up the power of the STFT bins under its triangle.
  - ASR is automatic speech recognition (speech to text). Tagging means labelling audio, for example "dog bark" or "guitar".
- **MFCC (mel-frequency cepstral coefficients):** the discrete cosine transform of the log mel spectrum, which decorrelates the spectral envelope. It is classic for speech and speaker work and still a useful mental model for "timbre".
  - Take the log of the mel spectrum (so levels are in dB-like units). Then apply the DCT (discrete cosine transform: like the DFT but with real cosines only, good at packing smooth curves into few numbers).
  - Result: the first 13–20 coefficients describe the smooth outline of the spectrum (the envelope, shaped by the vocal tract) and not the fine harmonic comb (the pitch). So MFCCs capture "which vowel or timbre", independent of pitch.
  - "Decorrelate" means the coefficients are nearly independent of each other, which makes them easy for simple models to use.
  - "Cepstrum" is a deliberate anagram of "spectrum": a spectrum of a spectrum.
- **Constant-Q / CQT (constant-Q transform):** bins spaced logarithmically, so each octave gets the same number of bins. This suits musical pitch.
  - Q is the ratio of a bin's centre frequency to its width. In a CQT, Q is constant, so bins are narrow at low frequencies and wide at high ones.
  - An octave is a doubling of frequency. Typical CQTs use 12, 24 or 36 bins per octave, so one bin per semitone (piano key) or finer. The plain FFT has equal spacing in Hz, which is too coarse for low notes and wasteful for high ones.
- **Pitch (f₀) estimation:** autocorrelation and YIN-style methods find the period of the waveform.
  - **Autocorrelation:** compare the signal with a delayed copy of itself. The first strong peak occurs when the delay equals one period of the wave. For f₀ = 100 Hz the period is 10 ms, which is 160 samples at 16 kHz.
  - **YIN** is a well-known pitch estimator built on this idea, with corrections that avoid common mistakes such as reporting an octave too low or too high.

## 5. Filters and convolution

- **FIR and IIR filters** are what equalisers (EQ) are made of: low-pass, high-pass, shelf and peaking.
  - **FIR (finite impulse response):** each output sample is a weighted sum of the last few input samples. Its impulse response ends after a fixed number of samples, and it is always stable. It is a moving weighted average.
  - **IIR (infinite impulse response):** each output also uses earlier *outputs* (feedback). It is the discrete form of an ODE with poles, such as a spring-damper. It needs far fewer coefficients for the same sharpness, but it can ring and, if badly designed, become unstable.
  - **EQ (equaliser):** a tone-control device that boosts or cuts chosen frequency ranges, like the bass and treble knobs on an amplifier.
  - **Low-pass** passes frequencies below a cutoff and blocks those above. **High-pass** does the opposite.
  - **Shelf:** boosts or cuts everything above (high shelf) or below (low shelf) a corner frequency by a fixed amount, so the gain curve looks like a step or a shelf.
  - **Peaking:** a bell-shaped boost or cut centred on one frequency, with adjustable width.
- **The convolution theorem:** convolution in time is multiplication in frequency. Adding reverb by convolving with an RIR (lecture 01) is done with FFTs for speed.
  - Direct convolution of a signal with a 2 s RIR at 48 kHz (96,000 taps) costs 96,000 multiply-adds for each output sample. For one second of audio that is about 4.6 billion operations.
  - With the theorem: FFT both, multiply bin by bin, inverse FFT. That is far cheaper.
  - To make this match true (linear) convolution you pad the signals with zeros first. Libraries such as `scipy.signal.fftconvolve` do this for you.

## Read or watch

- 3Blue1Brown, *But what is the Fourier Transform? A visual introduction* (video): https://www.youtube.com/watch?v=spUNpyF58BY
- FMP notebooks (*Fundamentals of Music Processing*, Jupyter notebooks that teach with code):
  - chapter 2, Fourier analysis and the STFT: https://www.audiolabs-erlangen.de/resources/MIR/FMP/C2/C2.html
  - chapter 3, music synchronisation (features in practice): https://www.audiolabs-erlangen.de/resources/MIR/FMP/C3/C3.html
- ISMIR 2020 separation tutorial (ISMIR is the International Society for Music Information Retrieval conference), the "representations" chapters: https://source-separation.github.io/tutorial/
- Julius O. Smith, *Spectral Audio Signal Processing* (the deep reference): https://ccrma.stanford.edu/~jos/sasp/
- librosa tutorials, for code (librosa is a Python library for audio analysis): https://librosa.org/doc/latest/auto_tutorials/index.html
- Valerio Velardo, The Sound of AI, the *Audio Signal Processing for ML* videos on spectrograms, mel and MFCC: https://www.youtube.com/@ValerioVelardoTheSoundofAI

## Exercise (1 h)

1. Plot spectrograms of the mixture and of each stem for a lab clip, for example `US-7.1` (a guitar inside a full band mix). (A *stem* is one separated track containing one source.)
2. Use two window sizes, 512 and 4096, and compare how the harmonics and the attacks look. (The attack is the sudden start of a note.)
3. Find the time-frequency regions where the target guitar dominates. This is the intuition behind masks in lecture 05.
