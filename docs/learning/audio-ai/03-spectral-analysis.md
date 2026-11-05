# 03. Spectral analysis: FFT, STFT and spectrograms

Almost every separation method, classical or neural, either works on the **short-time Fourier transform (STFT)** or learns something similar to it. This is the most important lecture.

## 1. DFT and FFT

**The DFT.** For N samples:

  X[k] = Σₙ x[n] e^{−j2πkn/N},  k = 0 … N−1.

**Bins.** Bin k corresponds to frequency k·f_s / N, so the **resolution is Δf = f_s / N**. For example, a 2048-point frame at 48 kHz gives bins 23.4 Hz apart.

**The FFT** computes the DFT in O(N log N).

**Windowing and leakage.**
- Cutting a frame out of a signal is equivalent to multiplying it by a rectangle, which spreads energy into neighbouring bins (**leakage**).
- Tapered windows such as Hann trade a wider main lobe for much lower leakage.

## 2. The STFT and its time–frequency trade-off

**Definition.** Slide a window of length N with a hop H, and take the FFT of each frame m:

  X(m, k) = Σₙ x[n + mH] w[n] e^{−j2πkn/N}

The result is a complex matrix with time on one axis and frequency on the other.
- **|X|** is the magnitude; in dB it gives the familiar **spectrogram** image.
- **∠X** is the phase.

**Uncertainty.** You cannot have fine time *and* fine frequency resolution: Δt·Δf ≥ constant.

| Window | Frequency detail | Time detail | Good for |
|---|---|---|---|
| Long (4096 samples at 48 kHz, 85 ms) | Sharp harmonics | Smeared drum hits | Tonal content |
| Short (512 samples, 11 ms) | Blurry harmonics | Crisp transients | Percussion |

Multi-resolution losses and band-split models (lecture 06) are partly answers to this trade-off.

**Inverse STFT.** ISTFT with overlap-add reconstructs the signal exactly if the windows satisfy the constant-overlap-add (COLA) condition, for example Hann at 50% or 75% overlap. That is what makes the next step possible.

**The basic masking pattern.** Multiply the mixture's STFT by a mask, then invert:

  Ŝ(m,k) = M(m,k) · X(m,k),  then ŝ = ISTFT(Ŝ).

## 3. Phase

**Why phase is usually ignored.** Magnitude carries most of what we perceive, and phase looks like noise. Most classical and early neural separators therefore estimate a magnitude mask and **reuse the mixture's phase**. This works well when one source dominates each time-frequency bin.

**When it fails.** It breaks down where sources overlap strongly. Newer models predict complex masks or the waveform directly.

**Link to our product.** Reusing the mixture's phase is also the basis of the "faithful masking" idea in our differentiation doc: keep the original recording and only re-weight it.

## 4. Perceptual and compact features

- **Mel spectrogram:** STFT power pooled into triangular mel-spaced bands (64–128). It compresses high frequencies the way the ear does. It is the standard input for classifiers, ASR and tagging.
- **MFCC:** the discrete cosine transform of the log mel spectrum, which decorrelates the spectral envelope. It is classic for speech and speaker work and still a useful mental model for "timbre".
- **Constant-Q / CQT:** bins spaced logarithmically, so each octave gets the same number of bins. This suits musical pitch.
- **Pitch (f₀) estimation:** autocorrelation and YIN-style methods find the period of the waveform.

## 5. Filters and convolution

- **FIR and IIR filters** are what equalisers (EQ) are made of: low-pass, high-pass, shelf and peaking.
- **The convolution theorem:** convolution in time is multiplication in frequency. Adding reverb by convolving with an RIR (lecture 01) is done with FFTs for speed.

## Read or watch

- 3Blue1Brown, *But what is the Fourier Transform? A visual introduction* (video): https://www.youtube.com/watch?v=spUNpyF58BY
- FMP notebooks:
  - chapter 2, Fourier analysis and the STFT: https://www.audiolabs-erlangen.de/resources/MIR/FMP/C2/C2.html
  - chapter 3, music synchronisation (features in practice): https://www.audiolabs-erlangen.de/resources/MIR/FMP/C3/C3.html
- ISMIR 2020 separation tutorial, the "representations" chapters: https://source-separation.github.io/tutorial/
- Julius O. Smith, *Spectral Audio Signal Processing* (the deep reference): https://ccrma.stanford.edu/~jos/sasp/
- librosa tutorials, for code: https://librosa.org/doc/latest/auto_tutorials/index.html
- Valerio Velardo, The Sound of AI, the *Audio Signal Processing for ML* videos on spectrograms, mel and MFCC: https://www.youtube.com/@ValerioVelardoTheSoundofAI

## Exercise (1 h)

1. Plot spectrograms of the mixture and of each stem for a lab clip, for example `US-7.1` (a guitar inside a full band mix).
2. Use two window sizes, 512 and 4096, and compare how the harmonics and the attacks look.
3. Find the time-frequency regions where the target guitar dominates. This is the intuition behind masks in lecture 05.
